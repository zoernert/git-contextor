const path = require('path');
const fs = require('fs').promises;
const logger = require('../cli/utils/logger');
const apiServer = require('../api/server');
const simpleGit = require('simple-git');

class ServiceManager {
    constructor(repoPath, config, services) {
        this.repoPath = repoPath;
        this.config = config;
        this.services = services; // { fileWatcher, indexer, vectorStore, contextOptimizer }
        this.pidFile = path.join(this.repoPath, '.gitcontextor', 'daemon.pid');
    }

    async validateEnvironment() {
      // Check if we're in a git repository
      try {
        const git = simpleGit(this.repoPath);
        await git.status();
      } catch (error) {
        throw new Error('Not a git repository. Please run git-contextor in a git repository.');
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

        await this.validateEnvironment();

        if (await this.isRunning()) {
            const pid = await this.readPidFile();
            logger.warn(`Git Contextor is already running (PID: ${pid}).`);
            if (pid) process.exit(0);
        }

        // Write PID file to indicate the service is running
        await fs.writeFile(this.pidFile, process.pid.toString());

        try {
            // Start API and UI servers
            await apiServer.start(this.config, this.services);

            // Run initial index of the repository only if the collection is empty
            const vectorStoreStatus = await this.services.vectorStore.getStatus();
            if (!vectorStoreStatus.vectorCount || vectorStoreStatus.vectorCount === 0) {
                logger.info('Vector store is empty. Performing initial repository index...');
                await this.services.indexer.reindexAll();
                logger.info('Initial index complete.');
            } else {
                logger.info(`Found ${vectorStoreStatus.vectorCount} vectors in existing collection. Skipping initial index.`);
                // Sync the indexer's internal state with the data from the vector store
                const indexerStatus = await this.services.indexer.getStatus();
                logger.info(`Indexer state loaded: ${indexerStatus.totalFiles} files, ${indexerStatus.totalChunks} chunks.`);
            }

            // Start the file watcher if enabled
            if (this.config.monitoring.watchEnabled) {
                this.services.fileWatcher.start();
            }

            logger.success('Git Contextor services started successfully.');

        } catch (error) {
            logger.error('Failed to start Git Contextor services:', error);
            // Attempt to clean up if startup failed
            await this.stop({ silent: true });
            throw error;
        }
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
}

module.exports = ServiceManager;
