const express = require('express');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Creates and returns the chat router for conversational AI.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer, config } = services;

    /**
     * Handles conversational queries about the repository
     */
    router.post('/', async (req, res, next) => {
        const { query, conversation_id, context_type = 'general' } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing required field: query' });
        }

        try {
            // Use existing search infrastructure
            const searchOptions = {
                maxTokens: 4096,
                llmType: 'claude-sonnet'
            };
            
            const searchResult = await contextOptimizer.search(query, searchOptions);
            
            // Generate conversational response
            const aiResponse = await generateConversationalResponse(
                query, 
                searchResult.optimizedContext, 
                context_type,
                config.embedding
            );

            res.json({
                response: aiResponse,
                context_chunks: searchResult.results.length,
                conversation_id: conversation_id || generateConversationId(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    });

    return router;
};

async function generateConversationalResponse(query, context, contextType, embeddingConfig) {
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

    // Use configured embedding provider's API for chat completion
    if (embeddingConfig.provider === 'openai' && embeddingConfig.apiKey) {
        const openai = new OpenAI({ apiKey: embeddingConfig.apiKey });
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000
        });
        return completion.choices[0].message.content;
    } else if (embeddingConfig.provider === 'gemini' && embeddingConfig.apiKey) {
        const genAI = new GoogleGenerativeAI(embeddingConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        return result.response.text();
    } else {
        // Fallback: return formatted search results without LLM
        return `Based on the repository context, here's what I found:\n\n${context}\n\nNote: Install OpenAI or Gemini API key for enhanced AI responses.`;
    }
}

function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
