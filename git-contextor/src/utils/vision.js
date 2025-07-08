const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const logger = require('../cli/utils/logger');

let openAIClient;
let geminiClient;

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

async function getGeminiImageDescription(buffer, filePath, { model, apiKey, prompt }) {
    if (!geminiClient) {
        const finalApiKey = apiKey || process.env.GOOGLE_API_KEY;
        if (!finalApiKey) {
            throw new Error('Google API key is not configured for Vision.');
        }
        geminiClient = new GoogleGenerativeAI(finalApiKey);
    }
    const generativeModel = geminiClient.getGenerativeModel({ model });
    const imagePart = {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType: getMimeType(filePath),
        },
    };

    const result = await generativeModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
}

async function getOpenAIImageDescription(buffer, filePath, { model, apiKey, prompt }) {
    if (!openAIClient) {
        const finalApiKey = apiKey || process.env.OPENAI_API_KEY;
        if (!finalApiKey) {
            throw new Error('OpenAI API key is not configured for Vision.');
        }
        openAIClient = new OpenAI({ apiKey: finalApiKey });
    }
    const base64Image = buffer.toString('base64');
    const mimeType = getMimeType(filePath);

    const response = await openAIClient.chat.completions.create({
        model,
        messages: [{
            role: 'user',
            content: [{
                type: 'text',
                text: prompt
            }, {
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                },
            }, ],
        }, ],
        max_tokens: 1024,
    });
    return response.choices[0].message.content;
}

async function getImageDescription(filePath, config) {
    logger.debug(`Generating description for ${filePath} using ${config.provider}`);
    const buffer = await fs.readFile(filePath);

    try {
        switch (config.provider) {
            case 'gemini':
                return await getGeminiImageDescription(buffer, filePath, config);
            case 'openai':
                return await getOpenAIImageDescription(buffer, filePath, config);
            default:
                logger.warn(`Unsupported vision provider: ${config.provider}. Skipping image.`);
                return null;
        }
    } catch (error) {
        logger.error(`Failed to get image description from provider ${config.provider}.`);
        if (process.env.DEBUG) {
            logger.error(error);
        }
        throw error;
    }
}

module.exports = {
    getImageDescription
};
