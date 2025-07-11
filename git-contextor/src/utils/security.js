const logger = require('../cli/utils/logger');

/**
 * Middleware factory for API key authentication.
 * @param {object} config - The application configuration object.
 * @returns {function} Express middleware function.
 */
function apiKeyAuth(config) {
    return (req, res, next) => {
        const isMcpRoute = req.originalUrl.startsWith('/mcp/');

        // Check req.ip, the underlying socket, the hostname, and the Host header for robustness.
        const ip = req.ip;
        const socketAddr = req.socket?.remoteAddress;
        const hostname = req.hostname;
        const hostHeader = req.headers['host'];

        const isIpLocal = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ip);
        const isSocketLocal = ['::1', '127.0.0.1'].includes(socketAddr);
        const isHostnameLocal = ['localhost', '127.0.0.1'].includes(hostname);
        // The host header includes the port, e.g., 'localhost:3333'. Check if it starts with a local identifier.
        const isHostHeaderLocal = hostHeader && (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1'));
        
        const isLocalhost = isIpLocal || isSocketLocal || isHostnameLocal || isHostHeaderLocal;

        // Log details for debugging auth issues on localhost
        logger.debug(`Auth check: IP=${ip}, SocketAddr=${socketAddr}, Host=${hostname}, HostHeader=${hostHeader}, URL=${req.originalUrl}, isLocalhost=${isLocalhost}, isMcpRoute=${isMcpRoute}`);

        // Allow unauthenticated access to MCP routes from localhost
        if (isMcpRoute && isLocalhost) {
            logger.debug(`Bypassing API key auth for local MCP request to ${req.originalUrl}`);
            return next();
        }

        const xApiKey = req.headers['x-api-key'];
        const authHeader = req.headers['authorization'];
        let providedKey = null;
        
        if (xApiKey) {
            providedKey = xApiKey;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            providedKey = authHeader.substring(7);
        }

        if (providedKey && providedKey === config.services.apiKey) {
            return next();
        }
        
        logger.warn(`Unauthorized API access attempt from ${req.ip}. Provided key: ${providedKey ? 'hidden' : 'none'}`);
        res.status(401).json({ error: 'Unauthorized' });
    };
}

module.exports = { apiKeyAuth };
