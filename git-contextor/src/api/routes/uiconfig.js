const express = require('express');

/**
 * Creates router to provide configuration to the UI.
 * @param {object} config - The application configuration object.
 * @returns {express.Router} The configured router.
 */
module.exports = (config) => {
    const router = express.Router();
    router.get('/', (req, res) => {
        // Only expose what the client needs
        res.json({
            apiKey: config.services.apiKey
        });
    });
    return router;
};
