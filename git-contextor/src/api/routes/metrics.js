const express = require('express');

/**
 * Creates and returns the metrics router.
 * @param {import('../../core/ServiceManager')} serviceManager - The service manager instance.
 * @returns {express.Router} The configured router.
 */
module.exports = (serviceManager) => {
    const router = express.Router();
    const { indexer, vectorStore } = serviceManager.services;

    /**
     * Retrieves detailed metrics about the index, vector store, and system performance.
     */
    router.get('/', async (req, res, next) => {
        try {
            const indexerStatus = await indexer.getStatus();
            const collectionStats = await vectorStore.getCollectionStats().catch(() => null);
            const memoryUsage = process.memoryUsage();

            res.json({
                timestamp: new Date().toISOString(),
                indexer: indexerStatus,
                vectorStore: {
                    collectionName: vectorStore.collectionName,
                    pointsCount: collectionStats?.points_count ?? 0,
                    vectorsCount: collectionStats?.vectors_count ?? 0,
                },
                system: {
                    memoryUsage: {
                        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
