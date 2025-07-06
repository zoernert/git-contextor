const logger = require('../cli/utils/logger');

/**
 * Middleware factory for API key authentication.
 * @param {object} config - The application configuration object.
 * @returns {function} Express middleware function.
 */
function apiKeyAuth(config) {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey && apiKey === config.services.apiKey) {
            return next();
        }
        logger.warn(`Unauthorized API access attempt from ${req.ip}. Provided key: ${apiKey ? 'hidden' : 'none'}`);
        res.status(401).json({ error: 'Unauthorized' });
    };
}

module.exports = { apiKeyAuth };
