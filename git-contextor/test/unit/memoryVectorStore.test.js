const MemoryVectorStore = require('../../src/core/MemoryVectorStore');
const logger = require('../../src/cli/utils/logger');

// Mock dependencies
jest.mock('../../src/cli/utils/logger');

describe('MemoryVectorStore', () => {
  let memoryVectorStore;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      vectorModel: 'text-embedding-ada-002',
      maxResults: 10,
      collection: 'test-collection',
    };
    
    memoryVectorStore = new MemoryVectorStore(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(memoryVectorStore.config).toBe(mockConfig);
      expect(memoryVectorStore.vectors).toEqual([]);
      expect(memoryVectorStore.collectionName).toBe('test-collection');
    });

    it('should use default collection name if not provided', () => {
      const configWithoutCollection = { ...mockConfig };
      delete configWithoutCollection.collection;
      
      const store = new MemoryVectorStore(configWithoutCollection);
      expect(store.collectionName).toBe('default-collection');
    });
  });

  describe('ensureCollection', () => {
    it('should return true for collection existence', async () => {
      const result = await memoryVectorStore.ensureCollection();
      expect(result).toBe(true);
    });
  });

  describe('upsertChunks', () => {
    it('should add chunks to memory store', async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Test content 2',
          filePath: 'test2.js',
          vector: [0.4, 0.5, 0.6],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
      
      expect(memoryVectorStore.vectors).toHaveLength(2);
      expect(memoryVectorStore.vectors[0]).toEqual(chunks[0]);
      expect(memoryVectorStore.vectors[1]).toEqual(chunks[1]);
    });

    it('should update existing chunks', async () => {
      const initialChunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
      ];
      
      const updatedChunks = [
        {
          id: 'chunk1',
          content: 'Updated content 1',
          filePath: 'test1.js',
          vector: [0.7, 0.8, 0.9],
        },
      ];
      
      await memoryVectorStore.upsertChunks(initialChunks);
      await memoryVectorStore.upsertChunks(updatedChunks);
      
      expect(memoryVectorStore.vectors).toHaveLength(1);
      expect(memoryVectorStore.vectors[0].content).toBe('Updated content 1');
      expect(memoryVectorStore.vectors[0].vector).toEqual([0.7, 0.8, 0.9]);
    });

    it('should handle empty chunks array', async () => {
      await memoryVectorStore.upsertChunks([]);
      
      expect(memoryVectorStore.vectors).toHaveLength(0);
    });
  });

  describe('removeFile', () => {
    beforeEach(async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Test content 2',
          filePath: 'test2.js',
          vector: [0.4, 0.5, 0.6],
        },
        {
          id: 'chunk3',
          content: 'Test content 3',
          filePath: 'test1.js',
          vector: [0.7, 0.8, 0.9],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
    });

    it('should remove chunks for specific file', async () => {
      await memoryVectorStore.removeFile('test1.js');
      
      expect(memoryVectorStore.vectors).toHaveLength(1);
      expect(memoryVectorStore.vectors[0].filePath).toBe('test2.js');
    });

    it('should handle non-existent file', async () => {
      await memoryVectorStore.removeFile('nonexistent.js');
      
      expect(memoryVectorStore.vectors).toHaveLength(3);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'JavaScript function implementation',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Python class definition',
          filePath: 'test2.py',
          vector: [0.4, 0.5, 0.6],
        },
        {
          id: 'chunk3',
          content: 'Node.js module export',
          filePath: 'test3.js',
          vector: [0.7, 0.8, 0.9],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
    });

    it('should perform basic text search', async () => {
      const results = await memoryVectorStore.search('JavaScript', 5);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('JavaScript function implementation');
      expect(results[0].filePath).toBe('test1.js');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should limit results by maxResults', async () => {
      const results = await memoryVectorStore.search('test', 2);
      
      expect(results).toHaveLength(2);
    });

    it('should return empty results for no matches', async () => {
      const results = await memoryVectorStore.search('nonexistent', 5);
      
      expect(results).toHaveLength(0);
    });

    it('should handle empty vector store', async () => {
      const emptyStore = new MemoryVectorStore(mockConfig);
      const results = await emptyStore.search('test', 5);
      
      expect(results).toHaveLength(0);
    });

    it('should search case-insensitive', async () => {
      const results = await memoryVectorStore.search('javascript', 5);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('JavaScript function implementation');
    });
  });

  describe('getStatus', () => {
    it('should return status with vector count', async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Test content 2',
          filePath: 'test2.js',
          vector: [0.4, 0.5, 0.6],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
      
      const status = await memoryVectorStore.getStatus();
      
      expect(status).toEqual({
        status: 'ready',
        vectorCount: 2,
        collection: 'test-collection',
      });
    });

    it('should return zero count for empty store', async () => {
      const status = await memoryVectorStore.getStatus();
      
      expect(status).toEqual({
        status: 'ready',
        vectorCount: 0,
        collection: 'test-collection',
      });
    });
  });

  describe('getUniqueFileCount', () => {
    it('should return unique file count', async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Test content 2',
          filePath: 'test2.js',
          vector: [0.4, 0.5, 0.6],
        },
        {
          id: 'chunk3',
          content: 'Test content 3',
          filePath: 'test1.js',
          vector: [0.7, 0.8, 0.9],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
      
      const count = await memoryVectorStore.getUniqueFileCount();
      
      expect(count).toBe(2);
    });

    it('should return zero for empty store', async () => {
      const count = await memoryVectorStore.getUniqueFileCount();
      
      expect(count).toBe(0);
    });
  });

  describe('clearCollection', () => {
    it('should clear all vectors', async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Test content 1',
          filePath: 'test1.js',
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk2',
          content: 'Test content 2',
          filePath: 'test2.js',
          vector: [0.4, 0.5, 0.6],
        },
      ];
      
      await memoryVectorStore.upsertChunks(chunks);
      expect(memoryVectorStore.vectors).toHaveLength(2);
      
      await memoryVectorStore.clearCollection();
      
      expect(memoryVectorStore.vectors).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should calculate cosine similarity', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const vec3 = [1, 0, 0];
      
      const similarity1 = memoryVectorStore._cosineSimilarity(vec1, vec2);
      const similarity2 = memoryVectorStore._cosineSimilarity(vec1, vec3);
      
      expect(similarity1).toBeCloseTo(0);
      expect(similarity2).toBeCloseTo(1);
    });

    it('should handle zero vectors in cosine similarity', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 0, 0];
      
      const similarity = memoryVectorStore._cosineSimilarity(vec1, vec2);
      
      expect(similarity).toBe(0);
    });

    it('should calculate text similarity', () => {
      const text1 = 'JavaScript function implementation';
      const text2 = 'JavaScript class definition';
      const text3 = 'Python module export';
      
      const similarity1 = memoryVectorStore._textSimilarity(text1, text2);
      const similarity2 = memoryVectorStore._textSimilarity(text1, text3);
      
      expect(similarity1).toBeGreaterThan(similarity2);
    });
  });
});
