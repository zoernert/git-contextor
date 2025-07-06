const express = require('express');
const router = express.Router();

/**
 * Health check endpoint to confirm the server is running and provides version info.
 */
router.get('/', async (req, res) => {
  try {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: require('../../../package.json').version
    };
    
    // Optional: In the future, we could add checks for dependent services like Qdrant
    // const qdrantHealth = await checkQdrantHealth();
    // checks.qdrant = qdrantHealth ? 'ok' : 'error';
    
    res.status(200).json(checks);
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
