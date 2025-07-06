const { OpenAI } = require('openai');
const logger = require('../cli/utils/logger');

let embeddingPipeline = null;
let openAIClient = null;

async function getLocalEmbedding(text, model) {
    if (!embeddingPipeline) {
        logger.info(`Initializing local embedding model: ${model}... (This may take a moment on first run)`);
        const { pipeline } = await import('@xenova/transformers');
        embeddingPipeline = await pipeline('feature-extraction', model);
        logger.info('Local embedding model loaded.');
    }
    const result = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

async function getOpenAIEmbedding(text, { model, apiKey }) {
    if (!openAIClient) {
        const finalApiKey = apiKey || process.env.OPENAI_API_KEY;
        if (!finalApiKey) {
            throw new Error('OpenAI API key is not configured. Set it in .env or via "git-contextor config --api-key YOUR_KEY"');
        }
        openAIClient = new OpenAI({ apiKey: finalApiKey });
    }
    
    const response = await openAIClient.embeddings.create({
        model: model,
        input: text.replace(/\n/g, ' '),
    });

    return response.data[0].embedding;
}

/**
 * Generates an embedding for a given text using the configured provider.
 * @param {string} text - The text to embed.
 * @param {object} config - The embedding configuration.
 * @returns {Promise<Array<number>>} The generated embedding vector.
 */
async function getEmbedding(text, config) {
    try {
        if (config.provider === 'local') {
            const model = config.model || 'Xenova/all-MiniLM-L6-v2';
            return await getLocalEmbedding(text, model);
        } else if (config.provider === 'openai') {
            return await getOpenAIEmbedding(text, config);
        } else {
            throw new Error(`Unsupported embedding provider: ${config.provider}`);
        }
    } catch (error) {
        logger.error(`Embedding generation failed for provider ${config.provider}:`, error.message);
        throw error;
    }
}

module.exports = { getEmbedding };
