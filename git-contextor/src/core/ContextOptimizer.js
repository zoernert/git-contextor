const fs = require('fs').promises;
const path = require('path');
const { getEmbedding } = require('../utils/embeddings');
const { countTokens } = require('../utils/tokenizer');
const logger = require('../cli/utils/logger');

const MODEL_CONTEXT_WINDOWS = {
  // OpenAI
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4-vision-preview': 128000,
  'gpt-4o': 128000,
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16385,
  // Anthropic
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-sonnet': 200000, // For simple config
  'claude-opus': 200000, // For simple config
  'claude-haiku': 200000, // For simple config
  // Google
  'gemini-1.5-pro-latest': 1000000,
  'gemini-1.0-pro': 30720,
  'gemini-pro': 30720,
};

// Ein konservatives Verhältnis, um Platz für die Benutzeranfrage, Anweisungen und die Antwort des Modells zu lassen.
const CONTEXT_FILL_RATIO = 0.75;
// Ein großzügiger Standardwert für Modelle, die nicht in unserer Karte sind.
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Optimizes context from search results to fit within LLM token limits.
 */
class ContextOptimizer {
  /**
   * @param {VectorStore} vectorStore - An instance of the VectorStore class.
   * @param {object} config - The application configuration object.
   */
  constructor(vectorStore, config) {
    this.vectorStore = vectorStore;
    this.config = config;
  }

  /**
   * Performs a search and optimizes the results for a given token limit.
   * @param {string} query - The search query.
   * @param {object} [options={}] - Search options.
   * @param {number} [options.maxTokens=2048] - The maximum number of tokens for the context.
   * @param {object} [options.filter=null] - A filter to apply to the search.
   * @param {string} [options.llmType='claude-sonnet'] - The LLM type for token counting.
   * @returns {Promise<object>} The search results and optimized context.
   */
  async search(query, options = {}) {
    // 1. Modell und Filter bestimmen
    const llmType = options.llmType || this.config.llm?.model || 'claude-sonnet';
    const filter = options.filter || null;
    let filePathToPrioritize = options.filePath || null;

    // 2. maxTokens für den Kontext dynamisch bestimmen
    let maxTokens = options.maxTokens;
    if (!maxTokens) {
        const modelMax = MODEL_CONTEXT_WINDOWS[llmType];
        if (modelMax) {
            maxTokens = Math.floor(modelMax * CONTEXT_FILL_RATIO);
            logger.info(`Dynamically set max context tokens for "${llmType}" to ${maxTokens} (${CONTEXT_FILL_RATIO * 100}% of ${modelMax}).`);
        } else {
            maxTokens = DEFAULT_MAX_TOKENS;
            logger.warn(`Model "${llmType}" not in context window map. Using default max tokens: ${maxTokens}.`);
        }
    }

    logger.info(`Performing search for query: "${query}" with maxTokens: ${maxTokens}, prioritizing file: ${filePathToPrioritize || 'None'}`);
    
    let allResults = [];

    if (filePathToPrioritize) {
        const absoluteFilePath = path.isAbsolute(filePathToPrioritize) ? filePathToPrioritize : path.join(this.config.repository.path, filePathToPrioritize);
        try {
            const fileContent = await fs.readFile(absoluteFilePath, 'utf8');
            const fileTokens = countTokens(fileContent, llmType);

            if (fileTokens < maxTokens) {
                const prioritizedChunk = {
                    score: 1.0, // Highest priority
                    payload: {
                        content: fileContent,
                        filePath: filePathToPrioritize,
                        source: 'file-priority'
                    }
                };
                allResults.push(prioritizedChunk);
                logger.info(`Added prioritized file ${filePathToPrioritize} to context candidates.`);
            } else {
                logger.warn(`File ${filePathToPrioritize} (${fileTokens} tokens) is too large for context window of ${maxTokens} tokens. Skipping file content prioritization.`);
                filePathToPrioritize = null;
            }
        } catch (error) {
            logger.error(`Could not read prioritized file ${filePathToPrioritize}:`, error);
        }
    }

    const queryVector = await getEmbedding(query, this.config.embedding);
    if (!queryVector) {
        logger.error('Could not generate query embedding.');
        return { error: 'Could not generate query embedding.' };
    }

    const searchLimit = 50;
    const searchResults = await this.vectorStore.search(queryVector, searchLimit, filter);
    
    if (searchResults && searchResults.length > 0) {
        const filteredResults = filePathToPrioritize ? searchResults.filter(r => r.payload.filePath !== filePathToPrioritize) : searchResults;
        allResults.push(...filteredResults);
    }
    
    if (allResults.length === 0) {
      logger.warn('No results found for query.');
      return { query, optimizedContext: '', results: [] };
    }

    const { optimizedContext, includedResults } = this.packContext(allResults, maxTokens, llmType);

    const finalTokenCount = countTokens(optimizedContext, llmType);
    logger.info(`Returning ${includedResults.length} results with ${finalTokenCount} tokens.`);

    return {
      query,
      optimizedContext,
      results: includedResults,
      tokenCount: finalTokenCount
    };
  }

  /**
   * Packs the most relevant context into a string that respects the token limit.
   * @param {Array<object>} results - Search results from the vector store.
   * @param {number} maxTokens - The maximum number of tokens allowed.
   * @param {string} llmType - The LLM type for tokenization.
   * @returns {{optimizedContext: string, includedResults: Array<object>}}
   * @private
   */
  packContext(results, maxTokens, llmType) {
    let currentTokens = 0;
    let combinedContext = '';
    const includedResults = [];
    
    for (const result of results) {
      const chunkContent = result.payload.content;
      const contextHeader = `--- File: ${result.payload.filePath} (Score: ${result.score.toFixed(2)}) ---\n`;
      const fullChunk = contextHeader + chunkContent + '\n\n';
      const chunkTokens = countTokens(fullChunk, llmType);

      if (currentTokens + chunkTokens <= maxTokens) {
        combinedContext += fullChunk;
        currentTokens += chunkTokens;
        includedResults.push({
          ...result.payload,
          filePath: result.payload.filePath,
          score: result.score,
        });
      } else {
        break;
      }
    }
    
    return { optimizedContext: combinedContext.trim(), includedResults };
  }
}

module.exports = ContextOptimizer;
