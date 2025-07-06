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

    return router;
};
