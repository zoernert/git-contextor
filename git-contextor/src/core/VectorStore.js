const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
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
    
    // Use vectorStore config or fallback to services config for backwards compatibility
    const qdrantConfig = config.vectorStore?.qdrant || {
      host: config.services?.qdrantHost || 'localhost',
      port: config.services?.qdrantPort || 6333
    };
    
    this.client = new QdrantClient({
      url: `http://${qdrantConfig.host}:${qdrantConfig.port}`,
    });
    
    // Create a unique, stable ID for the repository based on its absolute path
    const repoId = crypto.createHash('sha256').update(this.config.repository.path).digest('hex').substring(0, 12);
    const repoName = this.config.repository.name.replace(/[^a-zA-Z0-9-]/g, '_');
    this.collectionName = `gctx-${repoName}-${repoId}`.toLowerCase();
  }

  /**
   * Validates if the existing Qdrant collection's vector dimension matches the current config.
   * @returns {Promise<boolean>} True if config matches or collection doesn't exist, false on mismatch.
   */
  async validateCollectionConfig() {
    try {
      const collectionInfo = await this.client.getCollection(this.collectionName);
      const collectionDimensions = collectionInfo.vectors_config?.params?.size;
      const configDimensions = this.config.embedding.dimensions;

      if (collectionDimensions && collectionDimensions !== configDimensions) {
        logger.warn(`Configuration Mismatch: Qdrant collection '${this.collectionName}' has dimension ${collectionDimensions}, but config expects ${configDimensions}.`);
        return false;
      }
      return true;
    } catch (error) {
      if (error.status === 404) {
        // Collection doesn't exist, so there's no mismatch. It will be created with the correct config.
        return true;
      }
      logger.error('Failed to validate collection config:', error);
      // Be safe and assume it's valid if the check itself fails for other reasons.
      return true;
    }
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
    
    const batchSize = 100; // Process in batches to avoid memory issues
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const points = [];
      
      for (const chunk of batch) {
        try {
          const embedding = await getEmbedding(chunk.content, this.config.embedding);
          if (embedding && embedding.length > 0) {
            points.push({
              id: uuidv4(),
              vector: embedding,
              payload: { ...chunk.metadata, content: chunk.content },
            });
          }
        } catch (error) {
          logger.warn(`Failed to generate embedding for chunk: ${error.message}`);
          continue; // Skip this chunk but continue with others
        }
      }

      if (points.length > 0) {
        try {
          await this.client.upsert(this.collectionName, {
            points: points,
            wait: true,
          });
          logger.debug(`Upserted ${points.length} points to ${this.collectionName}.`);
        } catch (error) {
          logger.error('Failed to upsert points to Qdrant:', error);
          throw error;
        }
      }
    }
  }

  /**
   * Removes all chunks associated with a specific file.
   * @param {string} filePath - The path to the file to remove.
   */
  async removeFile(filePath) {
    await this.ensureCollection();
    try {
      await this.client.delete(this.collectionName, {
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
   * Deletes the collection from Qdrant.
   */
  async deleteCollection() {
    logger.info(`Attempting to delete collection: ${this.collectionName}`);
    try {
        const result = await this.client.deleteCollection(this.collectionName);
        if (result) {
            logger.info(`Collection '${this.collectionName}' deleted successfully.`);
        }
    } catch (error) {
        if (error.status === 404) {
            logger.info(`Collection '${this.collectionName}' did not exist, nothing to delete.`);
        } else {
            logger.error(`Failed to delete collection '${this.collectionName}':`, error);
            // Do not re-throw, as we want shutdown to continue.
        }
    }
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
      // Re-throw to allow upstream handlers to catch and handle specific cases like dimension mismatch.
      throw error;
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
   * Gets the count of unique files in the vector store.
   * @returns {Promise<number>} Count of unique files.
   */
  async getUniqueFileCount() {
    await this.ensureCollection();
    try {
      const uniqueFiles = new Set();
      let nextOffset = null;
      
      do {
        const page = await this.client.scroll(this.collectionName, {
          offset: nextOffset,
          limit: 1000,
          with_payload: true,
          with_vector: false,
        });
        
        page.points.forEach(point => {
          if (point.payload && point.payload.filePath) {
            uniqueFiles.add(point.payload.filePath);
          }
        });
        
        nextOffset = page.next_page_offset;
      } while (nextOffset);

      return uniqueFiles.size;
    } catch (error) {
      if (error.status === 404) {
        return 0;
      }
      logger.error('Failed to get unique file count:', error);
      throw error;
    }
  }

  async getPoints(filter) {
    await this.ensureCollection();
    try {
      logger.info(`Retrieving points from Qdrant collection ${this.collectionName} with filter.`);
      const allPoints = [];
      let nextOffset = null;
      do {
        const page = await this.client.scroll(this.collectionName, {
          filter,
          offset: nextOffset,
          limit: 1000,
          with_payload: true,
          with_vector: false,
        });
        allPoints.push(...page.points);
        nextOffset = page.next_page_offset;
      } while (nextOffset);

      logger.info(`Retrieved ${allPoints.length} points with filter.`);
      return allPoints;
    } catch (error) {
        if (error.status === 404) {
            return [];
        }
        logger.error(`Error retrieving points from ${this.collectionName}:`, error);
        throw error;
    }
  }

  async getAllPoints() {
    await this.ensureCollection();
    try {
      logger.info(`Retrieving all points from Qdrant collection: ${this.collectionName}`);
      const allPoints = [];
      let nextOffset = null;
      do {
        const page = await this.client.scroll(this.collectionName, {
          offset: nextOffset,
          limit: 1000,
          with_payload: true,
          with_vector: true,
        });
        allPoints.push(...page.points);
        nextOffset = page.next_page_offset;
      } while (nextOffset);

      logger.info(`Retrieved ${allPoints.length} points.`);
      return allPoints;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      logger.error(`Error retrieving all points from ${this.collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = VectorStore;

/**
 * Checks if a Qdrant API error is due to a vector dimension mismatch.
 * @param {object} error - The error object from a Qdrant client call.
 * @returns {boolean} - True if it's a dimension mismatch error.
 */
module.exports.isDimensionMismatch = function(error) {
  const errorMessage = error?.data?.status?.error || '';
  return errorMessage.includes('Vector dimension error');
};
