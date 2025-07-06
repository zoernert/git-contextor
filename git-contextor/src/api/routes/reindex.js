const express = require('express');
const path = require('path');

/**
 * Creates and returns the reindex router.
 * @param {object} services - The core services of the application.
 * @param {import('../../core/Indexer')} services.indexer
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { indexer } = services;

    router.post('/', async (req, res, next) => {
        try {
            const { file } = req.body;
            if (file) {
                // Ensure file path is within the repo to avoid security issues
                const filePath = path.resolve(indexer.repoPath, file);
                if (!filePath.startsWith(indexer.repoPath)) {
                    return res.status(400).json({ error: 'Invalid file path.' });
                }
                await indexer.indexFile(filePath);
                res.status(200).json({ message: `Successfully reindexed file: ${file}` });
            } else {
                // Run in background and return immediately
                indexer.reindexAll().catch(err => {
                    // Log error on the server, but the client has already received a 202
                    console.error('Background reindex failed:', err);
                }); 
                res.status(202).json({ message: 'Full repository reindex started.' });
            }
        } catch (error) {
            next(error);
        }
    });

    router.delete('/', async (req, res, next) => {
        try {
            await indexer.clearIndex();
            res.status(200).json({ message: 'Collection and index data cleared successfully.' });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
