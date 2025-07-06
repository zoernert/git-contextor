const express = require('express');
const path = require('path');
const logger = require('../cli/utils/logger');
const httpProxy = require('http-proxy');

let server;
const proxy = httpProxy.createProxyServer({});

function start(config) {
    const app = express();
    
    const apiTarget = `http://localhost:${config.services.apiPort}`;

    // Proxy API requests to the main API server, adding the API key
    app.use('/api', (req, res) => {
        req.headers['x-api-key'] = config.services.apiKey;
        proxy.web(req, res, { target: apiTarget, changeOrigin: true }, (err) => {
            logger.error(`Proxy error to ${apiTarget}${req.url}: ${err.message}`);
            res.status(502).send('Bad Gateway');
        });
    });

    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    // Fallback to index.html for single-page applications
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });

    return new Promise((resolve) => {
        const port = config.services.uiPort;
        server = app.listen(port, () => {
            logger.info(`UI server running at http://localhost:${port}`);
            resolve();
        });
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close((err) => {
                if (err) {
                    logger.error('Error stopping UI server:', err);
                    return reject(err);
                }
                logger.info('UI server stopped.');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports = { start, stop };
