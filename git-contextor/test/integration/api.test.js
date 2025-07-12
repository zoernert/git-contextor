const request = require('supertest');
const express = require('express');
const { start } = require('../../src/api/server');
const ServiceManager = require('../../src/core/ServiceManager');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('API Endpoints', () => {
    let app;
    let server;
    let serviceManager;
    let tempDir;
    let config;
    
    beforeAll(async () => {
        // Create temporary directory for test
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-api-test-'));
        
        config = {
            repository: {
                path: tempDir,
                name: 'test-repo'
            },
            services: {
                apiKey: 'test-api-key',
                port: 3002,
                qdrantHost: 'localhost',
                qdrantPort: 6334
            },
            monitoring: {
                watchEnabled: true
            },
            indexing: {
                includeExtensions: ['.js', '.py', '.md'],
                excludePatterns: ['**/node_modules/**']
            },
            embedding: {
                dimensions: 384,
                provider: 'transformers'
            },
            chunking: {
                strategy: 'semantic',
                maxTokens: 512
            }
        };

        // Initialize service manager with mocked services
        const mockServices = {
            vectorStore: {
                config: config,
                ensureCollection: jest.fn(),
                search: jest.fn().mockResolvedValue({
                    results: [
                        { payload: { content: 'test content', filePath: 'test.js' }, score: 0.8 }
                    ]
                }),
                getStatus: jest.fn().mockResolvedValue({ vectorCount: 10 }),
                getUniqueFileCount: jest.fn().mockResolvedValue(5)
            },
            indexer: {
                config: config,
                repoPath: tempDir,
                getStatus: jest.fn().mockResolvedValue({
                    status: 'idle',
                    totalFiles: 5,
                    totalChunks: 10,
                    errorCount: 0
                }),
                reindexAll: jest.fn().mockResolvedValue(),
                indexFile: jest.fn().mockResolvedValue(),
                clearIndex: jest.fn().mockResolvedValue()
            },
            fileWatcher: {
                getStatus: jest.fn().mockResolvedValue({
                    isWatching: true,
                    queueSize: 0,
                    recentActivity: []
                }),
                getActivityLog: jest.fn().mockReturnValue([])
            },
            contextOptimizer: {
                config: config,
                optimizeContext: jest.fn().mockResolvedValue({
                    optimizedContext: 'optimized test content',
                    tokenCount: 100
                }),
                search: jest.fn().mockResolvedValue({
                    optimizedContext: 'optimized test content',
                    tokenCount: 100
                })
            }
        };

        serviceManager = new ServiceManager(tempDir, config, mockServices);

        // Start the server
        server = await start(config, serviceManager.services, serviceManager);
    });
    
    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const res = await request(server).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    describe('Authentication', () => {
        it('should reject requests without API key', async () => {
            const res = await request(server).get('/api/status');
            expect(res.statusCode).toBe(401);
        });

        it('should reject requests with invalid API key', async () => {
            const res = await request(server)
                .get('/api/status')
                .set('x-api-key', 'invalid-key');
            expect(res.statusCode).toBe(401);
        });

        it('should accept requests with valid API key', async () => {
            const res = await request(server)
                .get('/api/status')
                .set('x-api-key', 'test-api-key');
            expect(res.statusCode).toBe(200);
        });
    });

    describe('Status Endpoint', () => {
        it('should return repository status', async () => {
            const res = await request(server)
                .get('/api/status')
                .set('x-api-key', 'test-api-key');
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('repository');
            expect(res.body).toHaveProperty('indexer');
            expect(res.body).toHaveProperty('fileWatcher');
            expect(res.body).toHaveProperty('vectorStore');
        });
    });

    describe('Search Endpoint', () => {
        it('should perform search with valid query', async () => {
            const res = await request(server)
                .post('/api/search')
                .set('x-api-key', 'test-api-key')
                .send({
                    query: 'test query',
                    maxTokens: 1000
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('optimizedContext');
            expect(res.body).toHaveProperty('tokenCount');
        });

        it('should validate search parameters', async () => {
            const res = await request(server)
                .post('/api/search')
                .set('x-api-key', 'test-api-key')
                .send({});
            
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Reindex Endpoint', () => {
        it('should trigger reindex', async () => {
            const res = await request(server)
                .post('/api/reindex')
                .set('x-api-key', 'test-api-key')
                .send({});
            
            expect(res.statusCode).toBe(202);
            expect(res.body).toHaveProperty('message');
        });

        it('should handle file-specific reindex', async () => {
            const res = await request(server)
                .post('/api/reindex')
                .set('x-api-key', 'test-api-key')
                .send({ file: 'test.js' });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message');
        });
    });

    describe('Files Endpoint', () => {
        it('should return file tree', async () => {
            const res = await request(server)
                .get('/api/files/tree')
                .set('x-api-key', 'test-api-key');
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return file content', async () => {
            // Create a test file
            const testFile = path.join(tempDir, 'test.js');
            await fs.writeFile(testFile, 'console.log("test");');

            const res = await request(server)
                .get('/api/files/content')
                .query({ path: 'test.js' })
                .set('x-api-key', 'test-api-key');
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('content');
        });
    });

    describe('Metrics Endpoint', () => {
        it('should return metrics', async () => {
            const res = await request(server)
                .get('/api/metrics')
                .set('x-api-key', 'test-api-key');
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('indexer');
            expect(res.body).toHaveProperty('vectorStore');
            expect(res.body).toHaveProperty('system');
        });
    });

    describe('Error Handling', () => {
        it('should handle internal server errors gracefully', async () => {
            // Mock a service to throw an error
            serviceManager.services.indexer.getStatus.mockRejectedValueOnce(new Error('Test error'));

            const res = await request(server)
                .get('/api/status')
                .set('x-api-key', 'test-api-key');
            
            expect(res.statusCode).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
    });
});
