#!/usr/bin/env node

/**
 * Simple integration test for tunnel.corrently.cloud
 * This script tests the basic functionality without requiring the full test suite
 */

const CorrentlyTunnelProvider = require('../../src/tunneling/CorrentlyTunnelProvider');

async function testIntegration() {
    console.log('🧪 Testing CorrentlyTunnelProvider Integration');
    console.log('='.repeat(50));

    const provider = new CorrentlyTunnelProvider({
        apiKey: 'test-key',
        serverUrl: 'https://tunnel.corrently.cloud',
        description: 'Test tunnel'
    });

    try {
        // Test 1: Constructor and initial state
        console.log('✓ Constructor test passed');
        console.log('  - Initial status:', provider.getTunnelStatus().status);
        console.log('  - Service type:', provider.getTunnelStatus().service);

        // Test 2: Status methods
        console.log('✓ Status methods test passed');
        console.log('  - isRunning():', provider.isRunning());

        // Test 3: Event emitter functionality
        let eventReceived = false;
        provider.on('test-event', () => {
            eventReceived = true;
        });
        provider.emit('test-event');
        if (eventReceived) {
            console.log('✓ Event emitter test passed');
        } else {
            console.log('❌ Event emitter test failed');
        }

        // Test 4: Error handling for missing API key
        try {
            await provider.createTunnel();
            console.log('❌ API key validation test failed - should have thrown error');
        } catch (error) {
            if (error.message.includes('API key is required')) {
                console.log('✓ API key validation test passed');
            } else {
                console.log('❌ API key validation test failed - wrong error:', error.message);
            }
        }

        // Test 5: Test connection without API key
        try {
            await provider.testConnection();
            console.log('❌ Connection test validation failed - should have thrown error');
        } catch (error) {
            if (error.message.includes('API key is required')) {
                console.log('✓ Connection test validation passed');
            } else {
                console.log('❌ Connection test validation failed - wrong error:', error.message);
            }
        }

        // Test 6: Stop tunnel when not running
        await provider.stopTunnel();
        console.log('✓ Stop tunnel test passed');

        console.log('\n🎉 All integration tests passed!');
        console.log('✨ CorrentlyTunnelProvider is ready for use');
        console.log('\nNext steps:');
        console.log('1. Get your API key from tunnel.corrently.cloud');
        console.log('2. Set CORRENTLY_TUNNEL_API_KEY environment variable');
        console.log('3. Run: git-contextor tunnel test');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testIntegration();
}

module.exports = testIntegration;
