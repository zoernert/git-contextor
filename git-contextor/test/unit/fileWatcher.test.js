const FileWatcher = require('../../src/core/FileWatcher');
const chokidar = require('chokidar');
const path = require('path');

// Mock dependencies
jest.mock('chokidar');
jest.mock('../../src/cli/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

describe('FileWatcher', () => {
    let fileWatcher;
    let mockIndexer;
    let mockWatcher;
    const repoPath = '/test/repo';
    const config = {
        indexing: {
            includeExtensions: ['.js', '.py'],
            excludePatterns: ['**/node_modules/**', '**/dist/**']
        }
    };

    beforeEach(() => {
        mockIndexer = {
            indexFile: jest.fn(),
            removeFile: jest.fn(),
        };

        mockWatcher = {
            on: jest.fn().mockReturnThis(),
            close: jest.fn(),
            add: jest.fn(),
            unwatch: jest.fn(),
        };

        chokidar.watch.mockReturnValue(mockWatcher);
        fileWatcher = new FileWatcher(repoPath, mockIndexer, config);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('start', () => {
        it('should start watching files', () => {
            fileWatcher.start();

            expect(chokidar.watch).toHaveBeenCalledWith(repoPath, {
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/.gitcontextor/**'
                ],
                persistent: true,
                ignoreInitial: true,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100
                }
            });

            expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
            expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
            expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
        });
    });

    describe('stop', () => {
        it('should stop watching files', async () => {
            fileWatcher.watcher = mockWatcher;

            await fileWatcher.stop();

            expect(mockWatcher.close).toHaveBeenCalled();
            expect(fileWatcher.watcher).toBe(null);
        });
    });

    describe('handleFileChange', () => {
        beforeEach(() => {
            fileWatcher.start();
        });

        it('should handle file addition', () => {
            const filePath = path.join(repoPath, 'test.js');
            
            fileWatcher.handleFileChange('add', filePath);

            expect(fileWatcher.processingQueue).toHaveLength(1);
            expect(fileWatcher.processingQueue[0]).toEqual({
                action: 'add',
                filePath: filePath
            });
        });

        it('should handle file change', () => {
            const filePath = path.join(repoPath, 'test.js');
            
            fileWatcher.handleFileChange('change', filePath);

            expect(fileWatcher.processingQueue).toHaveLength(1);
            expect(fileWatcher.processingQueue[0]).toEqual({
                action: 'change',
                filePath: filePath
            });
        });

        it('should handle file deletion', () => {
            const filePath = path.join(repoPath, 'test.js');
            
            fileWatcher.handleFileChange('unlink', filePath);

            expect(fileWatcher.processingQueue).toHaveLength(1);
            expect(fileWatcher.processingQueue[0]).toEqual({
                action: 'unlink',
                filePath: filePath
            });
        });

        it('should ignore files with excluded extensions', () => {
            const filePath = path.join(repoPath, 'test.txt');
            
            fileWatcher.handleFileChange('add', filePath);

            expect(fileWatcher.processingQueue).toHaveLength(0);
        });
    });

    describe('processQueue', () => {
        it('should process file indexing', async () => {
            const filePath = path.join(repoPath, 'test.js');
            fileWatcher.processingQueue = [{
                action: 'add',
                filePath: filePath
            }];

            await fileWatcher.processQueue();

            expect(mockIndexer.indexFile).toHaveBeenCalledWith(filePath);
            expect(fileWatcher.processingQueue).toHaveLength(0);
        });

        it('should process file removal', async () => {
            const filePath = path.join(repoPath, 'test.js');
            fileWatcher.processingQueue = [{
                action: 'unlink',
                filePath: filePath
            }];

            await fileWatcher.processQueue();

            expect(mockIndexer.removeFile).toHaveBeenCalledWith(filePath);
            expect(fileWatcher.processingQueue).toHaveLength(0);
        });
    });

    describe('getStatus', () => {
        it('should return watcher status', () => {
            fileWatcher.watcher = mockWatcher;
            
            const status = fileWatcher.getStatus();

            expect(status).toEqual({
                isWatching: true,
                queueSize: 0,
                recentActivity: []
            });
        });
    });
});