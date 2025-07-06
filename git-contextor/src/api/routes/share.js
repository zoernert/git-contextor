const express = require('express');

module.exports = (services) => {
    const router = express.Router();
    const { sharingService } = services;

    // Create new share
    router.post('/', async (req, res, next) => {
        try {
            const share = await sharingService.createShare(req.body);
            res.json(share);
        } catch (error) {
            next(error);
        }
    });

    // List active shares
    router.get('/', async (req, res, next) => {
        try {
            const shares = sharingService.getActiveShares();
            res.json({ shares });
        } catch (error) {
            next(error);
        }
    });

    // Tunnel management endpoints
    router.post('/tunnel', async (req, res, next) => {
        try {
            const { service } = req.body;
            await sharingService.startTunnel(service);
            res.status(202).json({ message: `Tunnel service '${service}' is starting.` });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/tunnel', (req, res) => {
        const status = sharingService.getTunnelStatus();
        res.json(status);
    });

    router.delete('/tunnel', async (req, res, next) => {
        try {
            await sharingService.stopTunnel();
            res.json({ message: 'Tunnel stopped.' });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
