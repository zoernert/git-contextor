const express = require('express');
const logger = require('../../cli/utils/logger');
const { apiKeyAuth } = require('../../utils/security');

module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer } = services;

    // Trigger the generation of the collection summary
    router.post('/summarize', apiKeyAuth(contextOptimizer.config), async (req, res) => {
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

    router.get('/summary', apiKeyAuth(contextOptimizer.config), async (req, res) => {
        try {
            logger.info('API call received to get or create collection summary.');
            const summaryContent = await contextOptimizer.getOrCreateSummary();
    
            if (summaryContent) {
                res.setHeader('Content-Type', 'text/plain');
                res.status(200).send(summaryContent);
            } else {
                res.status(404).json({ error: 'Could not retrieve or create collection summary.' });
            }
        } catch (error) {
            logger.error('Error handling /summary request:', error);
            res.status(500).json({ error: 'Failed to process summary request.' });
        }
    });

    return router;
};
