const index = require('../../src/index');

describe('Main Index', () => {
  it('should export main modules', () => {
    expect(index).toBeDefined();
    expect(index.ConfigManager).toBeDefined();
    expect(index.ServiceManager).toBeDefined();
    expect(index.VectorStore).toBeDefined();
    expect(index.MemoryVectorStore).toBeDefined();
    expect(index.Indexer).toBeDefined();
    expect(index.FileWatcher).toBeDefined();
    expect(index.ContextOptimizer).toBeDefined();
    expect(index.MCPServer).toBeDefined();
    expect(index.SharingService).toBeDefined();
    expect(index.APIServer).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(index.utils).toBeDefined();
    expect(index.utils.chunking).toBeDefined();
    expect(index.utils.embeddings).toBeDefined();
    expect(index.utils.git).toBeDefined();
    expect(index.utils.llm).toBeDefined();
    expect(index.utils.security).toBeDefined();
    expect(index.utils.tokenizer).toBeDefined();
    expect(index.utils.vision).toBeDefined();
  });

  it('should have correct module types', () => {
    expect(typeof index.ConfigManager).toBe('function');
    expect(typeof index.ServiceManager).toBe('function');
    expect(typeof index.VectorStore).toBe('function');
    expect(typeof index.MemoryVectorStore).toBe('function');
    expect(typeof index.Indexer).toBe('function');
    expect(typeof index.FileWatcher).toBe('function');
    expect(typeof index.ContextOptimizer).toBe('function');
    expect(typeof index.MCPServer).toBe('function');
    expect(typeof index.SharingService).toBe('function');
    expect(typeof index.APIServer).toBe('function');
  });

  it('should have correct utility types', () => {
    expect(typeof index.utils.chunking).toBe('object');
    expect(typeof index.utils.embeddings).toBe('object');
    expect(typeof index.utils.git).toBe('object');
    expect(typeof index.utils.llm).toBe('object');
    expect(typeof index.utils.security).toBe('object');
    expect(typeof index.utils.tokenizer).toBe('object');
    expect(typeof index.utils.vision).toBe('object');
  });

  it('should create instances of core classes', () => {
    const mockConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      port: 3000,
    };

    const configManager = new index.ConfigManager('/test/path');
    expect(configManager).toBeInstanceOf(index.ConfigManager);

    const serviceManager = new index.ServiceManager('/test/path');
    expect(serviceManager).toBeInstanceOf(index.ServiceManager);

    const vectorStore = new index.VectorStore(mockConfig);
    expect(vectorStore).toBeInstanceOf(index.VectorStore);

    const memoryVectorStore = new index.MemoryVectorStore(mockConfig);
    expect(memoryVectorStore).toBeInstanceOf(index.MemoryVectorStore);

    const indexer = new index.Indexer({}, mockConfig);
    expect(indexer).toBeInstanceOf(index.Indexer);

    const fileWatcher = new index.FileWatcher({}, mockConfig);
    expect(fileWatcher).toBeInstanceOf(index.FileWatcher);

    const contextOptimizer = new index.ContextOptimizer(mockConfig);
    expect(contextOptimizer).toBeInstanceOf(index.ContextOptimizer);

    const mcpServer = new index.MCPServer({}, mockConfig);
    expect(mcpServer).toBeInstanceOf(index.MCPServer);

    const sharingService = new index.SharingService({}, mockConfig);
    expect(sharingService).toBeInstanceOf(index.SharingService);

    const apiServer = new index.APIServer({}, mockConfig);
    expect(apiServer).toBeInstanceOf(index.APIServer);
  });
});
