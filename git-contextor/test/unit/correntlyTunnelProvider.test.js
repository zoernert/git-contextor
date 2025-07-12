const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const CorrentlyTunnelProvider = require('../../src/tunneling/CorrentlyTunnelProvider');
const http = require('http');

describe('CorrentlyTunnelProvider', () => {
  let provider;
  let mockServer;
  let mockServerPort;

  beforeEach(() => {
    // Create a mock local server for testing
    mockServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Test response', path: req.url }));
    });

    mockServerPort = 3001;
    
    provider = new CorrentlyTunnelProvider({
      apiKey: 'test-api-key',
      serverUrl: 'https://tunnel.corrently.cloud',
      description: 'Test tunnel'
    });
  });

  afterEach(async () => {
    if (mockServer) {
      mockServer.close();
    }
    if (provider && provider.isRunning()) {
      await provider.stopTunnel();
    }
  });

  describe('constructor', () => {
    it('should initialize with correct config', () => {
      expect(provider.config.apiKey).toBe('test-api-key');
      expect(provider.config.serverUrl).toBe('https://tunnel.corrently.cloud');
      expect(provider.status).toBe('stopped');
    });

    it('should use default server URL', () => {
      const defaultProvider = new CorrentlyTunnelProvider({
        apiKey: 'test-key'
      });
      expect(defaultProvider.serverUrl).toBe('https://tunnel.corrently.cloud');
    });
  });

  describe('getTunnelStatus', () => {
    it('should return correct status when stopped', () => {
      const status = provider.getTunnelStatus();
      expect(status).toEqual({
        status: 'stopped',
        url: null,
        service: 'corrently',
        id: null
      });
    });
  });

  describe('createTunnel', () => {
    it('should throw error if no API key provided', async () => {
      const noKeyProvider = new CorrentlyTunnelProvider({
        serverUrl: 'https://tunnel.corrently.cloud'
      });

      await expect(noKeyProvider.createTunnel()).rejects.toThrow(
        'API key is required for tunnel.corrently.cloud service'
      );
    });

    it('should throw error if tunnel already active', async () => {
      provider.status = 'running';
      
      await expect(provider.createTunnel()).rejects.toThrow(
        'Tunnel is already active with status: running'
      );
    });
  });

  describe('stopTunnel', () => {
    it('should reset state when stopped', async () => {
      provider.status = 'running';
      provider.tunnelId = 'test-id';
      provider.tunnelUrl = 'https://test.url';
      
      await provider.stopTunnel();
      
      expect(provider.status).toBe('stopped');
      expect(provider.tunnelId).toBeNull();
      expect(provider.tunnelUrl).toBeNull();
    });
  });

  describe('isRunning', () => {
    it('should return true when status is running', () => {
      provider.status = 'running';
      expect(provider.isRunning()).toBe(true);
    });

    it('should return false when status is not running', () => {
      expect(provider.isRunning()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should throw error if no API key provided', async () => {
      const noKeyProvider = new CorrentlyTunnelProvider({
        serverUrl: 'https://tunnel.corrently.cloud'
      });

      await expect(noKeyProvider.testConnection()).rejects.toThrow(
        'API key is required'
      );
    });
  });

  describe('event handling', () => {
    it('should be an event emitter', () => {
      let eventFired = false;
      provider.on('test-event', () => {
        eventFired = true;
      });
      
      provider.emit('test-event');
      expect(eventFired).toBe(true);
    });
  });
});
