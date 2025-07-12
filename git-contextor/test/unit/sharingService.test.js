const SharingService = require('../../src/core/SharingService');
const logger = require('../../src/cli/utils/logger');

// Mock dependencies
jest.mock('../../src/cli/utils/logger');
jest.mock('crypto');

const crypto = require('crypto');

describe('SharingService', () => {
  let sharingService;
  let mockServices;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServices = {
      vectorStore: {
        search: jest.fn(),
      },
      configManager: {
        config: {
          enableSharing: true,
          shareExpirationHours: 24,
        },
      },
    };
    
    mockConfig = {
      enableSharing: true,
      shareExpirationHours: 24,
      maxShares: 100,
      shareCleanupInterval: 3600000, // 1 hour
      tunneling: {
        provider: 'localtunnel',
        managed: {
          apiUrl: 'https://tunnel.corrently.cloud',
          apiKey: null,
          subdomain: null,
          gitContextorShare: true
        }
      }
    };
    
    // Mock crypto.randomUUID
    crypto.randomUUID = jest.fn().mockReturnValue('test-uuid-123');
    
    sharingService = new SharingService('/tmp/test-repo', mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with repoPath and config', () => {
      expect(sharingService.repoPath).toBe('/tmp/test-repo');
      expect(sharingService.config).toBe(mockConfig);
      expect(sharingService.shareStore).toEqual(new Map());
      expect(sharingService.tunnelStatus).toBe('stopped');
      expect(sharingService.managedTunnelingProvider).toBeNull();
    });
  });

  describe('start', () => {
    it('should start cleanup interval', () => {
      jest.spyOn(global, 'setInterval');
      
      sharingService.start();
      
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig.shareCleanupInterval
      );
      expect(sharingService.cleanupInterval).not.toBeNull();
    });

    it('should not start if sharing is disabled', () => {
      mockConfig.enableSharing = false;
      sharingService = new SharingService(mockServices, mockConfig);
      
      jest.spyOn(global, 'setInterval');
      
      sharingService.start();
      
      expect(setInterval).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop cleanup interval', () => {
      jest.spyOn(global, 'clearInterval');
      
      sharingService.start();
      sharingService.stop();
      
      expect(clearInterval).toHaveBeenCalledWith(sharingService.cleanupInterval);
      expect(sharingService.cleanupInterval).toBeNull();
    });

    it('should handle stop when not started', () => {
      jest.spyOn(global, 'clearInterval');
      
      sharingService.stop();
      
      expect(clearInterval).not.toHaveBeenCalled();
    });
  });

  describe('createShare', () => {
    beforeEach(() => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
    });

    it('should create a new share', async () => {
      const result = await sharingService.createShare('test query', { maxResults: 5 });
      
      expect(result).toEqual({
        id: 'test-uuid-123',
        url: expect.stringContaining('test-uuid-123'),
        expiresAt: expect.any(Date),
      });
      
      expect(mockServices.vectorStore.search).toHaveBeenCalledWith('test query', 5);
      expect(sharingService.shares['test-uuid-123']).toBeDefined();
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockServices.vectorStore.search.mockRejectedValue(error);
      
      await expect(sharingService.createShare('test query')).rejects.toThrow('Search failed');
    });

    it('should limit number of shares', async () => {
      // Fill up to max shares
      for (let i = 0; i < mockConfig.maxShares; i++) {
        crypto.randomUUID.mockReturnValue(`test-uuid-${i}`);
        await sharingService.createShare('test query');
      }
      
      crypto.randomUUID.mockReturnValue('test-uuid-overflow');
      
      await expect(sharingService.createShare('test query')).rejects.toThrow('Maximum number of shares reached');
    });

    it('should use default options', async () => {
      await sharingService.createShare('test query');
      
      expect(mockServices.vectorStore.search).toHaveBeenCalledWith('test query', 10);
    });
  });

  describe('getShare', () => {
    beforeEach(async () => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
      
      await sharingService.createShare('test query');
    });

    it('should return existing share', async () => {
      const share = await sharingService.getShare('test-uuid-123');
      
      expect(share).toBeDefined();
      expect(share.query).toBe('test query');
      expect(share.results).toHaveLength(1);
    });

    it('should return null for non-existent share', async () => {
      const share = await sharingService.getShare('non-existent-id');
      
      expect(share).toBeNull();
    });

    it('should return null for expired share', async () => {
      // Make share expired
      const share = sharingService.shares['test-uuid-123'];
      share.expiresAt = new Date(Date.now() - 1000);
      
      const result = await sharingService.getShare('test-uuid-123');
      
      expect(result).toBeNull();
    });
  });

  describe('deleteShare', () => {
    beforeEach(async () => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
      
      await sharingService.createShare('test query');
    });

    it('should delete existing share', async () => {
      const result = await sharingService.deleteShare('test-uuid-123');
      
      expect(result).toBe(true);
      expect(sharingService.shares['test-uuid-123']).toBeUndefined();
    });

    it('should return false for non-existent share', async () => {
      const result = await sharingService.deleteShare('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('listShares', () => {
    beforeEach(async () => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-1');
      await sharingService.createShare('test query 1');
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-2');
      await sharingService.createShare('test query 2');
    });

    it('should list all shares', async () => {
      const shares = await sharingService.listShares();
      
      expect(shares).toHaveLength(2);
      expect(shares[0]).toEqual({
        id: 'test-uuid-1',
        query: 'test query 1',
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        resultCount: 1,
      });
      expect(shares[1]).toEqual({
        id: 'test-uuid-2',
        query: 'test query 2',
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        resultCount: 1,
      });
    });

    it('should return empty array when no shares', async () => {
      const emptyService = new SharingService(mockServices, mockConfig);
      const shares = await emptyService.listShares();
      
      expect(shares).toEqual([]);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-1');
      await sharingService.createShare('test query 1');
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-2');
      await sharingService.createShare('test query 2');
      
      // Make one share expired
      sharingService.shares['test-uuid-2'].expiresAt = new Date(Date.now() - 1000);
    });

    it('should return sharing statistics', async () => {
      const stats = await sharingService.getStats();
      
      expect(stats).toEqual({
        totalShares: 2,
        activeShares: 1,
        expiredShares: 1,
        maxShares: mockConfig.maxShares,
        expirationHours: mockConfig.shareExpirationHours,
      });
    });
  });

  describe('cleanupExpiredShares', () => {
    beforeEach(async () => {
      mockServices.vectorStore.search.mockResolvedValue([
        { content: 'test content', score: 0.9, filePath: 'test.js' },
      ]);
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-1');
      await sharingService.createShare('test query 1');
      
      crypto.randomUUID.mockReturnValueOnce('test-uuid-2');
      await sharingService.createShare('test query 2');
      
      // Make one share expired
      sharingService.shares['test-uuid-2'].expiresAt = new Date(Date.now() - 1000);
    });

    it('should clean up expired shares', async () => {
      const cleanedCount = await sharingService.cleanupExpiredShares();
      
      expect(cleanedCount).toBe(1);
      expect(sharingService.shares['test-uuid-1']).toBeDefined();
      expect(sharingService.shares['test-uuid-2']).toBeUndefined();
    });

    it('should return zero when no expired shares', async () => {
      // Remove the expired share manually
      delete sharingService.shares['test-uuid-2'];
      
      const cleanedCount = await sharingService.cleanupExpiredShares();
      
      expect(cleanedCount).toBe(0);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired shares', () => {
      const expiredDate = new Date(Date.now() - 1000);
      const result = sharingService.isExpired(expiredDate);
      
      expect(result).toBe(true);
    });

    it('should return false for non-expired shares', () => {
      const futureDate = new Date(Date.now() + 1000);
      const result = sharingService.isExpired(futureDate);
      
      expect(result).toBe(false);
    });
  });

  describe('generateUrl', () => {
    it('should generate share URL', () => {
      const url = sharingService.generateUrl('test-share-id');
      
      expect(url).toBe('/share/test-share-id');
    });
  });

  describe('validateQuery', () => {
    it('should validate non-empty query', () => {
      const result = sharingService.validateQuery('test query');
      
      expect(result).toBe(true);
    });

    it('should reject empty query', () => {
      const result = sharingService.validateQuery('');
      
      expect(result).toBe(false);
    });

    it('should reject whitespace-only query', () => {
      const result = sharingService.validateQuery('   ');
      
      expect(result).toBe(false);
    });

    it('should reject null/undefined query', () => {
      expect(sharingService.validateQuery(null)).toBe(false);
      expect(sharingService.validateQuery(undefined)).toBe(false);
    });
  });
});
