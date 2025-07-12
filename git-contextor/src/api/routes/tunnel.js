const express = require('express');
const router = express.Router();
const logger = require('../../cli/utils/logger');

/**
 * @swagger
 * /api/tunnel:
 *   post:
 *     summary: Start a tunnel
 *     description: Start a new tunnel with specified service
 *     tags:
 *       - Tunnel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *                 enum: [managed, localtunnel, ngrok]
 *                 default: localtunnel
 *               subdomain:
 *                 type: string
 *                 description: Custom subdomain (if supported)
 *               description:
 *                 type: string
 *                 description: Tunnel description
 *             required:
 *               - service
 *     responses:
 *       200:
 *         description: Tunnel started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 service:
 *                   type: string
 *                 url:
 *                   type: string
 *                 status:
 *                   type: string
 *                 id:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
    try {
        const { service = 'localtunnel', subdomain, description } = req.body;
        
        if (!req.app.locals.sharingService) {
            return res.status(500).json({ error: 'Sharing service not available' });
        }

        // Pass additional parameters for managed tunneling
        const result = await req.app.locals.sharingService.startTunnel(service, {
            subdomain,
            description
        });
        
        const tunnelStatus = req.app.locals.sharingService.getTunnelStatus();
        
        res.json({
            success: true,
            service: tunnelStatus.service,
            url: tunnelStatus.url,
            status: tunnelStatus.status,
            id: tunnelStatus.id || null,
            password: tunnelStatus.password || null
        });
        
    } catch (error) {
        logger.error('Tunnel start error:', error);
        res.status(500).json({ 
            error: 'Failed to start tunnel',
            message: error.message 
        });
    }
});

/**
 * @swagger
 * /api/tunnel:
 *   get:
 *     summary: Get tunnel status
 *     description: Get current tunnel status and details
 *     tags:
 *       - Tunnel
 *     responses:
 *       200:
 *         description: Tunnel status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 url:
 *                   type: string
 *                 id:
 *                   type: string
 *                 password:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        if (!req.app.locals.sharingService) {
            return res.status(500).json({ error: 'Sharing service not available' });
        }

        const tunnelStatus = req.app.locals.sharingService.getTunnelStatus();
        
        res.json(tunnelStatus);
        
    } catch (error) {
        logger.error('Tunnel status error:', error);
        res.status(500).json({ 
            error: 'Failed to get tunnel status',
            message: error.message 
        });
    }
});

/**
 * @swagger
 * /api/tunnel:
 *   delete:
 *     summary: Stop tunnel
 *     description: Stop the currently running tunnel
 *     tags:
 *       - Tunnel
 *     responses:
 *       200:
 *         description: Tunnel stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.delete('/', async (req, res) => {
    try {
        if (!req.app.locals.sharingService) {
            return res.status(500).json({ error: 'Sharing service not available' });
        }

        await req.app.locals.sharingService.stopTunnel();
        
        res.json({
            success: true,
            message: 'Tunnel stopped successfully'
        });
        
    } catch (error) {
        logger.error('Tunnel stop error:', error);
        res.status(500).json({ 
            error: 'Failed to stop tunnel',
            message: error.message 
        });
    }
});

/**
 * @swagger
 * /api/tunnels:
 *   get:
 *     summary: List all tunnels
 *     description: Get list of all available tunnels (for managed tunneling)
 *     tags:
 *       - Tunnel
 *     responses:
 *       200:
 *         description: Tunnels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tunnels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/all', async (req, res) => {
    try {
        if (!req.app.locals.sharingService) {
            return res.status(500).json({ error: 'Sharing service not available' });
        }

        // For now, just return the current tunnel status
        // In a full implementation, this would query the managed service for all tunnels
        const tunnelStatus = req.app.locals.sharingService.getTunnelStatus();
        
        const tunnels = [];
        if (tunnelStatus.status !== 'stopped') {
            tunnels.push({
                id: tunnelStatus.id || 'local',
                url: tunnelStatus.url,
                status: tunnelStatus.status,
                service: tunnelStatus.service,
                created_at: new Date().toISOString()
            });
        }
        
        res.json({ tunnels });
        
    } catch (error) {
        logger.error('Tunnel list error:', error);
        res.status(500).json({ 
            error: 'Failed to list tunnels',
            message: error.message 
        });
    }
});

/**
 * @swagger
 * /api/tunnel/test:
 *   post:
 *     summary: Test tunnel connection
 *     description: Test connection to a tunnel provider
 *     tags:
 *       - Tunnel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [corrently, managed, localtunnel]
 *                 default: corrently
 *               apiKey:
 *                 type: string
 *                 description: API key for the tunnel service
 *     responses:
 *       200:
 *         description: Connection test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: string
 *                 plan:
 *                   type: string
 *                 usage:
 *                   type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Connection test failed
 */
router.post('/test', async (req, res) => {
    try {
        const { provider, apiKey } = req.body;
        
        if (!provider || !apiKey) {
            return res.status(400).json({ error: 'Provider and API key are required' });
        }
        
        if (provider === 'corrently') {
            const CorrentlyTunnelProvider = require('../../tunneling/CorrentlyTunnelProvider');
            const tunnelProvider = new CorrentlyTunnelProvider({
                apiKey: apiKey,
                serverUrl: 'https://tunnel.corrently.cloud'
            });
            
            // Test connection
            const health = await tunnelProvider.testConnection();
            const userInfo = await tunnelProvider.getUserInfo();
            
            res.json({
                success: true,
                user: userInfo.email,
                plan: userInfo.plan,
                usage: userInfo.usage,
                health: health
            });
        } else {
            res.status(400).json({ error: `Testing not supported for provider: ${provider}` });
        }
        
    } catch (error) {
        logger.error('Tunnel test error:', error);
        res.status(500).json({ 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

module.exports = router;
