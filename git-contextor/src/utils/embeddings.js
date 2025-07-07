const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../cli/utils/logger');

let embeddingPipeline = null;
let openAIClient = null;
let geminiClient = null;

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
            throw new Error('OpenAI API key is not configured. Set it in .gitcontextor/config.json, via "git-contextor config --api-key YOUR_KEY", or in OPENAI_API_KEY environment variable');
        }
        openAIClient = new OpenAI({ apiKey: finalApiKey });
    }
    
    const response = await openAIClient.embeddings.create({
        model: model || 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').substring(0, 8000), // Respect token limits
    });

    return response.data[0].embedding;
}

async function getGeminiEmbedding(text, { model, apiKey }) {
    if (!geminiClient) {
        const finalApiKey = apiKey || process.env.GOOGLE_API_KEY;
        if (!finalApiKey) {
            throw new Error('Google API key is not configured. Set it in .gitcontextor/config.json, via "git-contextor config --api-key YOUR_KEY", or in GOOGLE_API_KEY environment variable');
        }
        geminiClient = new GoogleGenerativeAI(finalApiKey);
    }
    
    // For embeddings, Google requires a specific embedding model (e.g., 'text-embedding-004').
    // We explicitly use it and ignore any model from config to prevent errors from using a non-embedding model.
    const embeddingModel = geminiClient.getGenerativeModel({
        model: 'text-embedding-004'
    });
    
    const result = await embeddingModel.embedContent(text.substring(0, 30000)); // Respect token limits
    return result.embedding.values;
}

/**
 * Generates an embedding for a given text using the configured provider.
 * @param {string} text - The text to embed.
 * @param {object} config - The embedding configuration.
 * @returns {Promise<Array<number>>} The generated embedding vector.
 */
async function getEmbedding(text, config) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Cannot generate embedding for empty text');
        }

        switch (config.provider) {
            case 'local':
                const model = config.model || 'Xenova/all-MiniLM-L6-v2';
                return await getLocalEmbedding(text, model);
            
            case 'openai':
                return await getOpenAIEmbedding(text, config);
            
            case 'gemini':
                return await getGeminiEmbedding(text, config);
            
            default:
                throw new Error(`Unsupported embedding provider: ${config.provider}. Supported providers: local, openai, gemini`);
        }
    } catch (error) {
        logger.error(`Embedding generation failed for provider ${config.provider}:`, error.message);
        throw error;
    }
}

module.exports = { getEmbedding };
