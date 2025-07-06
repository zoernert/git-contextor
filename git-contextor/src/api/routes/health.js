const express = require('express');
const router = express.Router();

/**
 * Health check endpoint to confirm the server is running.
 */
router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
