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

let server;

function start(config, services) {
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

    // Public health check endpoint
    app.use('/health', healthRoutes);
    app.use('/api/uiconfig', uiconfigRoutes(config));
    app.use('/api/docs', docsRoutes(config));

    // API routes
    const apiRouter = express.Router();
    apiRouter.use(apiKeyAuth(config)); // Protect all /api routes
    apiRouter.use('/search', searchRoutes(services));
    apiRouter.use('/status', statusRoutes(services));
    apiRouter.use('/metrics', metricsRoutes(services));
    apiRouter.use('/reindex', reindexRoutes(services));
    app.use('/api', apiRouter);

    // Determine path to the 'docs' directory to serve markdown files directly
    let packagePath;
    try {
        // This works when git-contextor is an installed dependency (e.g., via npx)
        packagePath = path.dirname(require.resolve('git-contextor/package.json'));
    } catch (error) {
        // This is a fallback for local development, assuming server.js is in src/api
        packagePath = path.resolve(__dirname, '../../..');
    }
    const docsDir = path.join(packagePath, 'docs');
    app.use(express.static(docsDir));

    // Serve static UI files from the 'public' directory
    const publicPath = path.join(__dirname, '../ui/public');
    app.use(express.static(publicPath));

    // Fallback to index.html for single-page applications
    app.get('*', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
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
