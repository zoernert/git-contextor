const { v4: uuidv4 } = require('uuid');
const logger = require('../cli/utils/logger');
const { getEmbedding } = require('../utils/embeddings');
const path = require('path');

/**
 * An in-memory vector store for development and scenarios where Qdrant is not available.
 * Does not persist data between sessions.
 */
class MemoryVectorStore {
  /**
   * @param {object} config - The application configuration object.
   */
  constructor(config) {
    this.config = config;
    const repoName = this.config.repository.name.replace(/[^a-zA-Z0-9-]/g, '_');
    this.collectionName = `gctx-${repoName}-memory`.toLowerCase();
    this.points = [];
  }

  /**
   * Validates collection configuration. For in-memory, this is a no-op.
   * @returns {Promise<boolean>} True.
   */
  async validateCollectionConfig() {
    return true;
  }

  /**
   * Ensures the collection exists. For in-memory, this is a no-op.
   */
  async ensureCollection() {
    // No-op for in-memory
  }

  /**
   * Adds or updates chunks in the in-memory store.
   * @param {Array<object>} chunks - An array of chunk objects.
   */
  async upsertChunks(chunks) {
    if (!chunks || chunks.length === 0) return;

    // First, remove existing points for the files being updated.
    const filePaths = [...new Set(chunks.map(c => c.metadata.filePath))];
    this.points = this.points.filter(p => !filePaths.includes(p.payload.filePath));

    const newPoints = [];
    for (const chunk of chunks) {
      try {
        const embedding = await getEmbedding(chunk.content, this.config.embedding);
        if (embedding && embedding.length > 0) {
          newPoints.push({
            id: uuidv4(),
            vector: embedding,
            payload: { ...chunk.metadata, content: chunk.content },
          });
        }
      } catch (error) {
        logger.warn(`Failed to generate embedding for chunk: ${error.message}`);
      }
    }

    this.points.push(...newPoints);
    logger.debug(`Upserted ${newPoints.length} points to in-memory store.`);
  }

  /**
   * Removes all chunks associated with a specific file.
   * @param {string} filePath - The path to the file to remove.
   */
  async removeFile(filePath) {
    const initialCount = this.points.length;
    this.points = this.points.filter(p => p.payload.filePath !== filePath);
    const removedCount = initialCount - this.points.length;
    if (removedCount > 0) {
      logger.info(`Removed ${removedCount} points for file: ${filePath}`);
    }
  }

  /**
   * Clears all points from the store.
   */
  async clearCollection() {
    this.points = [];
    logger.info(`Cleared in-memory store: ${this.collectionName}`);
  }

  /**
   * Deletes the collection (clears all points).
   */
  async deleteCollection() {
    return this.clearCollection();
  }

  /**
   * Performs a semantic search in the in-memory store.
   * @param {Array<number>} queryVector - The vector representation of the search query.
   * @param {number} limit - The maximum number of results to return.
   * @param {object} filter - Optional filter object.
   * @returns {Promise<Array<object>>} Search results.
   */
  async search(queryVector, limit = 10, filter = null) {
    const cosineSimilarity = (vecA, vecB) => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    let candidates = this.points;
    if (filter && filter.must) {
      candidates = candidates.filter(point => {
        return filter.must.every(condition => {
          return point.payload[condition.key] === condition.match.value;
        });
      });
    }

    const scoredResults = candidates.map(point => ({
      score: cosineSimilarity(queryVector, point.vector),
      payload: point.payload,
      id: point.id,
    }));

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, limit);
  }

  /**
   * Gets status information from the store.
   * @returns {Promise<object>} Status object.
   */
  async getStatus() {
    return {
      collectionName: this.collectionName,
      vectorCount: this.points.length,
    };
  }
}

module.exports = MemoryVectorStore;

/**
 * Checks for dimension mismatch errors. Not applicable for MemoryVectorStore.
 * @param {object} error - The error object.
 * @returns {boolean} - Always false.
 */
module.exports.isDimensionMismatch = function(error) {
  return false;
};
