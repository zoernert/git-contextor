const SharingService = require('../../src/core/SharingService');

// Mock the ManagedTunnelingProvider
jest.mock('../../src/tunneling/ManagedTunnelingProvider', () => {
  return jest.fn().mockImplementation(() => ({
    createTunnel: jest.fn(),
    stopTunnel: jest.fn(),
    getTunnelStatus: jest.fn(),
    isRunning: jest.fn(),
    on: jest.fn()
  }));
});

const ManagedTunnelingProvider = require('../../src/tunneling/ManagedTunnelingProvider');

describe('SharingService Managed Tunneling Integration', () => {
  let sharingService;
  let mockConfig;
  let mockManagedProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      services: {
        port: 3333
      },
      tunneling: {
        provider: 'managed',
        managed: {
          apiUrl: 'https://tunnel.corrently.cloud',
          apiKey: 'test-api-key',
          subdomain: 'test-subdomain',
          gitContextorShare: true
        }
      }
    };

    mockManagedProvider = {
      createTunnel: jest.fn(),
      stopTunnel: jest.fn(),
      getTunnelStatus: jest.fn(),
      isRunning: jest.fn(),
      on: jest.fn()
    };

    ManagedTunnelingProvider.mockImplementation(() => mockManagedProvider);

    sharingService = new SharingService('/tmp/test-repo', mockConfig);
  });

  describe('initialization', () => {
    it('should initialize managed tunneling provider when configured', () => {
      expect(ManagedTunnelingProvider).toHaveBeenCalledWith(mockConfig.tunneling.managed);
      expect(sharingService.managedTunnelingProvider).toBe(mockManagedProvider);
    });

    it('should not initialize managed tunneling provider when not configured', () => {
      jest.clearAllMocks();
      const configWithoutManaged = {
        services: { port: 3333 },
        tunneling: { provider: 'localtunnel' }
      };
      
      const service = new SharingService('/tmp/test-repo', configWithoutManaged);
      expect(service.managedTunnelingProvider).toBeNull();
    });
  });

  describe('startTunnel with managed service', () => {
    it('should start managed tunnel successfully', async () => {
      const mockTunnelData = {
        id: 'test-tunnel-id',
        url: 'https://test.tunnel.corrently.cloud',
        status: 'running'
      };

      mockManagedProvider.createTunnel.mockResolvedValue(mockTunnelData);

      const result = await sharingService.startTunnel('managed', {
        subdomain: 'custom-subdomain',
        description: 'Test tunnel'
      });

      expect(mockManagedProvider.createTunnel).toHaveBeenCalledWith({
        localPort: 3333,
        subdomain: 'custom-subdomain',
        description: 'Test tunnel'
      });

      expect(sharingService.tunnelUrl).toBe('https://test.tunnel.corrently.cloud');
      expect(sharingService.tunnelStatus).toBe('running');
      expect(sharingService.tunnelService).toBe('managed');
    });

    it('should use config subdomain when not provided in options', async () => {
      const mockTunnelData = {
        id: 'test-tunnel-id',
        url: 'https://test.tunnel.corrently.cloud',
        status: 'running'
      };

      mockManagedProvider.createTunnel.mockResolvedValue(mockTunnelData);

      await sharingService.startTunnel('managed', {
        description: 'Test tunnel'
      });

      expect(mockManagedProvider.createTunnel).toHaveBeenCalledWith({
        localPort: 3333,
        subdomain: 'test-subdomain',
        description: 'Test tunnel'
      });
    });

    it('should throw error if managed provider not configured', async () => {
      sharingService.managedTunnelingProvider = null;

      await expect(sharingService.startTunnel('managed')).rejects.toThrow(
        'Managed tunneling provider not configured'
      );
    });

    it('should throw error if API key not configured', async () => {
      sharingService.config.tunneling.managed.apiKey = null;

      await expect(sharingService.startTunnel('managed')).rejects.toThrow(
        'API key required for managed tunneling'
      );
    });

    it('should set up event listeners for managed tunnel', async () => {
      const mockTunnelData = {
        id: 'test-tunnel-id',
        url: 'https://test.tunnel.corrently.cloud',
        status: 'running'
      };

      mockManagedProvider.createTunnel.mockResolvedValue(mockTunnelData);

      await sharingService.startTunnel('managed');

      expect(mockManagedProvider.on).toHaveBeenCalledWith('tunnel-error', expect.any(Function));
      expect(mockManagedProvider.on).toHaveBeenCalledWith('tunnel-disconnected', expect.any(Function));
      expect(mockManagedProvider.on).toHaveBeenCalledWith('tunnel-stopped', expect.any(Function));
    });
  });

  describe('stopTunnel with managed service', () => {
    it('should stop managed tunnel successfully', async () => {
      sharingService.tunnelService = 'managed';
      sharingService.tunnelStatus = 'running';

      await sharingService.stopTunnel();

      expect(mockManagedProvider.stopTunnel).toHaveBeenCalled();
      expect(sharingService.tunnelStatus).toBe('stopped');
      expect(sharingService.tunnelUrl).toBeNull();
      expect(sharingService.tunnelService).toBeNull();
    });

    it('should handle errors when stopping managed tunnel', async () => {
      sharingService.tunnelService = 'managed';
      sharingService.tunnelStatus = 'running';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockManagedProvider.stopTunnel.mockRejectedValue(new Error('Stop failed'));

      await sharingService.stopTunnel();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error stopping managed tunnel:', expect.any(Error));
      expect(sharingService.tunnelStatus).toBe('stopped');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getTunnelStatus with managed service', () => {
    it('should return managed tunnel status', () => {
      sharingService.tunnelService = 'managed';
      const mockStatus = {
        status: 'running',
        url: 'https://test.tunnel.corrently.cloud',
        service: 'managed',
        id: 'test-tunnel-id'
      };

      mockManagedProvider.getTunnelStatus.mockReturnValue(mockStatus);

      const status = sharingService.getTunnelStatus();

      expect(mockManagedProvider.getTunnelStatus).toHaveBeenCalled();
      expect(status).toBe(mockStatus);
    });

    it('should return default status when managed provider not available', () => {
      sharingService.tunnelService = 'managed';
      sharingService.managedTunnelingProvider = null;
      sharingService.tunnelStatus = 'stopped';
      sharingService.tunnelUrl = null;
      sharingService.tunnelPassword = null;

      const status = sharingService.getTunnelStatus();

      expect(status).toEqual({
        status: 'stopped',
        url: null,
        service: 'managed',
        password: null
      });
    });
  });
});
