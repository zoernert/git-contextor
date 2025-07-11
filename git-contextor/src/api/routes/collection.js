const express = require('express');
const logger = require('../../cli/utils/logger');
const { apiKeyAuth } = require('../../utils/security');

module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer } = services;

    // Trigger the generation of the collection summary
    router.post('/summarize', apiKeyAuth(services.config), async (req, res) => {
        try {
            logger.info('API call received to summarize collection.');
            // This can be a long-running process, so we don't await it.
            contextOptimizer.summarizeCollection(req.body);
            
            res.status(202).json({ 
                message: 'Collection summary generation started. This may take a few minutes.' 
            });
        } catch (error) {
            logger.error('Error starting collection summary:', error);
            res.status(500).json({ error: 'Failed to start summary generation.' });
        }
    });

    return router;
};
