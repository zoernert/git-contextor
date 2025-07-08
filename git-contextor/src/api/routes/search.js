const express = require('express');
const VectorStore = require('../../core/VectorStore');

/**
 * Creates and returns the search router.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer, indexer } = services;

    /**
     * Performs a semantic search across the indexed repository.
     */
    router.post('/', async (req, res, next) => {
        const { query, maxTokens, filter, llmType } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing required field: query' });
        }

        try {
            const options = {
                maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
                filter,
                llmType
            };
            const result = await contextOptimizer.search(query, options);
            res.json(result);
        } catch (error) {
            if (VectorStore.isDimensionMismatch(error)) {
                // This specific error means the config (e.g., embedding model) has changed
                // and is incompatible with the existing data in the vector store.
                indexer.reindexAll().catch(err => {
                    console.error('Background re-index triggered by search failed:', err);
                });
                return res.status(503).json({
                    error: 'Configuration mismatch detected. A full re-index has been automatically started. Please try your request again in a few minutes.'
                });
            }
            next(error);
        }
    });

    return router;
};
