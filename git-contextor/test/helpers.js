// Test helpers for mocking services and common test utilities

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Creates a temporary git repository for testing
 * @param {string} prefix - Prefix for the temporary directory name
 * @returns {Promise<string>} Path to the temporary repository
 */
async function createTempGitRepo(prefix = 'git-contextor-test-') {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    
    // Initialize git repo
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    
    return tempDir;
}

/**
 * Creates mock services for testing
 * @param {Object} overrides - Override default mock implementations
 * @returns {Object} Mock services object
 */
function createMockServices(overrides = {}) {
    const defaultMocks = {
        vectorStore: {
            ensureCollection: jest.fn(),
            upsertChunks: jest.fn(),
            removeFile: jest.fn(),
            clearCollection: jest.fn(),
            search: jest.fn().mockResolvedValue({
                results: [
                    { payload: { content: 'test content', filePath: 'test.js' }, score: 0.8 }
                ]
            }),
            getStatus: jest.fn().mockResolvedValue({ vectorCount: 10 }),
            getUniqueFileCount: jest.fn().mockResolvedValue(5),
            validateCollectionConfig: jest.fn().mockResolvedValue(true)
        },
        indexer: {
            indexFile: jest.fn().mockResolvedValue(true),
            removeFile: jest.fn(),
            reindexAll: jest.fn(),
            getStatus: jest.fn().mockResolvedValue({
                status: 'idle',
                totalFiles: 5,
                totalChunks: 10,
                errorCount: 0,
                lastActivity: new Date().toISOString()
            }),
            totalFiles: 5,
            totalChunks: 10,
            errorCount: 0,
            status: 'idle'
        },
        fileWatcher: {
            start: jest.fn(),
            stop: jest.fn(),
            getStatus: jest.fn().mockResolvedValue({
                isWatching: true,
                queueSize: 0,
                recentActivity: []
            })
        },
        contextOptimizer: {
            optimizeContext: jest.fn().mockResolvedValue({
                optimizedContext: 'optimized test content',
                tokenCount: 100,
                chunkCount: 1
            })
        },
        sharingService: {
            createShare: jest.fn(),
            getShare: jest.fn(),
            updateShare: jest.fn(),
            deleteShare: jest.fn(),
            getAndValidateShareByApiKey: jest.fn()
        }
    };

    return {
        ...defaultMocks,
        ...overrides
    };
}

/**
 * Creates a mock config object for testing
 * @param {Object} overrides - Override default config values
 * @returns {Object} Mock config object
 */
function createMockConfig(overrides = {}) {
    const defaultConfig = {
        repository: {
            name: 'test-repo',
            path: '/test/repo/path'
        },
        services: {
            apiKey: 'test-api-key',
            port: 3001,
            qdrantHost: 'localhost',
            qdrantPort: 6334
        },
        indexing: {
            includeExtensions: ['.js', '.py', '.md'],
            excludePatterns: ['**/node_modules/**', '**/dist/**']
        },
        embedding: {
            dimensions: 384,
            provider: 'transformers'
        },
        chunking: {
            strategy: 'semantic',
            maxTokens: 512
        },
        performance: {
            batchSize: 10
        }
    };

    return {
        ...defaultConfig,
        ...overrides
    };
}

/**
 * Waits for a condition to be met with timeout
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<void>}
 */
async function waitForCondition(condition, timeout = 10000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Cleans up temporary directories
 * @param {string[]} dirs - Array of directory paths to clean up
 */
async function cleanup(dirs) {
    for (const dir of dirs) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch (error) {
            console.warn(`Failed to cleanup directory ${dir}:`, error.message);
        }
    }
}

/**
 * Creates test files in a directory
 * @param {string} dir - Directory to create files in
 * @param {Object} files - Object with filename as key and content as value
 */
async function createTestFiles(dir, files) {
    for (const [filename, content] of Object.entries(files)) {
        const filePath = path.join(dir, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content);
    }
}

module.exports = {
    createTempGitRepo,
    createMockServices,
    createMockConfig,
    waitForCondition,
    cleanup,
    createTestFiles
};
