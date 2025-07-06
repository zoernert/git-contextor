const express = require('express');

/**
 * Creates and returns the status router.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { indexer, fileWatcher } = services;

    /**
     * Retrieves the current status of the Git Contextor services.
     */
    router.get('/', async (req, res, next) => {
        try {
            // Note: This endpoint provides status of an already running service.
            // Some info like repo path and ports are from config, but we get live data here.
            const indexerStatus = await indexer.getStatus();
            
            res.json({
                status: 'running', // If this endpoint is reachable, it's running.
                repository: {
                    name: indexer.config.repository.name,
                    path: indexer.config.repository.path,
                },
                indexer: indexerStatus,
                fileWatcher: {
                    latestActivity: [] // Placeholder for more detailed activity tracking
                }
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
