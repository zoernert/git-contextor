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

            logger.info(`Monitoring watch set to ${enabled} via UI. A manual restart is required to apply changes.`);
            res.status(200).json({ message: 'Monitoring settings updated. Please restart the service to apply changes.' });

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

            logger.info('Configuration updated via UI. A manual restart is required to apply changes.');
            res.status(200).json({ message: 'Configuration saved. Please restart the service to apply changes.' });

        } catch (error) {
            next(error);
        }
    });

    return router;
};
