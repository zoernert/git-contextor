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

            const result = await indexer.indexFile(path.join(repoPath, 'file.js'));

            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file.js'), repoPath, config.chunking);
            expect(mockVectorStore.upsertChunks).toHaveBeenCalledWith(chunks);
            expect(result).toBe(true);
            expect(indexer.status).toBe('completed');
        });
    });

    describe('reindexAll', () => {
        it('should clear collection and index filtered git-tracked files', async () => {
            listGitFiles.mockResolvedValue(['file1.js', 'file2.py', 'dist/ignore.js', 'file.ts', 'file.excluded.js']);
            chunkFile.mockResolvedValue([{ content: 'chunk' }]);
            
            // Set up the indexer to think it's in a git repo
            indexer.isGitRepo = true;

            await indexer.reindexAll();

            expect(mockVectorStore.clearCollection).toHaveBeenCalled();
            expect(listGitFiles).toHaveBeenCalledWith(repoPath);
            // Should be called for file1.js, file2.py, and file.ts (3 files)
            expect(chunkFile).toHaveBeenCalledTimes(3); 
            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file1.js'), repoPath, config.chunking);
            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file2.py'), repoPath, config.chunking);
            expect(chunkFile).toHaveBeenCalledWith(path.join(repoPath, 'file.ts'), repoPath, config.chunking);
            expect(mockVectorStore.upsertChunks).toHaveBeenCalledTimes(3);
            expect(indexer.totalFiles).toBe(3);
        });
    });
});
