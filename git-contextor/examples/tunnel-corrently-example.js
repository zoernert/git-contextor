#!/usr/bin/env node

/**
 * Example script showing how to use tunnel.corrently.cloud with Git Contextor
 * This demonstrates the programmatic API for the tunnel service
 */

const CorrentlyTunnelProvider = require('../src/tunneling/CorrentlyTunnelProvider');
const http = require('http');

async function example() {
    console.log('🚀 Git Contextor + tunnel.corrently.cloud Example');
    console.log('='.repeat(50));

    // Get API key from environment
    const apiKey = process.env.CORRENTLY_TUNNEL_API_KEY;
    if (!apiKey) {
        console.error('❌ Please set CORRENTLY_TUNNEL_API_KEY environment variable');
        process.exit(1);
    }

    // Create a simple local server for demonstration
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Hello from Git Contextor!',
            timestamp: new Date().toISOString(),
            path: req.url,
            method: req.method
        }));
    });

    // Start local server on port 3000
    await new Promise((resolve, reject) => {
        server.listen(3000, '0.0.0.0', () => {
            console.log('✅ Local server started on http://0.0.0.0:3000');
            resolve();
        });
        server.on('error', reject);
    });

    // Create tunnel provider
    const tunnelProvider = new CorrentlyTunnelProvider({
        apiKey: apiKey,
        serverUrl: 'https://tunnel.corrently.cloud',
        description: 'Git Contextor Example'
    });

    try {
        // Test connection
        console.log('🔍 Testing connection...');
        const health = await tunnelProvider.testConnection();
        console.log('✅ Connection test passed:', health.mode);

        // Get user info
        const userInfo = await tunnelProvider.getUserInfo();
        console.log('👤 User:', userInfo.email, `(${userInfo.plan})`);

        // Create tunnel
        console.log('🚇 Creating tunnel...');
        const tunnel = await tunnelProvider.createTunnel({
            localPort: 3000,
            tunnelPath: `git-contextor-example-${Date.now()}`,
            description: 'Git Contextor Example Tunnel'
        });

        console.log('🎉 Tunnel created successfully!');
        console.log('📍 Public URL:', tunnel.url);
        console.log('🔗 Tunnel ID:', tunnel.id);

        // Test the tunnel
        console.log('🧪 Testing tunnel...');
        const response = await fetch(tunnel.url);
        const data = await response.json();
        console.log('✅ Tunnel test response:', data.message);

        // Keep tunnel running for 30 seconds
        console.log('⏳ Keeping tunnel active for 30 seconds...');
        console.log('🌐 You can visit:', tunnel.url);
        
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Clean up
        console.log('🧹 Cleaning up...');
        await tunnelProvider.stopTunnel();
        server.close();

        console.log('✅ Example completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        server.close();
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});

// Run the example
if (require.main === module) {
    example().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = example;
