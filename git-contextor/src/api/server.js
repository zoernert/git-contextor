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

// Import routes for chat and sharing
const chatRoutes = require('./routes/chat');
const shareRoutes = require('./routes/share');
const sharedRoutes = require('./routes/shared');

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
    apiRouter.use('/search', searchRoutes(services));
    apiRouter.use('/status', statusRoutes(serviceManager));
    apiRouter.use('/metrics', metricsRoutes(services));
    apiRouter.use('/reindex', reindexRoutes(services));
    apiRouter.use('/chat', chatRoutes(services));
    apiRouter.use('/share', shareRoutes(services));
    apiRouter.use('/config', configRoutes(config, serviceManager));
    app.use('/api', apiRouter);

    // Shared access routes (public, with their own validation)
    app.use('/shared', sharedRoutes(services));

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
