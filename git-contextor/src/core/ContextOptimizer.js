const fs = require('fs').promises;
const path = require('path');
const { getEmbedding } = require('../utils/embeddings');
const { countTokens } = require('../utils/tokenizer');
const logger = require('../cli/utils/logger');
const { kmeans } = require('ml-kmeans');
const { generateText, generateTextStream } = require('../utils/llm');

const COLLECTION_SUMMARY_PATH = 'gitcontextor://system/collection-summary.md';

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
   * Optimizes context from search results to fit within token limits.
   * @param {Array} searchResults - Array of search result objects.
   * @param {string} query - The search query.
   * @param {number} maxTokens - Maximum tokens allowed.
   * @returns {Promise<object>} Optimized context object.
   */
  async optimizeContext(searchResults, query, maxTokens) {
    if (!searchResults || searchResults.length === 0) {
      return {
        optimizedContext: '',
        tokenCount: 0,
        chunkCount: 0
      };
    }

    // Sort results by score (highest first)
    const sortedResults = searchResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    let context = '';
    let tokenCount = 0;
    let chunkCount = 0;
    let clusteredGroups = null;

    // Check if clustering is enabled
    if (this.config.optimization?.clustering?.enabled) {
      // Simple clustering implementation - group by file extension or keyword similarity
      clusteredGroups = this._clusterResults(sortedResults);
    }

    for (const result of sortedResults) {
      const chunk = result.payload || result;
      const chunkContext = `File: ${chunk.filePath}\nLines ${chunk.start_line}-${chunk.end_line}:\n${chunk.content}\n---\n\n`;
      const chunkTokens = this.countTokens(chunkContext);
      
      if (tokenCount + chunkTokens <= maxTokens) {
        context += chunkContext;
        tokenCount += chunkTokens;
        chunkCount++;
      } else {
        break;
      }
    }

    const result = {
      optimizedContext: context,
      tokenCount,
      chunkCount
    };

    if (clusteredGroups) {
      result.clusteredGroups = clusteredGroups;
    }

    return result;
  }

  /**
   * Simple clustering implementation
   * @param {Array} results - Search results to cluster
   * @returns {Array} Clustered groups
   * @private
   */
  _clusterResults(results) {
    // Simple clustering by file extension
    const clusters = {};
    
    results.forEach(result => {
      const chunk = result.payload || result;
      const ext = chunk.filePath.split('.').pop() || 'unknown';
      
      if (!clusters[ext]) {
        clusters[ext] = [];
      }
      clusters[ext].push(result);
    });

    return Object.entries(clusters).map(([ext, items]) => ({
      type: ext,
      items: items.length,
      files: items.map(item => (item.payload || item).filePath)
    }));
  }

  /**
   * Counts tokens in text (simple approximation).
   * @param {string} text - Text to count tokens in.
   * @returns {number} Estimated token count.
   */
  countTokens(text) {
    if (!text) return 0;
    // Simple approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
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
    const includeSummary = options.includeSummary || false;

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

    logger.info(`Performing search for query: "${query}" with maxTokens: ${maxTokens}, prioritizing file: ${filePathToPrioritize || 'None'}, including summary: ${includeSummary}`);
    
    let allResults = [];

    if (includeSummary) {
      try {
        const summaryDoc = await this.vectorStore.search(
            await getEmbedding('repository overview summary', this.config.embedding),
            1, 
            { must: [{ key: 'filePath', match: { value: COLLECTION_SUMMARY_PATH } }] }
        );
        if (summaryDoc && summaryDoc.length > 0) {
            summaryDoc[0].score = 1.1; // Highest score to prioritize
            allResults.push(...summaryDoc);
            logger.info(`Added collection summary to context candidates.`);
        }
      } catch (error) {
        logger.warn('Could not retrieve collection summary.', error);
      }
    }

    if (filePathToPrioritize) {
        const absoluteFilePath = path.isAbsolute(filePathToPrioritize) ? filePathToPrioritize : path.join(this.config.repository.path, filePathToPrioritize);
        try {
            const fileContent = await fs.readFile(absoluteFilePath, 'utf8');
            const fileTokens = countTokens(fileContent, llmType);

            if (fileTokens < maxTokens) {
                const prioritizedChunk = {
                    score: 1.0, // High priority, but lower than summary
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
        const uniqueResults = searchResults.filter(r => 
            r.payload.filePath !== COLLECTION_SUMMARY_PATH &&
            r.payload.filePath !== filePathToPrioritize
        );
        allResults.push(...uniqueResults);
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
  
    async chat(query, options = {}) {
      // This logic is moved from api/routes/chat.js
      const searchResult = await this.search(query, options);
    
      const config = this.config;
      const chatConfig = config.chat || {};
    
      let llmConfig = chatConfig.llm || config.llm;
      if ((!llmConfig || !llmConfig.provider) && chatConfig.provider) {
          llmConfig = chatConfig;
      }
    
      if (!llmConfig || !llmConfig.provider) {
          throw new Error('LLM configuration is missing or incomplete. Please set your provider and API key.');
      }
    
      const aiResponse = await this._generateConversationalResponse(
          query,
          searchResult.optimizedContext,
          options.context_type || 'general',
          llmConfig
      );
    
      return {
          query: query,
          response: aiResponse,
          context_chunks: searchResult.results // Fix: use context_chunks for UI
      };
    }
    
    async* generateConversationalResponseStream(query, context, contextType, llmConfig) {
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
        
      yield* generateTextStream(userPrompt, { systemPrompt }, { llm: llmConfig });
    }
    
    async _generateConversationalResponse(query, context, contextType, llmConfig) {
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
          { llm: llmConfig }
      );
    }

  async summarizeCollection(options = {}) {
    // Determine the correct LLM configuration, preferring chat settings.
    const config = this.config;
    const chatConfig = config.chat || {};
    let llmConfig = chatConfig.llm || config.llm;
    if ((!llmConfig || !llmConfig.provider) && chatConfig.provider) {
        llmConfig = chatConfig;
    }

    if (!llmConfig || !llmConfig.provider) {
        throw new Error('LLM configuration is missing or incomplete. Please set your provider and API key, e.g., by running `npx git-contextor config set llm.provider openai` and `npx git-contextor config set llm.apiKey YOUR_OPENAI_KEY`.');
    }
    const numClusters = options.numClusters || 10;
    const pointsPerCluster = options.pointsPerCluster || 5;
    logger.info(`Starting collection summary generation with ${numClusters} clusters.`);

    const allPoints = await this.vectorStore.getAllPoints();
    if (allPoints.length < numClusters) {
      logger.warn('Not enough data points to generate a meaningful summary. Aborting.');
      return { success: false, message: 'Not enough data points.' };
    }

    const vectors = allPoints.map(p => p.vector);
    const ans = kmeans(vectors, numClusters, { maxIterations: 100 });
    const clusters = Array.from({ length: numClusters }, () => []);
    ans.clusters.forEach((clusterId, pointIndex) => {
        clusters[clusterId].push(pointIndex);
    });

    let summaryPrompt = 'You are an expert software architect. Below are clustered chunks of code and text from a repository. For each cluster, summarize its core topic or theme in a single, concise headline. Then, list the key technologies, patterns, or concepts found within that cluster. Format the output in Markdown.\n\n';

    for (let i = 0; i < clusters.length; i++) {
      const clusterPoints = clusters[i].map(pointIndex => allPoints[pointIndex]);
      const samplePoints = clusterPoints.slice(0, pointsPerCluster);

      if (samplePoints.length === 0) continue;

      summaryPrompt += `--- Cluster ${i + 1} ---\n`;
      samplePoints.forEach(point => {
        summaryPrompt += `File: ${point.payload.filePath}\n\`\`\`\n${point.payload.content}\n\`\`\`\n\n`;
      });
    }

    const summaryContent = await generateText(
      summaryPrompt,
      {
        systemPrompt: 'Generate a summary based on the provided text clusters.'
      },
      { llm: llmConfig }
    );

    logger.info('Generated collection summary. Now indexing it.');

    await this.vectorStore.removeFile(COLLECTION_SUMMARY_PATH);

    await this.vectorStore.upsertChunks([
      {
        content: summaryContent,
        metadata: {
          filePath: COLLECTION_SUMMARY_PATH,
          startLine: 1,
          endLine: summaryContent.split('\n').length,
        },
      },
    ]);
    
    logger.info('Collection summary updated successfully.');
    return { success: true, message: 'Collection summary updated.' };
  }

  /**
   * Retrieves the collection summary, creating it if it doesn't exist.
   * @returns {Promise<string|null>} The summary content as a string, or null on failure.
   */
  async getOrCreateSummary() {
    try {
      const filter = {
        must: [{ key: 'filePath', match: { value: COLLECTION_SUMMARY_PATH } }]
      };
      
      let points = await this.vectorStore.getPoints(filter);

      if (points && points.length > 0) {
        logger.info('Retrieved existing collection summary.');
        // The summary might be chunked, but for now it's treated as a single doc.
        return points.map(p => p.payload.content).join('\n\n');
      }

      // If not found, create it.
      logger.info('No collection summary found, generating a new one.');
      const summaryResult = await this.summarizeCollection();

      if (!summaryResult || !summaryResult.success) {
        logger.error('Failed to generate collection summary during getOrCreateSummary.');
        return null;
      }

      // Fetch it again.
      points = await this.vectorStore.getPoints(filter);

      if (points && points.length > 0) {
        logger.info('Retrieved newly generated collection summary.');
        return points.map(p => p.payload.content).join('\n\n');
      } else {
        logger.warn('Could not retrieve collection summary even after generating it.');
        return null;
      }
    } catch (error) {
      logger.error('Error in getOrCreateSummary:', error);
      return null;
    }
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
