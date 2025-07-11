const logger = require('../cli/utils/logger');

/**
 * Middleware factory for API key authentication.
 * @param {object} config - The application configuration object.
 * @returns {function} Express middleware function.
 */
function apiKeyAuth(config) {
    return (req, res, next) => {
        const isMcpRoute = req.originalUrl.startsWith('/mcp/');
        // ::1 is the loopback address in IPv6.
        // 127.0.0.1 is the loopback address in IPv4.
        // ::ffff:127.0.0.1 is the IPv4 loopback address in an IPv6 context.
        const isLocalhost = ['::1', '12.0.0.1', '::ffff:127.0.0.1'].includes(req.ip);

        // Allow unauthenticated access to MCP routes from localhost
        if (isMcpRoute && isLocalhost) {
            logger.debug(`Bypassing API key auth for local MCP request to ${req.originalUrl}`);
            return next();
        }

        const apiKey = req.headers['x-api-key'];
        if (apiKey && apiKey === config.services.apiKey) {
            return next();
        }
        logger.warn(`Unauthorized API access attempt from ${req.ip}. Provided key: ${apiKey ? 'hidden' : 'none'}`);
        res.status(401).json({ error: 'Unauthorized' });
    };
}

module.exports = { apiKeyAuth };
