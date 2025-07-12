const express = require('express');

/**
 * Creates and returns the status router.
 * @param {ServiceManager} serviceManager - The service manager instance.
 * @returns {express.Router} The configured router.
 */
module.exports = (serviceManager) => {
    const router = express.Router();
    
    /**
     * Retrieves the current status of the Git Contextor services.
     */
    router.get('/', async (req, res, next) => {
        try {
            // Note: This endpoint provides status of an already running service.
            // Some info like repo path and ports are from config, but we get live data here.
            const { indexer, fileWatcher, vectorStore } = serviceManager.services;
            const indexerStatus = await indexer.getStatus();
            const vectorStoreStatus = await vectorStore.getStatus();
            
            res.json({
                status: 'running', // If this endpoint is reachable, it's running.
                repository: {
                    name: indexer.config.repository.name,
                    path: indexer.config.repository.path,
                },
                indexer: indexerStatus,
                vectorStore: vectorStoreStatus,
                watcher: {
                    status: serviceManager.config.monitoring.watchEnabled ? 'enabled' : 'disabled',
                },
                fileWatcher: {
                    latestActivity: fileWatcher.getActivityLog() || []
                }
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
