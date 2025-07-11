const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger =require('../cli/utils/logger');
const { apiKeyAuth } = require('../utils/security');

// Import routes
const searchRoutes = require('./routes/search');
const statusRoutes = require('./routes/status');
const metricsRoutes = require('./routes/metrics');
const healthRoutes = require('./routes/health');
const reindexRoutes = require('./routes/reindex');
const uiconfigRoutes = require('./routes/uiconfig');
const docsRoutes = require('./routes/docs');
const configRoutes = require('./routes/config');
const filesRoutes = require('./routes/files');
const collectionRoutes = require('./routes/collection');

// Import routes for chat and sharing
const chatRoutes = require('./routes/chat');
const shareRoutes = require('./routes/share');
const sharedRoutes = require('./routes/shared');

// Nach den Imports hinzufügen
function mcpAuth(sharingService) {
    return async (req, res, next) => {
        const ip = req.ip;
        const socketAddr = req.socket?.remoteAddress;
        const hostname = req.hostname;
        const hostHeader = req.headers['host'];

        const isIpLocal = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ip);
        const isSocketLocal = ['::1', '127.0.0.1'].includes(socketAddr);
        const isHostnameLocal = ['localhost', '127.0.0.1'].includes(hostname);
        const isHostHeaderLocal = hostHeader && (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1'));
        
        const isLocalhost = isIpLocal || isSocketLocal || isHostnameLocal || isHostHeaderLocal;

        logger.debug(`MCP Auth check: IP=${ip}, SocketAddr=${socketAddr}, Host=${hostname}, HostHeader=${hostHeader}, isLocalhost=${isLocalhost}`);

        // If the request is from localhost, bypass token validation.
        if (isLocalhost) {
            logger.debug(`Bypassing MCP auth for local request to ${req.originalUrl}`);
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing Bearer token.' });
        }

        const token = authHeader.substring(7); // Token ist der API-Schlüssel des Shares
        const share = await sharingService.getAndValidateShareByApiKey(token);

        if (!share) {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
        }

        req.share = share; // Share-Konfiguration an die Anfrage anhängen
        next();
    };
}

let server;

function start(config, services, serviceManager) {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "https://cdn.jsdelivr.net"],
            },
        },
    }));
    app.use(express.json());

    // Middleware to distinguish local and public access
    app.use((req, res, next) => {
        req.isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '::1';
        next();
    });

    const localOnly = (req, res, next) => {
        if (req.isLocal) {
            return next();
        }
        logger.warn(`Forbidden public access attempt to admin resource: ${req.method} ${req.originalUrl} from ${req.ip}`);
        res.status(403).json({ error: 'Forbidden: This resource is only available on localhost.' });
    };

    // Public health check endpoint
    app.use('/health', healthRoutes);

    // Admin-only API endpoints
    app.use('/api/uiconfig', localOnly, uiconfigRoutes(config));
    app.use('/api/docs', localOnly, docsRoutes(config));

    // API routes are local-only
    const apiRouter = express.Router();
    apiRouter.use(localOnly);
    apiRouter.use(apiKeyAuth(config)); // Protect all /api routes
    apiRouter.use('/files', filesRoutes(config));
    apiRouter.use('/search', searchRoutes(services));
    apiRouter.use('/status', statusRoutes(serviceManager));
    apiRouter.use('/metrics', metricsRoutes(services));
    apiRouter.use('/reindex', reindexRoutes(services));
    apiRouter.use('/chat', chatRoutes(services));
    apiRouter.use('/collection', collectionRoutes(services));
    apiRouter.use('/share', shareRoutes(services));
    apiRouter.use('/config', configRoutes(config, serviceManager));
    app.use('/api', apiRouter);

    // Shared access routes (public, with their own validation)
    app.use('/shared', sharedRoutes(services));

    // --- MCP (Meta-Context Protocol) Routes for Custom Integrations ---
    const mcpRouter = express.Router();

    // Spec-Endpunkt
    mcpRouter.get('/spec', (req, res) => {
        const repoName = services.config.repository.name;
        res.json({
            name: `Git Contextor: ${repoName}`,
            description: `Provides context-aware search for the ${repoName} repository.`,
            tools: [{
                name: 'code_search',
                description: 'Searches the repository for code snippets, file contents, and documentation relevant to the user query.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The natural language query to search for.'
                        }
                    },
                    required: ['query']
                }
            }]
        });
    });

    // Tool Invocation Endpunkt
    mcpRouter.post('/tools/code_search/invoke', async (req, res) => {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Missing query in request body.' });
        }

        try {
            const searchResults = await services.contextOptimizer.search(query);
            
            const formattedResults = searchResults.map(r => 
                `File: ${r.metadata.filePath}\nLines: ${r.metadata.startLine}-${r.metadata.endLine}\n\`\`\`\n${r.pageContent}\n\`\`\``
            ).join('\n\n---\n\n');

            // Only increment usage if the request came through a share token
            if (req.share && req.share.id) {
                await services.sharingService.incrementUsage(req.share.id);
            }

            res.status(200).json({
                content: formattedResults || "No relevant context found for the query."
            });

        } catch (error) {
            logger.error('Error during MCP code search:', error);
            res.status(500).json({ error: 'An internal error occurred during search.' });
        }
    });

    app.use('/mcp/v1', mcpAuth(services.sharingService), mcpRouter);

    const publicPath = path.join(__dirname, '../ui/public');

    // Explicitly serve public assets needed by shared.html and tunnel.html
    app.use('/css', express.static(path.join(publicPath, 'css')));
    app.use('/js/shared.js', express.static(path.join(publicPath, 'js', 'shared.js')));

    // Serve the rest of the UI assets only for local requests
    app.use((req, res, next) => {
        if (req.isLocal) {
            express.static(publicPath)(req, res, next);
        } else {
            next();
        }
    });

    // Fallback to index.html for SPA (local) or tunnel.html (public)
    app.get('*', (req, res) => {
        if (req.isLocal) {
            res.sendFile(path.join(publicPath, 'index.html'));
        } else {
            res.sendFile(path.join(publicPath, 'tunnel.html'));
        }
    });

    // Global error handler
    app.use((err, req, res, next) => {
        logger.error('API Error:', err.message);
        logger.debug(err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    });
    
    return new Promise((resolve) => {
        const port = config.services.port;
        server = app.listen(port, () => {
            logger.info(`Application server with UI running at http://localhost:${port}`);
            resolve();
        });
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close((err) => {
                if (err) {
                    logger.error('Error stopping API server:', err);
                    return reject(err);
                }
                logger.info('API server stopped.');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports = { start, stop };
