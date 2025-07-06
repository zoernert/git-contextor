const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');
const logger = require('../cli/utils/logger');
const { getEmbedding } = require('../utils/embeddings');

/**
 * Manages interactions with the Qdrant vector database.
 * Handles collection creation, embedding generation, and vector operations.
 */
class VectorStore {
  /**
   * @param {object} config - The application configuration object.
   */
  constructor(config) {
    this.config = config;
    this.client = new QdrantClient({
      url: `http://localhost:${config.services.qdrantPort}`,
    });
    this.collectionName = `gctx-${this.config.repository.name}`.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
  }

  /**
   * Ensures the Qdrant collection exists and is configured correctly.
   */
  async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(c => c.name === this.collectionName);

      if (!collectionExists) {
        logger.info(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.config.embedding.dimensions,
            distance: 'Cosine',
          },
        });
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'filePath',
          field_schema: 'keyword',
          wait: true,
        });
      }
    } catch (error) {
      logger.error('Failed to ensure Qdrant collection:', error);
      throw error;
    }
  }

  /**
   * Adds or updates chunks in the vector store.
   * @param {Array<object>} chunks - An array of chunk objects like { content, metadata }.
   */
  async upsertChunks(chunks) {
    if (!chunks || chunks.length === 0) return;

    await this.ensureCollection();

    const points = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.content, this.config.embedding);
      points.push({
        id: uuidv4(),
        vector: embedding,
        payload: { ...chunk.metadata, content: chunk.content }, // Store content in payload
      });
    }

    try {
      await this.client.upsertPoints(this.collectionName, {
        points: points,
        wait: true,
      });
      logger.debug(`Upserted ${points.length} points to ${this.collectionName}.`);
    } catch (error) {
      logger.error('Failed to upsert points to Qdrant:', error);
    }
  }

  /**
   * Removes all chunks associated with a specific file.
   * @param {string} filePath - The path to the file to remove.
   */
  async removeFile(filePath) {
    await this.ensureCollection();
    try {
      await this.client.deletePoints(this.collectionName, {
        filter: {
          must: [
            {
              key: 'filePath',
              match: {
                value: filePath,
              },
            },
          ],
        },
        wait: true,
      });
      logger.info(`Removed points for file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to remove points for ${filePath}:`, error);
    }
  }

  /**
   * Clears the entire collection. Used for re-indexing.
   */
  async clearCollection() {
    try {
      await this.client.getCollection(this.collectionName);
      await this.client.deleteCollection(this.collectionName);
    } catch (e) {
      if (e.status !== 404) {
        logger.error(`Error clearing collection ${this.collectionName}:`, e);
        throw e;
      }
    }
    await this.ensureCollection();
    logger.info(`Cleared and recreated collection: ${this.collectionName}`);
  }

  /**
   * Performs a semantic search in the vector store.
   * @param {Array<number>} queryVector - The vector representation of the search query.
   * @param {number} limit - The maximum number of results to return.
   * @param {object} filter - Optional Qdrant filter object.
   * @returns {Promise<Array<object>>} Search results.
   */
  async search(queryVector, limit = 10, filter = null) {
    await this.ensureCollection();
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter,
        with_payload: true,
        with_vector: false,
      });
      return results;
    } catch (error) {
      logger.error('Qdrant search failed:', error);
      return [];
    }
  }

  /**
   * Gets status information from the vector store.
   * @returns {Promise<object>} Status object.
   */
  async getStatus() {
    try {
      const collectionInfo = await this.client.getCollection(this.collectionName);
      return {
        collectionName: this.collectionName,
        vectorCount: collectionInfo.points_count,
      };
    } catch (error) {
      if (error.status === 404) {
        return { collectionName: this.collectionName, vectorCount: 0 };
      }
      logger.error('Failed to get VectorStore status:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Gets the count of unique indexed files.
   * @returns {Promise<number>}
   */
  async getUniqueFileCount() {
    logger.warn('getUniqueFileCount is not efficiently implemented and may be slow or inaccurate.');
    try {
        const result = await this.client.scroll(this.collectionName, { limit: 100000, with_payload: ['filePath'], with_vector: false });
        const uniqueFiles = new Set(result.points.map(p => p.payload.filePath));
        return uniqueFiles.size;
    } catch (error) {
        if (error.status === 404) {
            return 0;
        }
        logger.error('Failed to get unique file count:', error);
        return 0;
    }
  }
}

module.exports = VectorStore;
