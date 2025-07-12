const ManagedTunnelingProvider = require('../../src/tunneling/ManagedTunnelingProvider');

// Mock WebSocket
jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1
  }));
});

// Mock fetch
global.fetch = jest.fn();

describe('ManagedTunnelingProvider', () => {
  let provider;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      apiUrl: 'https://tunnel.corrently.cloud',
      apiKey: 'test-api-key',
      subdomain: 'test-subdomain',
      gitContextorShare: true
    };
    
    provider = new ManagedTunnelingProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(provider.config).toBe(mockConfig);
      expect(provider.tunnelId).toBeNull();
      expect(provider.tunnelUrl).toBeNull();
      expect(provider.status).toBe('stopped');
      expect(provider.websocket).toBeNull();
    });
  });

  describe('createTunnel', () => {
    it('should create a tunnel successfully', async () => {
      const mockTunnelData = {
        _id: 'test-tunnel-id',
        url: 'https://test-subdomain.tunnel.corrently.cloud',
        status: 'active'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTunnelData)
      });

      const result = await provider.createTunnel({
        localPort: 3333,
        description: 'Test tunnel'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://tunnel.corrently.cloud/api/tunnels',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            localPort: 3333,
            subdomain: 'test-subdomain',
            gitContextorShare: true,
            description: 'Test tunnel'
          })
        }
      );

      expect(result).toEqual({
        id: 'test-tunnel-id',
        url: 'https://test-subdomain.tunnel.corrently.cloud',
        status: 'running'
      });

      expect(provider.tunnelId).toBe('test-tunnel-id');
      expect(provider.tunnelUrl).toBe('https://test-subdomain.tunnel.corrently.cloud');
      expect(provider.status).toBe('running');
    });

    it('should throw error if tunnel creation fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          message: 'Invalid API key'
        })
      });

      await expect(provider.createTunnel({
        localPort: 3333
      })).rejects.toThrow('Tunnel creation failed: 400 Bad Request - Invalid API key');

      expect(provider.status).toBe('error');
    });

    it('should throw error if tunnel is already active', async () => {
      provider.status = 'running';

      await expect(provider.createTunnel({
        localPort: 3333
      })).rejects.toThrow('Tunnel is already active with status: running');
    });
  });

  describe('getTunnelStatus', () => {
    it('should return tunnel status', () => {
      provider.status = 'running';
      provider.tunnelUrl = 'https://test.tunnel.corrently.cloud';
      provider.tunnelId = 'test-id';

      const status = provider.getTunnelStatus();

      expect(status).toEqual({
        status: 'running',
        url: 'https://test.tunnel.corrently.cloud',
        service: 'managed',
        id: 'test-id'
      });
    });
  });

  describe('stopTunnel', () => {
    it('should stop tunnel and cleanup', async () => {
      provider.status = 'running';
      provider.tunnelId = 'test-id';
      provider.tunnelUrl = 'https://test.tunnel.corrently.cloud';
      provider.websocket = { close: jest.fn() };

      fetch.mockResolvedValueOnce({
        ok: true
      });

      await provider.stopTunnel();

      expect(fetch).toHaveBeenCalledWith(
        'https://tunnel.corrently.cloud/api/tunnels/test-id',
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-api-key'
          }
        }
      );

      expect(provider.status).toBe('stopped');
      expect(provider.tunnelId).toBeNull();
      expect(provider.tunnelUrl).toBeNull();
      expect(provider.websocket).toBeNull();
    });
  });

  describe('isRunning', () => {
    it('should return true when running', () => {
      provider.status = 'running';
      expect(provider.isRunning()).toBe(true);
    });

    it('should return false when not running', () => {
      provider.status = 'stopped';
      expect(provider.isRunning()).toBe(false);
    });
  });
});
