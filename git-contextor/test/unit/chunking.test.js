const { chunkText, chunkFile } = require('../../src/utils/chunking');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Chunking Utils', () => {
    let tempDir;

    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chunking-test-'));
    });

    afterAll(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('chunkText', () => {
        it('should chunk text by tokens', () => {
            const text = 'This is a test text that should be chunked into smaller pieces for processing.';
            const config = { strategy: 'token', maxTokens: 10 };
            
            const chunks = chunkText(text, 'test.txt', config);
            
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('metadata');
            expect(chunks[0].metadata).toHaveProperty('filePath', 'test.txt');
        });

        it('should handle empty text', () => {
            const text = '';
            const config = { strategy: 'token', maxTokens: 10 };
            
            const chunks = chunkText(text, 'empty.txt', config);
            
            expect(chunks).toHaveLength(0);
        });

        it('should handle semantic chunking', () => {
            const text = `
# Title
This is a paragraph.

## Subtitle
This is another paragraph with more content.

### Another section
Final paragraph here.
            `.trim();
            const config = { strategy: 'semantic', maxTokens: 50 };
            
            const chunks = chunkText(text, 'test.md', config);
            
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
        });
    });

    describe('chunkFile', () => {
        it('should chunk a JavaScript file', async () => {
            const jsContent = `
function greet(name) {
    console.log('Hello, ' + name);
    return 'Hello, ' + name;
}

function calculate(a, b) {
    return a + b;
}

module.exports = { greet, calculate };
            `.trim();
            
            const filePath = path.join(tempDir, 'test.js');
            await fs.writeFile(filePath, jsContent);
            
            const config = { strategy: 'function', maxTokens: 100 };
            const chunks = await chunkFile(filePath, tempDir, config);
            
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('metadata');
            expect(chunks[0].metadata).toHaveProperty('filePath');
        });

        it('should chunk a Python file', async () => {
            const pyContent = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def is_prime(num):
    if num < 2:
        return False
    for i in range(2, int(num ** 0.5) + 1):
        if num % i == 0:
            return False
    return True
            `.trim();
            
            const filePath = path.join(tempDir, 'test.py');
            await fs.writeFile(filePath, pyContent);
            
            const config = { strategy: 'function', maxTokens: 100 };
            const chunks = await chunkFile(filePath, tempDir, config);
            
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should handle non-existent files', async () => {
            const config = { strategy: 'token', maxTokens: 100 };
            
            await expect(chunkFile('non-existent.js', tempDir, config))
                .rejects.toThrow();
        });

        it('should handle markdown files', async () => {
            const mdContent = `
# Main Title

This is the introduction paragraph.

## Section 1

Content for section 1.

### Subsection 1.1

More detailed content here.

## Section 2

Final section content.
            `.trim();
            
            const filePath = path.join(tempDir, 'test.md');
            await fs.writeFile(filePath, mdContent);
            
            const config = { strategy: 'semantic', maxTokens: 200 };
            const chunks = await chunkFile(filePath, tempDir, config);
            
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
        });
    });
});
