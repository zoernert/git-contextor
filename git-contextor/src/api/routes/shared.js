const express = require('express');
const path = require('path');

/**
 * Creates and returns the shared access router.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer, sharingService } = services;

    // Route to serve the dedicated HTML page for a share.
    // This does not require an API key to view.
    router.get('/:shareId', (req, res) => {
        const publicPath = path.resolve(__dirname, '../../ui/public');
        res.sendFile(path.join(publicPath, 'shared.html'));
    });

    // Middleware to validate shared access
    router.use('/:shareId/*', async (req, res, next) => {
        const { shareId } = req.params;
        const apiKey = req.headers['x-share-key'];

        try {
            const share = await sharingService.validateShare(shareId, apiKey);
            req.share = share;
            next();
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    });

    // Chat endpoint for shared access
    router.post('/:shareId/chat', async (req, res, next) => {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing query' });
        }

        try {
            await sharingService.incrementUsage(req.params.shareId);

            // Use restricted search based on share scope
            const searchOptions = {
                maxTokens: 2048,
                filter: { scope: req.share.scope }
            };

            const searchResult = await contextOptimizer.search(query, searchOptions);
            
            // Generate response (implement similar to chat route)
            const response = await generateScopedResponse(query, searchResult, req.share.scope);

            res.json({
                response,
                share_id: req.params.shareId,
                queries_remaining: req.share.max_queries - req.share.access_count
            });

        } catch (error) {
            next(error);
        }
    });

    // Share info endpoint
    router.get('/:shareId/info', (req, res) => {
        res.json({
            share_id: req.params.shareId,
            description: req.share.description,
            expires_at: req.share.expires_at,
            queries_used: req.share.access_count,
            queries_remaining: req.share.max_queries - req.share.access_count,
            scope: req.share.scope
        });
    });

    return router;
};

async function generateScopedResponse(query, searchResult, scope) {
    // Filter response based on sharing scope
    const filteredContext = filterContextByScope(searchResult.optimizedContext, scope);
    
    // Simple response for now, can be enhanced with AI later
    return `Based on the repository (scope: ${scope.join(', ')}):\n\n${filteredContext}`;
}

function filterContextByScope(context, scope) {
    // Basic implementation - can be enhanced
    if (scope.includes('general')) {
        return context;
    }
    
    // Filter out sensitive information
    return context
        .split('\n')
        .filter(line => !line.includes('password') && !line.includes('secret') && !line.includes('key'))
        .join('\n');
}
