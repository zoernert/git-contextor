const express = require('express');

/**
 * Creates and returns the metrics router.
 * @param {object} services - The core services of the application.
 * @param {import('../../core/Indexer')} services.indexer
 * @param {import('../../core/VectorStore')} services.vectorStore
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { indexer, vectorStore } = services;

    /**
     * Retrieves detailed metrics about the index, vector store, and system performance.
     */
    router.get('/', async (req, res, next) => {
        try {
            const indexerStatus = await indexer.getStatus();
            const vectorStoreStatus = await vectorStore.getStatus();
            const memoryUsage = process.memoryUsage();

            res.json({
                timestamp: new Date().toISOString(),
                indexer: {
                    totalFiles: indexerStatus.totalFiles,
                    totalChunks: indexerStatus.totalChunks,
                    errorCount: indexerStatus.errorCount,
                },
                vectorStore: {
                    totalVectors: vectorStoreStatus.vectorCount,
                    avgDimensions: vectorStore.config.embedding.dimensions,
                },
                system: {
                    memoryUsageMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
                    cpuUsage: 0, // Getting CPU usage is non-trivial, placeholder for now
                }
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
