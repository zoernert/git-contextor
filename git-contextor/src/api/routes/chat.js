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
    const { contextOptimizer } = services;

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
            const llmConfig = contextOptimizer.config.llm || contextOptimizer.config.embedding;
            const aiResponse = await generateConversationalResponse(
                query, 
                searchResult.optimizedContext, 
                context_type,
                llmConfig
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

async function generateConversationalResponse(query, context, contextType, llmConfig) {
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
    if (llmConfig && llmConfig.provider === 'openai' && llmConfig.apiKey) {
        const openai = new OpenAI({ apiKey: llmConfig.apiKey });
        const completion = await openai.chat.completions.create({
            model: llmConfig.model || 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000
        });
        return completion.choices[0].message.content;
    } else if (llmConfig && llmConfig.provider === 'gemini' && llmConfig.apiKey) {
        const genAI = new GoogleGenerativeAI(llmConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: llmConfig.model || 'gemini-pro' });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        return result.response.text();
    } else {
        // Fallback: return formatted search results without LLM
        const reason = llmConfig ? `The configured provider ('${llmConfig.provider}') is not supported for chat or the API key is missing.` : 'No LLM provider is configured.';
        return `Based on the repository context, here's what I found:\n\n${context}\n\nNote: Could not generate an AI response. ${reason} Please configure an 'llm' provider (like 'openai' or 'gemini') with an API key in the UI.`;
    }
}

function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
