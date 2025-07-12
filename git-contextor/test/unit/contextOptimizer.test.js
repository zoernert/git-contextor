const ContextOptimizer = require('../../src/core/ContextOptimizer');

describe('ContextOptimizer', () => {
    let contextOptimizer;
    let mockConfig;
    
    beforeEach(() => {
        mockConfig = {
            chunking: {
                maxTokens: 100
            },
            optimization: {
                clustering: {
                    enabled: true,
                    threshold: 0.8
                }
            }
        };
        contextOptimizer = new ContextOptimizer(null, mockConfig);
    });

    describe('optimizeContext', () => {
        it('should optimize context with search results', async () => {
            const searchResults = [
                { payload: { content: 'function greet(name) { console.log("Hello " + name); }', filePath: 'greet.js' }, score: 0.9 },
                { payload: { content: 'function calculate(a, b) { return a + b; }', filePath: 'calc.js' }, score: 0.8 },
                { payload: { content: 'const PI = 3.14159;', filePath: 'constants.js' }, score: 0.7 }
            ];

            const result = await contextOptimizer.optimizeContext(searchResults, 'greet function', 200);

            expect(result).toHaveProperty('optimizedContext');
            expect(result).toHaveProperty('tokenCount');
            expect(result).toHaveProperty('chunkCount');
            expect(result.optimizedContext).toContain('greet.js');
            expect(result.chunkCount).toBe(3);
        });

        it('should limit context by token count', async () => {
            const searchResults = [
                { payload: { content: 'Very long content that should be truncated when the token limit is reached. This is a lot of text that exceeds the token limit.', filePath: 'long.js' }, score: 0.9 },
                { payload: { content: 'Another piece of content', filePath: 'short.js' }, score: 0.8 }
            ];

            const result = await contextOptimizer.optimizeContext(searchResults, 'test query', 50);

            expect(result.tokenCount).toBeLessThanOrEqual(50);
            expect(result.optimizedContext).toContain('long.js');
        });

        it('should handle empty search results', async () => {
            const result = await contextOptimizer.optimizeContext([], 'test query', 200);

            expect(result.optimizedContext).toBe('');
            expect(result.tokenCount).toBe(0);
            expect(result.chunkCount).toBe(0);
        });

        it('should prioritize higher scoring results', async () => {
            const searchResults = [
                { payload: { content: 'Low priority content', filePath: 'low.js' }, score: 0.3 },
                { payload: { content: 'High priority content', filePath: 'high.js' }, score: 0.9 },
                { payload: { content: 'Medium priority content', filePath: 'medium.js' }, score: 0.6 }
            ];

            const result = await contextOptimizer.optimizeContext(searchResults, 'test query', 200);

            // High priority should appear first
            const highIndex = result.optimizedContext.indexOf('high.js');
            const mediumIndex = result.optimizedContext.indexOf('medium.js');
            const lowIndex = result.optimizedContext.indexOf('low.js');

            expect(highIndex).toBeLessThan(mediumIndex);
            expect(mediumIndex).toBeLessThan(lowIndex);
        });

        it('should handle duplicate content', async () => {
            const searchResults = [
                { payload: { content: 'function test() { return true; }', filePath: 'test1.js' }, score: 0.9 },
                { payload: { content: 'function test() { return true; }', filePath: 'test2.js' }, score: 0.8 }
            ];

            const result = await contextOptimizer.optimizeContext(searchResults, 'test function', 200);

            expect(result.chunkCount).toBe(2); // Should include both even if content is similar
            expect(result.optimizedContext).toContain('test1.js');
            expect(result.optimizedContext).toContain('test2.js');
        });

        it('should format context properly', async () => {
            const searchResults = [
                { payload: { content: 'console.log("test");', filePath: 'test.js' }, score: 0.9 }
            ];

            const result = await contextOptimizer.optimizeContext(searchResults, 'console log', 200);

            expect(result.optimizedContext).toContain('File: test.js');
            expect(result.optimizedContext).toContain('console.log("test");');
            expect(result.optimizedContext).toContain('---');
        });
    });

    describe('clustering', () => {
        it('should cluster similar content when enabled', async () => {
            const searchResults = [
                { payload: { content: 'function add(a, b) { return a + b; }', filePath: 'math1.js' }, score: 0.9 },
                { payload: { content: 'function subtract(a, b) { return a - b; }', filePath: 'math2.js' }, score: 0.8 },
                { payload: { content: 'console.log("Hello world");', filePath: 'hello.js' }, score: 0.7 }
            ];

            mockConfig.optimization = { clustering: { enabled: true, threshold: 0.7 } };
            contextOptimizer = new ContextOptimizer(null, mockConfig);

            const result = await contextOptimizer.optimizeContext(searchResults, 'math functions', 200);

            expect(result).toHaveProperty('clusteredGroups');
            expect(result.optimizedContext).toContain('math1.js');
            expect(result.optimizedContext).toContain('math2.js');
        });
    });

    describe('token counting', () => {
        it('should count tokens accurately', () => {
            const text = 'This is a test sentence with multiple words.';
            const tokenCount = contextOptimizer.countTokens(text);
            
            expect(tokenCount).toBeGreaterThan(0);
            expect(typeof tokenCount).toBe('number');
        });

        it('should handle empty text', () => {
            const tokenCount = contextOptimizer.countTokens('');
            expect(tokenCount).toBe(0);
        });
    });
});
