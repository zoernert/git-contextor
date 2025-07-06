const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger =require('../cli/utils/logger');
const { apiKeyAuth } = require('../utils/security');

// Import routes
const searchRoutes = require('./routes/search');
const statusRoutes = require('./routes/status');
const metricsRoutes = require('./routes/metrics');
const healthRoutes = require('./routes/health');
const reindexRoutes = require('./routes/reindex');

let server;

function start(config, services) {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(helmet());
    app.use(express.json());
    
    // Public health check endpoint
    app.use('/health', healthRoutes);
    
    // API routes
    const apiRouter = express.Router();
    apiRouter.use(apiKeyAuth(config)); // Protect all /api routes
    apiRouter.use('/search', searchRoutes(services));
    apiRouter.use('/status', statusRoutes(services));
    apiRouter.use('/metrics', metricsRoutes(services));
    apiRouter.use('/reindex', reindexRoutes(services));
    
    app.use('/api', apiRouter);

    // Not found handler
    app.use((req, res, next) => {
        res.status(404).json({ error: 'Not Found' });
    });

    // Global error handler
    app.use((err, req, res, next) => {
        logger.error('API Error:', err.message);
        logger.debug(err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    });
    
    return new Promise((resolve) => {
        const port = config.services.apiPort;
        server = app.listen(port, () => {
            logger.info(`API server listening on http://localhost:${port}`);
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
