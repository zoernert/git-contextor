const fs = require('fs').promises;
const path = require('path');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const Python = require('tree-sitter-python');
const logger = require('../cli/utils/logger');
const pdf = require('pdf-parse');

// More languages can be added here
const parsers = {
    '.js': JavaScript,
    '.jsx': JavaScript,
    '.ts': JavaScript,
    '.tsx': JavaScript,
    '.py': Python,
};

function getParserForFile(filePath) {
    const ext = path.extname(filePath);
    if (parsers[ext]) {
        const parser = new Parser();
        parser.setLanguage(parsers[ext]);
        return parser;
    }
    return null;
}

// Generic chunker for text-based files or fallback
function chunkText(content, relativePath, config) {
    const { maxChunkSize, overlap } = config; // overlap is a percentage, e.g., 0.25
    const chunks = [];
    const lines = content.split('\n');
    let currentChunkLines = [];
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentChunkContent = currentChunkLines.join('\n');

        // Check if adding the next line would exceed the max chunk size.
        // The `+1` accounts for the newline character.
        if (currentChunkLines.length > 0 && currentChunkContent.length + line.length + 1 > maxChunkSize) {
            chunks.push({
                content: currentChunkContent,
                metadata: {
                    filePath: relativePath,
                    start_line: startLine,
                    end_line: i,
                },
            });

            // Create overlap for the next chunk
            const overlapChars = Math.floor(maxChunkSize * overlap);
            let overlapCharLength = 0;
            let overlapLines = [];

            // Work backwards from the end of the last chunk to create overlap
            for (let j = currentChunkLines.length - 1; j >= 0; j--) {
                const overlapLine = currentChunkLines[j];
                const newLength = overlapCharLength + overlapLine.length + 1; // +1 for newline
                if (newLength > overlapChars && overlapLines.length > 0) {
                    break;
                }
                overlapCharLength = newLength;
                overlapLines.unshift(overlapLine);
            }
            
            currentChunkLines = overlapLines;
            startLine = i - currentChunkLines.length + 1;
        }
        currentChunkLines.push(line);
    }
    
    // Add the final chunk if any content remains
    if (currentChunkLines.length > 0) {
        chunks.push({
            content: currentChunkLines.join('\n'),
            metadata: {
                filePath: relativePath,
                start_line: startLine,
                end_line: lines.length,
            },
        });
    }

    return chunks;
}


// PDF chunker
async function chunkPdf(filePath, relativePath, config) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        return chunkText(pdfData.text, relativePath, config);
    } catch (error) {
        logger.error(`Failed to parse PDF ${relativePath}:`, error);
        return [];
    }
}

// Tree-sitter powered chunking for code
async function chunkCode(content, relativePath, parser, config) {
    const tree = parser.parse(content);
    const chunks = [];
    const language = parser.getLanguage();

    // Queries for functions and classes. Can be expanded.
    const ext = path.extname(relativePath);
    let queryString;

    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        queryString = `
            [(function_declaration) (method_definition) (arrow_function)] @func
            [(class_declaration)] @class
        `;
    } else if (ext === '.py') {
        queryString = `
            [(function_definition)] @func
            [(class_definition)] @class
        `;
    } else {
        logger.debug(`No specific Tree-sitter query for ${ext}, falling back to text-based chunking.`);
        return chunkText(content, relativePath, config);
    }

    const query = new Parser.Query(language, queryString);
    const matches = query.captures(tree.rootNode);

    const nodes = matches.map(m => m.node);
    const sortedNodes = nodes.sort((a, b) => a.startIndex - b.startIndex);

    for (const node of sortedNodes) {
        const chunkContent = node.text;
        if (chunkContent.length > config.maxChunkSize) {
            const subChunks = chunkText(chunkContent, relativePath, config);
            subChunks.forEach(sc => {
                sc.metadata.start_line += node.startPosition.row;
                sc.metadata.end_line += node.startPosition.row;
            });
            chunks.push(...subChunks);
        } else {
            chunks.push({
                content: chunkContent,
                metadata: {
                    filePath: relativePath,
                    start_line: node.startPosition.row + 1,
                    end_line: node.endPosition.row + 1,
                },
            });
        }
    }

    if (chunks.length === 0) {
        return chunkText(content, relativePath, config);
    }
    return chunks;
}

/**
 * Chunks a file based on its type and the provided configuration.
 * @param {string} filePath - Absolute path to the file.
 * @param {string} repoPath - Absolute path to the repository root.
 * @param {object} config - The chunking configuration.
 * @returns {Promise<Array<object>>} An array of chunk objects.
 */
async function chunkFile(filePath, repoPath, config) {
    try {
        const relativePath = path.relative(repoPath, filePath);
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.pdf') {
            return await chunkPdf(filePath, relativePath, config);
        }

        const parser = getParserForFile(filePath);
        const content = await fs.readFile(filePath, 'utf8');

        if (parser && config.strategy === 'function') {
            return await chunkCode(content, relativePath, parser, config);
        } else {
            return chunkText(content, relativePath, config);
        }
    } catch (error) {
        logger.error(`Error chunking file ${filePath}:`, error.message);
        logger.debug(error.stack);
        return [];
    }
}

module.exports = { chunkFile, chunkText };
