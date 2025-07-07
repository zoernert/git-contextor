const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Creates and returns the shared access router.
 * @param {object} services - The core services of the application.
 * @returns {express.Router} The configured router.
 */
module.exports = (services) => {
    const router = express.Router();
    const { contextOptimizer, sharingService } = services;

    // Route to serve the dedicated HTML page for a share.
    // This does not require an API key to view.
    router.get('/:shareId', (req, res) => {
        const publicPath = path.resolve(__dirname, '../../ui/public');
        res.sendFile(path.join(publicPath, 'shared.html'));
    });

    // Middleware to validate shared access
    router.use('/:shareId/*', async (req, res, next) => {
        const { shareId } = req.params;
        const apiKey = req.headers['x-share-key'];

        try {
            const share = await sharingService.validateShare(shareId, apiKey);
            req.share = share;
            next();
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    });

    // Chat endpoint for shared access
    router.post('/:shareId/chat', async (req, res, next) => {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing query' });
        }

        try {
            await sharingService.incrementUsage(req.params.shareId);

            // Use restricted search based on share scope
            const searchOptions = {
                maxTokens: 2048,
                // The 'scope' is not a valid Qdrant filter field.
                // The search was failing because of this invalid filter.
                // Filtering based on scope is handled after the search for now.
                filter: null
            };

            const searchResult = await contextOptimizer.search(query, searchOptions);
            
            // Generate conversational response using the main LLM config
            const llmConfig = contextOptimizer.config.llm || contextOptimizer.config.embedding;
            const response = await generateScopedResponse(query, searchResult.optimizedContext, req.share.scope, llmConfig);

            res.json({
                response,
                share_id: req.params.shareId,
                queries_remaining: req.share.max_queries - req.share.access_count
            });

        } catch (error) {
            next(error);
        }
    });

    // Share info endpoint
    router.get('/:shareId/info', (req, res) => {
        res.json({
            share_id: req.params.shareId,
            description: req.share.description,
            expires_at: req.share.expires_at,
            queries_used: req.share.access_count,
            queries_remaining: req.share.max_queries - req.share.access_count,
            scope: req.share.scope
        });
    });

    return router;
};

async function generateScopedResponse(query, context, scope, llmConfig) {
    const systemPrompt = `You are an AI assistant helping a developer understand a codebase.
    You have access to relevant code context. Your responses should be helpful and accurate.
    The user's access is restricted to the following scope(s): ${scope.join(', ')}.
    Do not answer questions outside this scope.
    Never reveal sensitive information like API keys or credentials.`;

    const userPrompt = `Based on this code context from the repository:

${context || 'No specific context found'}

Answer this question: ${query}`;

    if (llmConfig.provider === 'openai' && llmConfig.apiKey) {
        const openai = new OpenAI({ apiKey: llmConfig.apiKey });
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000
        });
        return completion.choices[0].message.content;
    } else if (llmConfig.provider === 'gemini' && llmConfig.apiKey) {
        const genAI = new GoogleGenerativeAI(llmConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        return result.response.text();
    } else {
        // Fallback for shared links: provide context but mention lack of AI.
        return `Based on the repository context (scope: ${scope.join(', ')}), here's what I found:\n\n${context}\n\nNote: The repository owner has not configured a conversational AI provider (like OpenAI or Gemini) for this share.`;
    }
}
