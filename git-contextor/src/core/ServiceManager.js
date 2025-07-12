const path = require('path');
const fs = require('fs').promises;
const logger = require('../cli/utils/logger');
const apiServer = require('../api/server');
const simpleGit = require('simple-git');
const SharingService = require('./SharingService');

class ServiceManager {
    constructor(repoPath, config, services) {
        this.repoPath = repoPath;
        this.config = config;
        this.services = services; // { fileWatcher, indexer, vectorStore, contextOptimizer }
        this.sharingService = new SharingService(this.repoPath, this.config);
        this.pidFile = path.join(this.repoPath, '.gitcontextor', 'daemon.pid');
        this.isGitRepo = false;
        this.summaryUpdateInterval = null;
        this.isUpdatingSummary = false;
        this.lastSummaryUpdateTime = null;
    }

    async validateEnvironment() {
      // Check if we're in a git repository, but don't make it mandatory.
      try {
        const git = simpleGit(this.repoPath);
        await git.status();
        this.isGitRepo = true;
        logger.info('Git repository detected. Git-related features are enabled.');
      } catch (error) {
        this.isGitRepo = false;
        logger.warn('No Git repository detected. Operating in non-Git mode. File discovery will scan the directory.');
      }
    
      // Check write permissions
      try {
        await fs.access(this.repoPath, fs.constants.W_OK);
      } catch (error) {
        throw new Error('No write permission in current directory.');
      }
    
      // Validate embedding config
      const { provider, apiKey } = this.config.embedding;
      if (provider !== 'local' && !apiKey) {
        throw new Error(`${provider} embedding provider requires an API key. Set it with: git-contextor config --api-key YOUR_KEY`);
      }
    }

    async start(options = {}) {
        logger.info('Starting Git Contextor services...');

        if (options.watch === false) {
            this.config.monitoring.watchEnabled = false;
            logger.info('File watching disabled for this session via the --no-watch flag.');
        }

        await this.validateEnvironment();

        try {
            await fs.writeFile(this.pidFile, process.pid.toString());
        } catch (err) {
            logger.error('Failed to write PID file.', err);
            throw new Error(`Could not write PID file to ${this.pidFile}. Check permissions.`);
        }

        if (this.services.indexer) {
            this.services.indexer.isGitRepo = this.isGitRepo;
        }
        if (this.services.fileWatcher) {
            this.services.fileWatcher.isGitRepo = this.isGitRepo;
        }

        try {
            await this.services.indexer.reindexAll();
            logger.info('Initial index complete.');
        } catch (error) {
            logger.error('Initial repository index failed. Continuing startup, but the index may be incomplete.', error);
        }

        if (this.config.monitoring.watchEnabled) {
            this.services.fileWatcher.start();
        } else {
            logger.info('File watcher is disabled by configuration.');
        }

        const servicesForApi = {
            ...this.services,
            sharingService: this.sharingService
        };
        await apiServer.start({ config: this.config, services: servicesForApi });

        logger.success('Git Contextor services started successfully.');

        // Start the idle summary updater
        this.summaryUpdateInterval = setInterval(() => this.checkForIdleAndUpdateSummary(), 5000); // Check every 5 seconds

    }

    async stop({ silent = false } = {}) {
        if (!silent) {
             logger.info('Stopping Git Contextor services...');
        }

        if (!await this.isRunning() && !silent) {
            logger.warn('Git Contextor is not running.');
            // Clean up stale pid file if it exists but process is dead
            try {
                await fs.unlink(this.pidFile);
                logger.info('Removed stale PID file.');
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    logger.warn(`Could not remove stale PID file: ${this.pidFile}`, error);
                }
            }
            return;
        }

        // Stop file watcher
        if (this.services.fileWatcher) {
            this.services.fileWatcher.stop();
        }

        if (this.summaryUpdateInterval) {
            clearInterval(this.summaryUpdateInterval);
        }

        // Stop API and UI servers
        await apiServer.stop();

        // Delete collection if not configured to keep
        if (!this.config.services.keepCollectionOnExit && this.services.vectorStore) {
            if (!silent) {
                logger.info('Removing Qdrant collection as per configuration...');
            }
            await this.services.vectorStore.deleteCollection();
        }

        // Remove PID file
        try {
            await fs.unlink(this.pidFile);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn(`Could not remove PID file: ${this.pidFile}`, error);
            }
        }
        
        if (!silent) {
            logger.info('Git Contextor services stopped.');
        }
    }

    async getStatus() {
        if (!await this.isRunning()) {
            return { status: 'stopped', message: 'Git Contextor is not running.' };
        }

        const pid = await this.readPidFile();
        const indexerStatus = await this.services.indexer.getStatus();

        return {
            status: 'running',
            pid: pid,
            repoPath: this.repoPath,
            api: {
                port: this.config.services.port,
                status: 'running' // Simplified for now
            },
            ui: {
                port: this.config.services.port,
                status: 'running' // Simplified for now
            },
            watcher: {
                status: this.config.monitoring.watchEnabled ? 'enabled' : 'disabled'
            },
            indexing: indexerStatus
        };
    }

    async isRunning() {
        try {
            const pid = await this.readPidFile();
            if (!pid) return false;
            // The `process.kill` with signal 0 is a test for process existence.
            process.kill(pid, 0); 
            return true;
        } catch (error) {
            // ESRCH means process doesn't exist, which is what we expect if it's not running.
            // ENOENT means pidfile doesn't exist.
            if (error.code === 'ESRCH' || error.code === 'ENOENT') {
                return false;
            }
            // Other errors should be thrown
            throw error;
        }
    }

    async readPidFile() {
        try {
            const pidString = await fs.readFile(this.pidFile, 'utf8');
            return parseInt(pidString, 10);
        } catch (error) {
            return null;
        }
    }

    async checkForIdleAndUpdateSummary() {
        if (this.isUpdatingSummary) {
            return;
        }

        const indexerStatus = await this.services.indexer.getStatus();
        if (indexerStatus.status !== 'idle' || !indexerStatus.lastActivity) {
            return;
        }
        
        const lastActivityTime = new Date(indexerStatus.lastActivity).getTime();
        
        // If we've already updated the summary since the last activity, do nothing.
        if (this.lastSummaryUpdateTime && lastActivityTime < this.lastSummaryUpdateTime) {
            return;
        }

        const idleTime = Date.now() - lastActivityTime;

        if (idleTime > 20000) { // More than 20 seconds idle
            this.isUpdatingSummary = true;
            logger.info('Indexer has been idle for over 20 seconds. Automatically updating collection summary...');
            try {
                await this.services.contextOptimizer.summarizeCollection();
                this.lastSummaryUpdateTime = Date.now();
                logger.info('Automatic collection summary update completed successfully.');
            } catch (error) {
                logger.error('Automatic collection summary update failed:', error);
            } finally {
                this.isUpdatingSummary = false;
            }
        }
    }
}

module.exports = ServiceManager;
