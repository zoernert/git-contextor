const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../cli/utils/logger');

async function generateText(prompt, options = {}, config = {}) {
  const { llm } = config;
  const { systemPrompt = 'You are a helpful AI assistant.', model: modelOverride } = options;
  const finalModel = modelOverride || llm.model || 'claude-3-haiku-20240307';

  try {
    switch (llm.provider) {
      case 'openai': {
        const openai = new OpenAI({ apiKey: llm.apiKey || process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: finalModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
        });
        return response.choices[0].message.content;
      }
      case 'gemini':
      case 'google': {
         const googleAI = new GoogleGenerativeAI(llm.apiKey || process.env.GOOGLE_API_KEY);
         const model = googleAI.getGenerativeModel({ model: finalModel });
         const result = await model.generateContent(
             `${systemPrompt}\n\n${prompt}`
         );
         const response = await result.response;
         return response.text();
      }
      default:
        // You might want to add support for Anthropic or other providers here
        throw new Error(`Unsupported LLM provider: ${llm.provider}`);
    }
  } catch (error) {
    logger.error('Error generating text with LLM:', error);
    throw new Error('Failed to generate text response from LLM.');
  }
}

async function* generateTextStream(prompt, options = {}, config = {}) {
  const { llm } = config;
  const { systemPrompt = 'You are a helpful AI assistant.', model: modelOverride } = options;
  const finalModel = modelOverride || llm.model || 'claude-3-haiku-20240307';

  try {
    switch (llm.provider) {
      case 'openai': {
        const openai = new OpenAI({ apiKey: llm.apiKey || process.env.OPENAI_API_KEY });
        const stream = await openai.chat.completions.create({
          model: finalModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true,
        });
        for await (const chunk of stream) {
          yield chunk.choices[0]?.delta?.content || '';
        }
        break;
      }
      case 'gemini':
      case 'google': {
         const googleAI = new GoogleGenerativeAI(llm.apiKey || process.env.GOOGLE_API_KEY);
         const model = googleAI.getGenerativeModel({ model: finalModel });
         const result = await model.generateContentStream(
             `${systemPrompt}\n\n${prompt}`
         );
         for await (const chunk of result.stream) {
            yield chunk.text();
         }
         break;
      }
      default:
        throw new Error(`Streaming is not supported for LLM provider: ${llm.provider}`);
    }
  } catch (error) {
    logger.error('Error generating text with LLM stream:', error);
    throw new Error('Failed to generate streaming text response from LLM.');
  }
}

module.exports = { generateText, generateTextStream };
