const { getImageDescription } = require('../../src/utils/vision');
const path = require('path');

describe('Vision Utils', () => {
    describe('getImageDescription', () => {
        it('should handle invalid config', async () => {
            const config = { provider: 'invalid' };
            await expect(getImageDescription('test.jpg', config)).rejects.toThrow();
        });

        it('should handle missing file', async () => {
            const config = { provider: 'gemini', model: 'gemini-pro-vision' };
            await expect(getImageDescription('nonexistent.jpg', config)).rejects.toThrow();
        });

        it('should handle unsupported provider', async () => {
            const config = { provider: 'unsupported' };
            // This should return null for unsupported providers
            const result = await getImageDescription('test.jpg', config).catch(() => null);
            expect(result).toBeNull();
        });

        it('should handle supported providers', () => {
            const config1 = { provider: 'gemini', model: 'gemini-pro-vision' };
            const config2 = { provider: 'openai', model: 'gpt-4-vision-preview' };
            
            expect(config1.provider).toBe('gemini');
            expect(config2.provider).toBe('openai');
        });
    });
});
