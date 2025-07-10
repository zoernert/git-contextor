const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const ignore = require('ignore');
const logger = require('../../cli/utils/logger');
const { handleChatQuery } = require('./chat');

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

    // --- File Browser Endpoints for Shared Access ---

    router.get('/:shareId/files/tree', async (req, res) => {
        const repoPath = services.config.repository.path;
        try {
            const gitignorePath = path.join(repoPath, '.gitignore');
            const ig = ignore();
            try {
                const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
                ig.add(gitignoreContent);
            } catch (e) {
                if (e.code !== 'ENOENT') logger.warn('Could not read .gitignore file for share:', e);
            }
            ig.add('.gitcontextor/*');

            const buildFileTree = async (dir, rootDir) => {
                const dirents = await fs.readdir(dir, { withFileTypes: true });
                const tree = [];
                for (const dirent of dirents) {
                    const fullPath = path.join(dir, dirent.name);
                    const relativePath = path.relative(rootDir, fullPath);
                    if (ig.ignores(relativePath)) continue;

                    if (dirent.isDirectory()) {
                        tree.push({ name: dirent.name, type: 'directory', path: relativePath, children: await buildFileTree(fullPath, rootDir) });
                    } else if (dirent.isFile()) {
                        tree.push({ name: dirent.name, type: 'file', path: relativePath });
                    }
                }
                return tree;
            };
            
            const fileTree = await buildFileTree(repoPath, repoPath);
            await sharingService.incrementUsage(req.params.shareId);
            res.json(fileTree);
        } catch (error) {
            logger.error('Error building file tree for share:', error);
            res.status(500).json({ error: 'Failed to build file tree.' });
        }
    });

    router.get('/:shareId/files/content', async (req, res) => {
        const relativeFilePath = req.query.path;
        if (!relativeFilePath || path.isAbsolute(relativeFilePath) || relativeFilePath.includes('..')) {
            return res.status(400).json({ error: 'Invalid file path.' });
        }

        const repoPath = services.config.repository.path;
        const absoluteFilePath = path.join(repoPath, relativeFilePath);
        
        if (!absoluteFilePath.startsWith(repoPath)) {
            return res.status(400).json({ error: 'File path is outside the repository.' });
        }
        
        try {
            const content = await fs.readFile(absoluteFilePath, 'utf8');
            await sharingService.incrementUsage(req.params.shareId);
            res.json({ content });
        } catch (error) {
            if (error.code === 'ENOENT') return res.status(404).json({ error: 'File not found.' });
            logger.error(`Error reading file content for share ${req.params.shareId}:`, error);
            res.status(500).json({ error: 'Failed to read file content.' });
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

            // Use the unified chat handler for consistent behavior
            const result = await handleChatQuery(query, services, `shared: ${req.share.scope.join(', ')}`);

            res.json({
                ...result,
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
