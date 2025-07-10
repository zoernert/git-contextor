const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');
const logger = require('../../cli/utils/logger');

/**
 * Creates a router for file browsing endpoints.
 * @param {object} config - The application configuration object.
 * @returns {express.Router}
 */
module.exports = (config) => {
    const router = express.Router();
    const repoPath = config.repository.path;

    let gitignore = null;

    // Helper to load and prepare .gitignore rules
    const getGitignore = async () => {
        if (gitignore) return gitignore;
        
        const ig = ignore();
        const gitignorePath = path.join(repoPath, '.gitignore');
        try {
            const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
            ig.add(gitignoreContent);
            logger.debug('Loaded .gitignore rules.');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn('Could not read .gitignore file:', error);
            } else {
                logger.debug('No .gitignore file found.');
            }
        }
        // Add default git-contextor exclusion
        ig.add('.gitcontextor/*');
        gitignore = ig;
        return gitignore;
    };

    // Recursive function to build the file tree
    const buildFileTree = async (dir, rootDir) => {
        const ig = await getGitignore();
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const tree = [];

        for (const dirent of dirents) {
            const fullPath = path.join(dir, dirent.name);
            const relativePath = path.relative(rootDir, fullPath);

            // Check if the path should be ignored
            if (ig.ignores(relativePath)) {
                continue;
            }

            if (dirent.isDirectory()) {
                tree.push({
                    name: dirent.name,
                    type: 'directory',
                    path: relativePath,
                    children: await buildFileTree(fullPath, rootDir),
                });
            } else if (dirent.isFile()) {
                tree.push({
                    name: dirent.name,
                    type: 'file',
                    path: relativePath,
                });
            }
        }
        return tree;
    };

    /**
     * GET /files/tree
     * Returns the file and directory structure of the repository, respecting .gitignore.
     */
    router.get('/tree', async (req, res) => {
        // Force-refresh gitignore rules on each call in case it changed
        gitignore = null; 
        try {
            const fileTree = await buildFileTree(repoPath, repoPath);
            res.json(fileTree);
        } catch (error) {
            logger.error('Error building file tree:', error);
            res.status(500).json({ error: 'Failed to build file tree.' });
        }
    });

    /**
     * GET /files/content
     * Returns the content of a specific file.
     * Query param: path (relative path to file)
     */
    router.get('/content', async (req, res) => {
        const relativeFilePath = req.query.path;

        if (!relativeFilePath) {
            return res.status(400).json({ error: 'File path is required.' });
        }

        // Security: Ensure the path is relative and does not travel up
        if (path.isAbsolute(relativeFilePath) || relativeFilePath.includes('..')) {
            return res.status(400).json({ error: 'Invalid file path.' });
        }

        const absoluteFilePath = path.join(repoPath, relativeFilePath);
        
        // Security: Double-check that the resolved path is still within the repo
        if (!absoluteFilePath.startsWith(repoPath)) {
            return res.status(400).json({ error: 'File path is outside the repository.' });
        }
        
        try {
            const content = await fs.readFile(absoluteFilePath, 'utf8');
            // The frontend expects a JSON object with a 'content' key
            res.json({ content });
        } catch (error) {
            logger.error(`Error reading file content for ${relativeFilePath}:`, error);
            if (error.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found.' });
            }
            res.status(500).json({ error: 'Failed to read file content.' });
        }
    });

    return router;
};
