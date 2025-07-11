const logger = require('../cli/utils/logger');

/**
 * Middleware factory for API key authentication.
 * @param {object} config - The application configuration object.
 * @returns {function} Express middleware function.
 */
function apiKeyAuth(config) {
    return (req, res, next) => {
        const isMcpRoute = req.originalUrl.startsWith('/mcp/');
        
        // Check both req.ip and the underlying socket's remote address for robustness.
        const isIpLocal = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(req.ip);
        const isSocketLocal = req.socket?.remoteAddress === '::1' || req.socket?.remoteAddress === '127.0.0.1';
        const isLocalhost = isIpLocal || isSocketLocal;

        // Log details for debugging auth issues on localhost
        logger.debug(`Auth check: IP=${req.ip}, SocketAddr=${req.socket?.remoteAddress}, Host=${req.hostname}, URL=${req.originalUrl}, isLocalhost=${isLocalhost}, isMcpRoute=${isMcpRoute}`);

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
