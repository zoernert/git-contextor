const express = require('express');
const logger = require('../../cli/utils/logger');
const ConfigManager = require('../../core/ConfigManager');

/**
 * Creates and returns the config router.
 * @param {object} config - The application configuration object.
 * @param {ServiceManager} serviceManager - The service manager instance.
 * @returns {express.Router} The configured router.
 */
module.exports = (config, serviceManager) => {
    const router = express.Router();
    // A single ConfigManager for this route's lifecycle
    const configManager = new ConfigManager(process.cwd());

    // GET the full, live configuration
    router.get('/', async (req, res, next) => {
        try {
            await configManager.load();
            res.json(configManager.config);
        } catch (error) {
            next(error);
        }
    });

    // POST to toggle monitoring
    router.post('/monitoring', async (req, res, next) => {
        try {
            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ error: 'Field "enabled" must be a boolean.' });
            }
            await configManager.load();
            await configManager.updateConfig({ monitoring: { watchEnabled: enabled } });

            res.status(202).json({ message: 'Monitoring settings updated. Service is restarting...' });

            logger.info(`Monitoring watch set to ${enabled} via UI. Triggering restart...`);
            setTimeout(() => {
                serviceManager.stop({ silent: true }).then(() => {
                    process.exit(0);
                });
            }, 500);

        } catch (error) {
            next(error);
        }
    });

    // POST to update the configuration
    router.post('/', async (req, res, next) => {
        try {
            const newConfig = req.body;
            await configManager.load(); // Load current state
            await configManager.updateConfig(newConfig); // Merge and save

            res.status(202).json({ message: 'Configuration saved. Service is restarting...' });

            // Trigger a graceful stop and then exit, to be restarted by a process manager.
            logger.info('Configuration updated via UI. Triggering restart...');
            setTimeout(() => {
                serviceManager.stop({ silent: true }).then(() => {
                    process.exit(0);
                });
            }, 500); // Give time for response to be sent

        } catch (error) {
            next(error);
        }
    });

    return router;
};
