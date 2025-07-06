const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../cli/utils/logger');

/**
 * Creates and returns the docs router.
 * @param {object} config - The application configuration object.
 * @returns {express.Router} The configured router.
 */
module.exports = (config) => {
    const router = express.Router();
    const docsDir = path.resolve(config.repository.path, 'docs');

    // GET /api/docs - list available documentation files
    router.get('/', async (req, res, next) => {
        try {
            const files = await fs.readdir(docsDir);
            const markdownFiles = files
                .filter(file => file.endsWith('.md'))
                .map(file => ({
                    // Create a human-readable name from the filename
                    name: path.basename(file, '.md').replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase(),
                    filename: file,
                }));
            res.json(markdownFiles);
        } catch (error) {
            logger.error('Could not list documentation files:', error);
            next(error);
        }
    });

    // GET /api/docs/:filename - get content of a documentation file
    router.get('/:filename', async (req, res, next) => {
        const { filename } = req.params;
        // Basic security check
        if (!filename || !filename.endsWith('.md') || filename.includes('..')) {
            return res.status(400).send('Invalid filename');
        }

        const filePath = path.join(docsDir, filename);

        try {
            // Security check to ensure file is within docsDir
            if (path.dirname(filePath) !== docsDir) {
                return res.status(403).send('Forbidden');
            }
            const content = await fs.readFile(filePath, 'utf-8');
            res.type('text/markdown').send(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).send('Documentation file not found.');
            }
            logger.error(`Could not read documentation file ${filename}:`, error);
            next(error);
        }
    });

    return router;
};
