const express = require('express');

/**
 * Creates and returns the search router.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer } = services;

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
            next(error);
        }
    });

    return router;
};
