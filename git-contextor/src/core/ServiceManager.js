const path = require('path');
const fs = require('fs').promises;
const logger = require('../cli/utils/logger');
const apiServer = require('../api/server');
const uiServer = require('../ui/server');

class ServiceManager {
    constructor(repoPath, config, services) {
        this.repoPath = repoPath;
        this.config = config;
        this.services = services; // { fileWatcher, indexer, vectorStore, contextOptimizer }
        this.pidFile = path.join(this.repoPath, '.gitcontextor', 'daemon.pid');
    }

    async start(options = {}) {
        logger.info('Starting Git Contextor services...');

        if (await this.isRunning()) {
            logger.warn(`Git Contextor is already running (PID: ${await this.readPidFile()}).`);
            return;
        }

        // Write PID file to indicate the service is running
        await fs.writeFile(this.pidFile, process.pid.toString());

        try {
            // Update config with ports from options if provided
            this.config.services.apiPort = options.apiPort || this.config.services.apiPort;
            this.config.services.uiPort = options.uiPort || this.config.services.uiPort;

            // Start API and UI servers
            await apiServer.start(this.config, this.services);
            await uiServer.start(this.config, this.services);

            // Run initial index of the repository
            logger.info('Performing initial repository index...');
            await this.services.indexer.fullIndex();
            logger.info('Initial index complete.');

            // Start the file watcher if enabled
            if (this.config.monitoring.watchEnabled) {
                this.services.fileWatcher.start();
            }

            logger.info('Git Contextor services started successfully.');

        } catch (error) {
            logger.error('Failed to start Git Contextor services:', error);
            // Attempt to clean up if startup failed
            await this.stop();
            throw error;
        }
    }

    async stop() {
        logger.info('Stopping Git Contextor services...');

        if (!await this.isRunning()) {
            logger.warn('Git Contextor is not running.');
            // Clean up stale pid file if it exists but process is dead
            try {
                await fs.unlink(this.pidFile);
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
        await uiServer.stop();

        // Remove PID file
        try {
            await fs.unlink(this.pidFile);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn(`Could not remove PID file: ${this.pidFile}`, error);
            }
        }

        logger.info('Git Contextor services stopped.');
    }

    async getStatus() {
        if (!await this.isRunning()) {
            return { status: 'stopped', message: 'Git Contextor is not running.' };
        }

        const pid = await this.readPidFile();
        const indexerStatus = await this.services.indexer.getStatus(); // Assumes indexer has getStatus

        return {
            status: 'running',
            pid: pid,
            repoPath: this.repoPath,
            api: {
                port: this.config.services.apiPort,
                status: 'running' // Simplified for now
            },
            ui: {
                port: this.config.services.uiPort,
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
            process.kill(pid, 0); // Throws an error if the process doesn't exist
            return true;
        } catch (error) {
            // ESRCH: process doesn't exist. ENOENT: pidfile doesn't exist.
            return false;
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
