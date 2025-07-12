const { getEmbedding } = require('../../src/utils/embeddings');

// Mock the embedding libraries
jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn(),
}));

describe('Embeddings Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getEmbedding', () => {
        it('should handle invalid config', async () => {
            const config = { provider: 'invalid' };
            await expect(getEmbedding('test text', config)).rejects.toThrow();
        });

        it('should handle empty text', async () => {
            const config = { provider: 'local', model: 'test' };
            await expect(getEmbedding('', config)).rejects.toThrow();
        });

        it('should handle null/undefined text', async () => {
            const config = { provider: 'local', model: 'test' };
            await expect(getEmbedding(null, config)).rejects.toThrow();
            await expect(getEmbedding(undefined, config)).rejects.toThrow();
        });

        it('should handle whitespace-only text', async () => {
            const config = { provider: 'local', model: 'test' };
            await expect(getEmbedding('   ', config)).rejects.toThrow();
        });
    });
});
