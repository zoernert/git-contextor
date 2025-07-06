const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('../cli/utils/logger');

// Import routes
const searchRoutes = require('./routes/search');
const statusRoutes = require('./routes/status');
const metricsRoutes = require('./routes/metrics');
const healthRoutes = require('./routes/health');

function createApiServer(serviceManager) {
    const app = express();
    const config = serviceManager.config;

    // Middleware
    app.use(cors());
    app.use(helmet());
    app.use(express.json());

    // Authentication Middleware
    const apiKeyAuth = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey && apiKey === config.services.apiKey) {
            return next();
        }
        logger.warn(`Unauthorized API access attempt. Provided key: ${apiKey ? 'hidden' : 'none'}`);
        res.status(401).json({ error: 'Unauthorized' });
    };

    // Public health check endpoint
    app.use('/health', healthRoutes);

    // Pass service manager to routes and protect them with API key
    app.use('/api/search', apiKeyAuth, searchRoutes(serviceManager));
    app.use('/api/status', apiKeyAuth, statusRoutes(serviceManager));
    app.use('/api/metrics', apiKeyAuth, metricsRoutes(serviceManager));

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

    return {
        start: () => {
            const port = config.services.apiPort;
            app.listen(port, () => {
                logger.info(`API server listening on http://localhost:${port}`);
            });
        }
    };
}

module.exports = createApiServer;
