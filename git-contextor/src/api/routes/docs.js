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
    // Load docs from the git-contextor package, not the target repository.
    let packagePath;
    try {
        // This works when git-contextor is an installed dependency (e.g., via npx)
        packagePath = path.dirname(require.resolve('git-contextor/package.json'));
    } catch (error) {
        // This is a fallback for local development, where the package isn't in node_modules.
        // It assumes docs.js is in src/api/routes from the project root.
        packagePath = path.resolve(__dirname, '../../..');
    }
    const docsDir = path.join(packagePath, 'docs');

    // Helper function to recursively find all markdown files
    const findMarkdownFiles = async (dir, rootDir = dir) => {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map(async (dirent) => {
            const res = path.resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                return findMarkdownFiles(res, rootDir);
            }
            if (dirent.isFile() && dirent.name.endsWith('.md')) {
                // Return path relative to the root 'docs' directory, using forward slashes
                return path.relative(rootDir, res).replace(/\\/g, '/');
            }
            return null;
        }));
        return files.flat().filter(Boolean);
    };

    // GET /api/docs - list available documentation files recursively
    router.get('/', async (req, res, next) => {
        try {
            const files = await findMarkdownFiles(docsDir);
            const markdownFiles = files.map(file => ({
                // Create a human-readable name from the file path
                // e.g., 'integrations/n8n.md' becomes 'INTEGRATIONS N8N'
                name: file.replace('.md', '').replace(/[\\/]/g, ' ').replace(/_/g, ' ').replace(/-/g, ' ').trim().toUpperCase(),
                filename: file,
            }));
            res.json(markdownFiles);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`Documentation directory not found at ${docsDir}. No docs will be served.`);
                return res.json([]);
            }
            logger.error('Could not list documentation files:', error);
            next(error);
        }
    });

    // GET /api/docs/* - get content of a documentation file, supporting subdirectories
    router.get('/*', async (req, res, next) => {
        const requestedFile = req.params[0];

        // Basic security check to prevent path traversal and invalid requests
        if (!requestedFile || !requestedFile.endsWith('.md') || requestedFile.includes('..')) {
            return res.status(400).send('Invalid request');
        }

        const filePath = path.join(docsDir, requestedFile);

        try {
            // Advanced security check: resolve the path and ensure it's still within docsDir.
            const resolvedPath = path.resolve(filePath);
            if (!resolvedPath.startsWith(path.resolve(docsDir))) {
                return res.status(403).send('Forbidden');
            }
            const content = await fs.readFile(resolvedPath, 'utf-8');
            res.type('text/markdown').send(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).send('Documentation file not found.');
            }
            logger.error(`Could not read documentation file ${requestedFile}:`, error);
            next(error);
        }
    });

    return router;
};
