const express = require('express');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const VectorStore = require('../../core/VectorStore');

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
    router.post('/', async (req, res, next) => {
        const { query, conversation_id, context_type = 'general' } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing required field: query' });
        }

        try {
            // Use existing search infrastructure. It will use settings from config.chat by default.
            const searchResult = await contextOptimizer.search(query);
            
            // Generate conversational response
            const chatConfig = contextOptimizer.config.chat;
            const aiResponse = await generateConversationalResponse(
                query, 
                searchResult.optimizedContext, 
                context_type,
                chatConfig
            );

            res.json({
                response: aiResponse,
                context_chunks: searchResult.results, // Send the full chunk objects
                conversation_id: conversation_id || generateConversationId(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            if (VectorStore.isDimensionMismatch(error)) {
                // This specific error means the config (e.g., embedding model) has changed
                // and is incompatible with the existing data in the vector store.
                indexer.reindexAll().catch(err => {
                    console.error('Background re-index triggered by chat failed:', err);
                });
                return res.status(503).json({
                    response: 'Configuration mismatch detected. The vector database is being re-indexed to match the new settings. Please wait a few minutes and try your question again.',
                    context_chunks: 0,
                    conversation_id: conversation_id || generateConversationId(),
                    timestamp: new Date().toISOString()
                });
            }
            next(error);
        }
    });

    return router;
};

async function generateConversationalResponse(query, context, contextType, chatConfig) {
    const systemPrompt = `You are an AI assistant that helps developers understand codebases. 
    You have access to relevant code context and should provide helpful, accurate responses about the repository structure, patterns, and implementation details.
    
    Context type: ${contextType}
    Available code context: ${context ? 'Yes' : 'No'}
    
    Guidelines:
    - Be concise but thorough
    - Focus on code patterns and architecture
    - Suggest specific files or functions when relevant
    - If context is insufficient, say so clearly
    - Never reveal sensitive information like API keys or credentials`;

    const userPrompt = `Based on this code context from the repository:

${context || 'No specific context found'}

Answer this question: ${query}`;

    // Use configured LLM provider's API for chat completion
    if (chatConfig && chatConfig.provider === 'openai' && chatConfig.apiKey) {
        const openai = new OpenAI({ apiKey: chatConfig.apiKey });
        const completion = await openai.chat.completions.create({
            model: chatConfig.model || 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000
        });
        return completion.choices[0].message.content;
    } else if (chatConfig && chatConfig.provider === 'gemini' && chatConfig.apiKey) {
        const genAI = new GoogleGenerativeAI(chatConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: chatConfig.model || 'gemini-pro' });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        return result.response.text();
    } else {
        // Fallback: return formatted search results without LLM
        const reason = chatConfig ? `The configured provider ('${chatConfig.provider}') is not supported for chat or the API key is missing.` : 'No chat provider is configured.';
        return `Based on the repository context, here's what I found:\n\n${context}\n\nNote: Could not generate an AI response. ${reason} Please configure a 'chat' provider (like 'openai' or 'gemini') with an API key in the UI config.`;
    }
}

function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
