const VectorStore = require('../../src/core/VectorStore');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { getEmbedding } = require('../../src/utils/embeddings');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('@qdrant/js-client-rest');
jest.mock('../../src/utils/embeddings');
jest.mock('uuid');

describe('VectorStore', () => {
    let vectorStore;
    let mockQdrantClient;
    const config = {
        repository: { 
            name: 'test-repo',
            path: '/test/repo/path' 
        },
        services: { 
            qdrantPort: 6333,
            qdrantHost: 'localhost' 
        },
        embedding: { dimensions: 4, provider: 'mock' }
    };

    beforeEach(() => {
        // Mock implementation of QdrantClient
        mockQdrantClient = {
            getCollections: jest.fn(),
            createCollection: jest.fn(),
            createPayloadIndex: jest.fn(),
            upsert: jest.fn(),
            delete: jest.fn(),
            search: jest.fn(),
            getCollection: jest.fn(),
            scroll: jest.fn(),
        };
        QdrantClient.mockImplementation(() => mockQdrantClient);
        
        // Mock other dependencies
        getEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4]);
        uuidv4.mockReturnValue('mock-uuid');

        vectorStore = new VectorStore(config);
        
        // Store the actual collection name for testing
        global.testCollectionName = vectorStore.collectionName;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('ensureCollection', () => {
        it('should create a collection if it does not exist', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [] });

            await vectorStore.ensureCollection();

            expect(mockQdrantClient.getCollections).toHaveBeenCalled();
            expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(
                expect.stringMatching(/^gctx-test-repo-[a-f0-9]{12}$/),
                {
                    vectors: { size: 4, distance: 'Cosine' }
                }
            );
            expect(mockQdrantClient.createPayloadIndex).toHaveBeenCalledWith(
                expect.stringMatching(/^gctx-test-repo-[a-f0-9]{12}$/),
                {
                    field_name: 'filePath',
                    field_schema: 'keyword',
                    wait: true,
                }
            );
        });

        it('should not create a collection if it already exists', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ 
                collections: [{ name: vectorStore.collectionName }] 
            });

            await vectorStore.ensureCollection();

            expect(mockQdrantClient.getCollections).toHaveBeenCalled();
            expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
            expect(mockQdrantClient.createPayloadIndex).not.toHaveBeenCalled();
        });
    });

    describe('upsertChunks', () => {
        it('should upsert chunks correctly', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [] }); // To trigger ensureCollection
            const chunks = [{ content: 'test content', metadata: { filePath: 'test.js' } }];
            
            await vectorStore.upsertChunks(chunks);

            expect(getEmbedding).toHaveBeenCalledWith('test content', config.embedding);
            expect(mockQdrantClient.upsert).toHaveBeenCalledWith(vectorStore.collectionName, {
                points: [{
                    id: 'mock-uuid',
                    vector: [0.1, 0.2, 0.3, 0.4],
                    payload: { filePath: 'test.js', content: 'test content' }
                }],
                wait: true
            });
        });

        it('should not do anything if chunks array is empty', async () => {
            await vectorStore.upsertChunks([]);
            expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
        });
    });

    describe('removeFile', () => {
        it('should delete points for a given file path', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [{ name: 'gctx-test-repo' }] });
            const filePath = 'path/to/file.js';

            await vectorStore.removeFile(filePath);

            expect(mockQdrantClient.delete).toHaveBeenCalledWith(vectorStore.collectionName, {
                filter: {
                    must: [{
                        key: 'filePath',
                        match: { value: filePath }
                    }]
                },
                wait: true,
            });
        });
    });
    
    describe('search', () => {
        it('should perform a search and return results', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [{ name: 'gctx-test-repo' }] });
            const queryVector = [0.4, 0.3, 0.2, 0.1];
            const mockResults = [{ id: 'some-id', score: 0.9, payload: {} }];
            mockQdrantClient.search.mockResolvedValue(mockResults);

            const results = await vectorStore.search(queryVector, 5, { foo: 'bar' });

            expect(mockQdrantClient.search).toHaveBeenCalledWith(vectorStore.collectionName, {
                vector: queryVector,
                limit: 5,
                filter: { foo: 'bar' },
                with_payload: true,
                with_vector: false,
            });
            expect(results).toEqual(mockResults);
        });
    });

    describe('getStatus', () => {
        it('should return status with vector count if collection exists', async () => {
            mockQdrantClient.getCollection.mockResolvedValue({ points_count: 123 });
            
            const status = await vectorStore.getStatus();
            
            expect(status).toEqual({
                collectionName: vectorStore.collectionName,
                vectorCount: 123
            });
        });

        it('should return status with 0 vector count if collection does not exist (404)', async () => {
            mockQdrantClient.getCollection.mockRejectedValue({ status: 404 });

            const status = await vectorStore.getStatus();

            expect(status).toEqual({
                collectionName: vectorStore.collectionName,
                vectorCount: 0
            });
        });
    });

    describe('getUniqueFileCount', () => {
        it('should return the count of unique files', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [{ name: vectorStore.collectionName }] });
            mockQdrantClient.scroll.mockResolvedValue({
                points: [
                    { payload: { filePath: 'a.js' } },
                    { payload: { filePath: 'b.js' } },
                    { payload: { filePath: 'a.js' } }
                ],
                next_page_offset: null
            });
            
            const count = await vectorStore.getUniqueFileCount();
            
            expect(count).toBe(2);
        });

        it('should return 0 if collection does not exist', async () => {
            mockQdrantClient.getCollections.mockResolvedValue({ collections: [] });
            mockQdrantClient.scroll.mockResolvedValue({
                points: [],
                next_page_offset: null
            });
            const count = await vectorStore.getUniqueFileCount();
            expect(count).toBe(0);
        });
    });
});
