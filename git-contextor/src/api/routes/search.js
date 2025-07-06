const express = require('express');

/**
 * Creates and returns the search router.
 * @param {import('../../core/ServiceManager')} serviceManager - The service manager instance.
 * @returns {express.Router} The configured router.
 */
module.exports = (serviceManager) => {
    const router = express.Router();
    const contextOptimizer = serviceManager.services.contextOptimizer;

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
