const express = require('express');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const VectorStore = require('../../core/VectorStore');
const { generateText } = require('../../utils/llm');
const logger = require('../../cli/utils/logger');
const { apiKeyAuth } = require('../../utils/security');

async function handleChatQuery(query, services, context_type = 'general', options = {}) {
    const { contextOptimizer } = services;

    // Use existing search infrastructure. It will use settings from config.chat by default.
    const searchResult = await contextOptimizer.search(query, options);
    
    // Generate conversational response
    const chatConfig = contextOptimizer.config.chat;
    const aiResponse = await generateConversationalResponse(
        query, 
        searchResult.optimizedContext, 
        context_type, 
        chatConfig
    );

    return {
        query: query,
        response: aiResponse,
        context: searchResult.results
    };
}

/**
 * Creates and returns the chat router for conversational AI.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer, indexer } = services;

    /**
     * Handles conversational queries about the repository
     */
    router.post('/', apiKeyAuth(contextOptimizer.config), async (req, res) => {
        const { query, context_type, include_summary } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        try {
            const result = await handleChatQuery(query, services, context_type, { includeSummary: !!include_summary });
            res.json(result);
        } catch (error) {
            logger.error('Error in chat route:', error);
            res.status(500).json({ error: 'An error occurred during your request.' });
        }
    });

    return router;
};

module.exports.handleChatQuery = handleChatQuery;

async function generateConversationalResponse(query, context, contextType, chatConfig) {
    const systemPrompt = `You are an AI assistant that helps developers understand codebases. 
    You have access to relevant code context and should provide helpful, accurate responses about the repository.
    
    Context type: ${contextType}
    Available code context: ${context ? 'Yes' : 'No'}
    
    Guidelines:
    - Be concise but thorough
    - Focus on code patterns and architecture
    - If you don't know the answer, say so. Do not invent information.
    - When referencing code, mention the file path.`;

    const userPrompt = `Based on the provided context, answer the following query: "${query}"

    --- Context ---
    ${context || 'No context available.'}
    --- End Context ---`;
    
    return generateText(
        userPrompt,
        { systemPrompt },
        { llm: chatConfig.llm }
    );
}

function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
