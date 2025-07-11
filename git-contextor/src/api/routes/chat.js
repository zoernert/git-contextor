const express = require('express');
const logger = require('../../cli/utils/logger');
const { apiKeyAuth } = require('../../utils/security');

/**
 * Creates and returns the chat router for conversational AI.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer } = services;

    /**
     * Handles conversational queries about the repository
     */
    router.post('/', apiKeyAuth(contextOptimizer.config), async (req, res) => {
        const { query, context_type, include_summary } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        try {
            const result = await contextOptimizer.chat(query, { 
                context_type, 
                includeSummary: !!include_summary 
            });
            res.json(result);
        } catch (error) {
            logger.error('Error in chat route:', error);
            res.status(500).json({ error: 'An error occurred during your request.' });
        }
    });

    return router;
};
