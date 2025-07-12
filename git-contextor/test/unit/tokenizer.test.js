const { countTokens, truncateToTokens } = require('../../src/utils/tokenizer');

describe('Tokenizer Utils', () => {
    describe('countTokens', () => {
        it('should count tokens in simple text', () => {
            const text = 'Hello world';
            const count = countTokens(text);
            expect(count).toBeGreaterThan(0);
            expect(typeof count).toBe('number');
        });

        it('should handle empty text', () => {
            const count = countTokens('');
            expect(count).toBe(0);
        });

        it('should handle null/undefined text', () => {
            expect(countTokens(null)).toBe(0);
            expect(countTokens(undefined)).toBe(0);
        });
    });

    describe('truncateToTokens', () => {
        it('should truncate text to token limit', () => {
            const text = 'This is a test sentence with several words.';
            const truncated = truncateToTokens(text, 5);
            expect(typeof truncated).toBe('string');
            expect(truncated.length).toBeLessThanOrEqual(text.length);
        });

        it('should handle empty text', () => {
            const truncated = truncateToTokens('', 10);
            expect(truncated).toBe('');
        });

        it('should return original text if under limit', () => {
            const text = 'Short text';
            const truncated = truncateToTokens(text, 100);
            expect(truncated).toBe(text);
        });
    });
});
