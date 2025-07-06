const express = require('express');

/**
 * Creates and returns the status router.
 * @param {import('../../core/ServiceManager')} serviceManager - The service manager instance.
 * @returns {express.Router} The configured router.
 */
module.exports = (serviceManager) => {
    const router = express.Router();

    /**
     * Retrieves the current status of the Git Contextor services.
     */
    router.get('/', async (req, res, next) => {
        try {
            const status = await serviceManager.getStatus();
            res.json(status);
        } catch (error) {
            next(error);
        }
    });

    return router;
};
