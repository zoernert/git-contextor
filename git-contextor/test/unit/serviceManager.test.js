const ServiceManager = require('../../src/core/ServiceManager');
const ConfigManager = require('../../src/core/ConfigManager');
const Indexer = require('../../src/core/Indexer');
const VectorStore = require('../../src/core/VectorStore');
const FileWatcher = require('../../src/core/FileWatcher');
const MCPServer = require('../../src/core/MCPServer');
const SharingService = require('../../src/core/SharingService');
const APIServer = require('../../src/api/server');
const logger = require('../../src/cli/utils/logger');

// Mock dependencies
jest.mock('../../src/core/ConfigManager');
jest.mock('../../src/core/Indexer');
jest.mock('../../src/core/VectorStore');
jest.mock('../../src/core/FileWatcher');
jest.mock('../../src/core/MCPServer');
jest.mock('../../src/core/SharingService');
jest.mock('../../src/api/server');
jest.mock('../../src/cli/utils/logger');

describe('ServiceManager', () => {
  let serviceManager;
  let mockConfig;
  let mockConfigManager;
  let mockIndexer;
  let mockVectorStore;
  let mockFileWatcher;
  let mockMCPServer;
  let mockSharingService;
  let mockAPIServer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      port: 3000,
      enableMCP: true,
      mcpPort: 3001,
      enableSharing: true,
      enableUI: true,
      indexOnStartup: true,
      watchFiles: true,
    };
    
    mockConfigManager = {
      load: jest.fn(),
      config: mockConfig,
    };
    
    mockIndexer = {
      reindexAll: jest.fn(),
      indexFile: jest.fn(),
    };
    
    mockVectorStore = {
      ensureCollection: jest.fn(),
      search: jest.fn(),
      getStatus: jest.fn(),
    };
    
    mockFileWatcher = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn(),
    };
    
    mockMCPServer = {
      createServer: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    
    mockSharingService = {
      start: jest.fn(),
      stop: jest.fn(),
    };
    
    mockAPIServer = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn(),
    };
    
    ConfigManager.mockImplementation(() => mockConfigManager);
    Indexer.mockImplementation(() => mockIndexer);
    VectorStore.mockImplementation(() => mockVectorStore);
    FileWatcher.mockImplementation(() => mockFileWatcher);
    MCPServer.mockImplementation(() => mockMCPServer);
    SharingService.mockImplementation(() => mockSharingService);
    APIServer.mockImplementation(() => mockAPIServer);
    
    serviceManager = new ServiceManager('/test/path');
  });

  describe('constructor', () => {
    it('should initialize with repository path', () => {
      expect(serviceManager.repoPath).toBe('/test/path');
      expect(serviceManager.services).toEqual({});
      expect(serviceManager.isStarted).toBe(false);
    });

    it('should create service instances', () => {
      expect(ConfigManager).toHaveBeenCalledWith('/test/path');
      expect(serviceManager.configManager).toBe(mockConfigManager);
    });
  });

  describe('initialize', () => {
    it('should initialize all services', async () => {
      await serviceManager.initialize();
      
      expect(mockConfigManager.load).toHaveBeenCalled();
      expect(Indexer).toHaveBeenCalledWith(expect.any(Object), mockConfig);
      expect(VectorStore).toHaveBeenCalledWith(mockConfig);
      expect(FileWatcher).toHaveBeenCalledWith(expect.any(Object), mockConfig);
      expect(MCPServer).toHaveBeenCalledWith(expect.any(Object), mockConfig);
      expect(SharingService).toHaveBeenCalledWith(expect.any(Object), mockConfig);
      expect(APIServer).toHaveBeenCalledWith(expect.any(Object), mockConfig);
      
      expect(serviceManager.services.configManager).toBe(mockConfigManager);
      expect(serviceManager.services.indexer).toBe(mockIndexer);
      expect(serviceManager.services.vectorStore).toBe(mockVectorStore);
      expect(serviceManager.services.fileWatcher).toBe(mockFileWatcher);
      expect(serviceManager.services.mcpServer).toBe(mockMCPServer);
      expect(serviceManager.services.sharingService).toBe(mockSharingService);
      expect(serviceManager.services.server).toBe(mockAPIServer);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockConfigManager.load.mockRejectedValue(error);
      
      await expect(serviceManager.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should start all services in correct order', async () => {
      await serviceManager.start();
      
      expect(mockVectorStore.ensureCollection).toHaveBeenCalled();
      expect(mockIndexer.reindexAll).toHaveBeenCalled();
      expect(mockAPIServer.start).toHaveBeenCalled();
      expect(mockFileWatcher.start).toHaveBeenCalled();
      expect(mockMCPServer.start).toHaveBeenCalled();
      expect(mockSharingService.start).toHaveBeenCalled();
      expect(serviceManager.isStarted).toBe(true);
    });

    it('should skip indexing if indexOnStartup is false', async () => {
      mockConfig.indexOnStartup = false;
      await serviceManager.initialize();
      
      await serviceManager.start();
      
      expect(mockIndexer.reindexAll).not.toHaveBeenCalled();
    });

    it('should skip file watching if watchFiles is false', async () => {
      mockConfig.watchFiles = false;
      await serviceManager.initialize();
      
      await serviceManager.start();
      
      expect(mockFileWatcher.start).not.toHaveBeenCalled();
    });

    it('should skip MCP server if enableMCP is false', async () => {
      mockConfig.enableMCP = false;
      await serviceManager.initialize();
      
      await serviceManager.start();
      
      expect(mockMCPServer.start).not.toHaveBeenCalled();
    });

    it('should skip sharing service if enableSharing is false', async () => {
      mockConfig.enableSharing = false;
      await serviceManager.initialize();
      
      await serviceManager.start();
      
      expect(mockSharingService.start).not.toHaveBeenCalled();
    });

    it('should handle start errors', async () => {
      const error = new Error('Start failed');
      mockAPIServer.start.mockRejectedValue(error);
      
      await expect(serviceManager.start()).rejects.toThrow('Start failed');
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
      await serviceManager.start();
    });

    it('should stop all services', async () => {
      await serviceManager.stop();
      
      expect(mockFileWatcher.stop).toHaveBeenCalled();
      expect(mockMCPServer.stop).toHaveBeenCalled();
      expect(mockSharingService.stop).toHaveBeenCalled();
      expect(mockAPIServer.stop).toHaveBeenCalled();
      expect(serviceManager.isStarted).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      const error = new Error('Stop failed');
      mockAPIServer.stop.mockRejectedValue(error);
      
      await expect(serviceManager.stop()).resolves.not.toThrow();
      expect(serviceManager.isStarted).toBe(false);
    });
  });

  describe('restart', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
      await serviceManager.start();
    });

    it('should restart all services', async () => {
      await serviceManager.restart();
      
      expect(mockFileWatcher.stop).toHaveBeenCalled();
      expect(mockMCPServer.stop).toHaveBeenCalled();
      expect(mockSharingService.stop).toHaveBeenCalled();
      expect(mockAPIServer.stop).toHaveBeenCalled();
      
      expect(mockVectorStore.ensureCollection).toHaveBeenCalled();
      expect(mockAPIServer.start).toHaveBeenCalled();
      expect(mockFileWatcher.start).toHaveBeenCalled();
      expect(mockMCPServer.start).toHaveBeenCalled();
      expect(mockSharingService.start).toHaveBeenCalled();
      
      expect(serviceManager.isStarted).toBe(true);
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should return service status', async () => {
      mockVectorStore.getStatus.mockResolvedValue({
        vectorCount: 100,
        status: 'ready',
      });
      
      mockFileWatcher.getStatus.mockReturnValue({
        watching: true,
        files: ['test.js'],
      });
      
      mockAPIServer.getStatus.mockReturnValue({
        running: true,
        port: 3000,
      });
      
      const status = await serviceManager.getStatus();
      
      expect(status).toEqual({
        isStarted: false,
        vectorStore: {
          vectorCount: 100,
          status: 'ready',
        },
        fileWatcher: {
          watching: true,
          files: ['test.js'],
        },
        server: {
          running: true,
          port: 3000,
        },
      });
    });

    it('should handle status errors', async () => {
      mockVectorStore.getStatus.mockRejectedValue(new Error('Status failed'));
      
      const status = await serviceManager.getStatus();
      
      expect(status.vectorStore).toEqual({ error: 'Status failed' });
    });
  });

  describe('getService', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should return requested service', () => {
      const service = serviceManager.getService('indexer');
      expect(service).toBe(mockIndexer);
    });

    it('should return null for unknown service', () => {
      const service = serviceManager.getService('unknown');
      expect(service).toBeNull();
    });
  });

  describe('updateConfig', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = { port: 4000 };
      mockConfigManager.update = jest.fn();
      
      await serviceManager.updateConfig(newConfig);
      
      expect(mockConfigManager.update).toHaveBeenCalledWith(newConfig);
    });

    it('should handle config update errors', async () => {
      const error = new Error('Update failed');
      mockConfigManager.update = jest.fn().mockRejectedValue(error);
      
      await expect(serviceManager.updateConfig({})).rejects.toThrow('Update failed');
    });
  });

  describe('reindex', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should reindex all files', async () => {
      await serviceManager.reindex();
      
      expect(mockIndexer.reindexAll).toHaveBeenCalled();
    });

    it('should reindex specific file', async () => {
      await serviceManager.reindex('test.js');
      
      expect(mockIndexer.indexFile).toHaveBeenCalledWith('test.js');
    });

    it('should handle reindex errors', async () => {
      const error = new Error('Reindex failed');
      mockIndexer.reindexAll.mockRejectedValue(error);
      
      await expect(serviceManager.reindex()).rejects.toThrow('Reindex failed');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should search vector store', async () => {
      const results = [{ content: 'test', score: 0.9 }];
      mockVectorStore.search.mockResolvedValue(results);
      
      const searchResults = await serviceManager.search('test query', 5);
      
      expect(mockVectorStore.search).toHaveBeenCalledWith('test query', 5);
      expect(searchResults).toBe(results);
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockVectorStore.search.mockRejectedValue(error);
      
      await expect(serviceManager.search('test query')).rejects.toThrow('Search failed');
    });
  });
});
