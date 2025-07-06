const Indexer = require('../../src/core/Indexer');
const { chunkFile } = require('../../src/utils/chunking');
const { listGitFiles } = require('../../src/utils/git');
const path = require('path');

jest.mock('../../src/utils/chunking');
jest.mock('../../src/utils/git');
jest.mock('../../src/cli/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));


describe('Indexer', () => {
    let indexer;
    let mockVectorStore;
    const repoPath = '/test/repo';
    const config = {
        chunking: { strategy: 'function' },
        indexing: { 
            includeExtensions: ['.js', '.py'],
            excludePatterns: ['*excluded*', 'dist/**'] 
        },
        performance: { batchSize: 10 }
    };

    beforeEach(() => {
        mockVectorStore = {
            upsertChunks: jest.fn(),
            removeFile: jest.fn(),
            clearCollection: jest.fn(),
            getStatus: jest.fn().mockResolvedValue({ vectorCount: 0 }),
            getUniqueFileCount: jest.fn().mockResolvedValue(0),
        };
        indexer = new Indexer(repoPath, mockVectorStore, config);
        chunkFile.mockClear();
        listGitFiles.mockClear();
    });

    describe('indexFile', () => {
        it('should chunk a file and upsert the chunks', async () => {
            const chunks = [{ content: 'chunk1' }, { content: 'chunk2' }];
            chunkFile.mockResolvedValue(chunks);

            await indexer.indexFile(path.join(repoPath, 'file.js'));

            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file.js'), repoPath, config.chunking);
            expect(mockVectorStore.upsertChunks).toHaveBeenCalledWith(chunks);
            expect(indexer.totalChunks).toBe(2);
        });
    });

    describe('reindexAll', () => {
        it('should clear collection and index filtered git-tracked files', async () => {
            listGitFiles.mockResolvedValue(['file1.js', 'file2.py', 'dist/ignore.js', 'file.ts', 'file.excluded.js']);
            chunkFile.mockResolvedValue([{ content: 'chunk' }]);

            await indexer.reindexAll();

            expect(mockVectorStore.clearCollection).toHaveBeenCalled();
            expect(listGitFiles).toHaveBeenCalledWith(repoPath);
            // Should be called for file1.js and file2.py, but not for others
            expect(chunkFile).toHaveBeenCalledTimes(2); 
            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file1.js'), repoPath, config.chunking);
            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file2.py'), repoPath, config.chunking);
            expect(mockVectorStore.upsertChunks).toHaveBeenCalledTimes(2);
            expect(indexer.totalFiles).toBe(2);
        });
    });
});
