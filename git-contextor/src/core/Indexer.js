const fs = require('fs').promises;
const path = require('path');
const logger = require('../cli/utils/logger');
const { chunkFile } = require('../utils/chunking');
const { listGitFiles } = require('../utils/git');
const ignore = require('ignore');

/**
 * Handles reading files, chunking them, and sending them to the VectorStore for embedding and storage.
 */
class Indexer {
  /**
   * @param {string} repoPath - The absolute path to the repository.
   * @param {VectorStore} vectorStore - An instance of the VectorStore class.
   * @param {object} config - The application configuration object.
   */
  constructor(repoPath, vectorStore, config) {
    this.repoPath = repoPath;
    this.vectorStore = vectorStore;
    this.config = config;
    this.status = 'idle';
    this.lastActivity = null;
    this.totalFiles = 0;
    this.totalChunks = 0;
    this.errorCount = 0;
  }

  /**
   * Indexes a single file.
   * @param {string} filePath - The path to the file to index.
   */
  async indexFile(filePath) {
    this.status = 'indexing';
    this.lastActivity = new Date().toISOString();
    logger.info(`Indexing file: ${path.relative(this.repoPath, filePath)}`);
    try {
      // Assuming chunkFile returns an array of { content, metadata } objects
      const chunks = await chunkFile(filePath, this.repoPath, this.config.chunking);
      if (chunks && chunks.length > 0) {
        await this.vectorStore.upsertChunks(chunks);
        // this.totalChunks += chunks.length; // This will be updated from vector store status
        logger.info(`Indexed ${chunks.length} chunks for ${path.relative(this.repoPath, filePath)}`);
      }
      this.status = 'idle';
      return true;
    } catch (error) {
      logger.error(`Failed to index file ${filePath}:`, error);
      this.errorCount++;
      this.status = 'error';
      return false;
    }
  }

  /**
   * Removes a file and its chunks from the vector store.
   * @param {string} filePath - The path to the file to remove.
   */
  async removeFile(filePath) {
    this.status = 'removing';
    this.lastActivity = new Date().toISOString();
    logger.info(`Removing file from index: ${path.relative(this.repoPath, filePath)}`);
    try {
      await this.vectorStore.removeFile(filePath);
      logger.info(`Removed file: ${path.relative(this.repoPath, filePath)}`);
      this.status = 'idle';
    } catch (error) {
      logger.error(`Failed to remove file ${filePath} from index:`, error);
      this.errorCount++;
      this.status = 'error';
    }
  }

  /**
   * Clears the index and resets stats.
   */
  async clearIndex() {
    this.status = 'clearing';
    this.lastActivity = new Date().toISOString();
    logger.info('Clearing vector collection and resetting index...');
    try {
      await this.vectorStore.clearCollection();
      this.totalFiles = 0;
      this.totalChunks = 0;
      this.errorCount = 0;
      this.status = 'idle';
      logger.info('Index cleared successfully.');
    } catch (error) {
      logger.error('Failed to clear index:', error);
      this.errorCount++;
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * Performs a full re-index of the entire repository based on git-tracked files.
   */
  async reindexAll() {
    this.status = 'reindexing';
    this.lastActivity = new Date().toISOString();
    logger.info('Starting full repository re-index...');

    try {
      await this.vectorStore.clearCollection();
      this.totalFiles = 0;
      this.totalChunks = 0;

      const allGitFiles = await listGitFiles(this.repoPath);
      const ig = ignore().add(this.config.indexing.excludePatterns);

      const filesToIndex = allGitFiles.filter(file => {
        if (ig.ignores(file)) {
            return false;
        }
        const ext = path.extname(file).toLowerCase();
        return this.config.indexing.includeExtensions.includes(ext);
      });
      
      this.totalFiles = filesToIndex.length;
      logger.info(`Found ${this.totalFiles} files to index.`);
      
      const batchSize = this.config.performance.batchSize;
      for (let i = 0; i < filesToIndex.length; i += batchSize) {
        const batch = filesToIndex.slice(i, i + batchSize);
        await Promise.all(batch.map(file => this.indexFile(path.join(this.repoPath, file))));
      }

      logger.info('Full re-index completed.');
    } catch (error) {
      logger.error('Full re-index failed:', error);
      this.errorCount++;
      this.status = 'error';
    } finally {
      this.status = 'idle';
    }
  }

  /**
   * Gets the current status of the indexer.
   * @returns {Promise<object>} A status object.
   */
  async getStatus() {
    const vectorStoreStatus = await this.vectorStore.getStatus();
    this.totalChunks = vectorStoreStatus.vectorCount || 0;
    // This is currently disabled due to performance issues on large repos.
    this.totalFiles = null; 

    return {
      status: this.status,
      errorCount: this.errorCount,
      totalFiles: this.totalFiles,
      totalChunks: this.totalChunks,
      lastActivity: this.lastActivity,
    };
  }
}

module.exports = Indexer;
