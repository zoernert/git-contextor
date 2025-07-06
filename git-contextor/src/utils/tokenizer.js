const { get_encoding, encoding_for_model } = require('tiktoken');

// A map from generic LLM types to specific tiktoken encodings.
const encodingMap = {
    'default': 'cl100k_base', // Default for GPT-3.5/4
    'gpt-4': 'cl100k_base',
    'gpt-3.5-turbo': 'cl100k_base',
    'claude-sonnet': 'cl100k_base', // Claude models use a similar vocabulary. cl100k_base is a safe bet.
};

const encodings = {};

function getEncoder(llmType = 'default') {
    const encodingName = encodingMap[llmType] || encodingMap['default'];
    if (!encodings[encodingName]) {
        try {
            encodings[encodingName] = encoding_for_model(llmType);
        } catch (e) {
            encodings[encodingName] = get_encoding(encodingName);
        }
    }
    return encodings[encodingName];
}

/**
 * Counts the number of tokens in a string for a given LLM type.
 * @param {string} text - The string to count tokens for.
 * @param {string} [llmType='default'] - The type of LLM to use for tokenization.
 * @returns {number} The number of tokens.
 */
function countTokens(text, llmType = 'default') {
    if (!text) {
        return 0;
    }
    const encoder = getEncoder(llmType);
    return encoder.encode(text).length;
}

/**
 * Truncates text to a maximum number of tokens.
 * @param {string} text - The text to truncate.
 * @param {number} maxTokens - The maximum number of tokens allowed.
 * @param {string} [llmType='default'] - The LLM type.
 * @returns {string} The truncated text.
 */
function truncateToTokens(text, maxTokens, llmType = 'default') {
    if (!text) {
        return '';
    }
    const encoder = getEncoder(llmType);
    const tokens = encoder.encode(text);
    if (tokens.length <= maxTokens) {
        return text;
    }
    const truncatedTokens = tokens.slice(0, maxTokens);
    // Using Buffer is safer for decoding partial token sequences
    return Buffer.from(encoder.decode(truncatedTokens)).toString('utf-8');
}

module.exports = { countTokens, truncateToTokens };
