const express = require('express');
const path = require('path');
const logger = require('../cli/utils/logger');

function createUiServer(serviceManager) {
    const app = express();
    const config = serviceManager.config;

    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    return {
        start: () => {
            const port = config.services.uiPort;
            app.listen(port, () => {
                logger.info(`UI server running at http://localhost:${port}`);
            });
        }
    };
}

module.exports = createUiServer;
