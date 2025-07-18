const fs = require('fs').promises;
const path = require('path');
const logger = require('../cli/utils/logger');
const docxParser = require('docx-parser');
const xlsx = require('xlsx');
const { chunkFile, chunkText } = require('../utils/chunking');
const { getImageDescription } = require('../utils/vision');
const { listGitFiles } = require('../utils/git');
const ignore = require('ignore');

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

function isImageFile(filePath) {
    return IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

const OFFICE_EXTENSIONS = ['.docx', '.xlsx'];
const DOCX_EXT = '.docx';
const XLSX_EXT = '.xlsx';

function isOfficeFile(filePath) {
    return OFFICE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

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
    this.isGitRepo = false;
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

    try {
      let chunks = [];
      const relativeFilePath = path.relative(this.repoPath, filePath);

      if (isImageFile(filePath)) {
        if (this.config.vision && this.config.vision.enabled) {
          logger.info(`Generating description for image: ${relativeFilePath}`);
          const description = await getImageDescription(filePath, this.config.vision);
          if (description) {
            chunks = chunkText(description, relativeFilePath, this.config.chunking);
            if (!chunks || chunks.length === 0) {
              logger.warn(`Generated description for ${relativeFilePath} resulted in 0 chunks.`);
            }
          } else {
            logger.warn(`Could not generate a description for image ${relativeFilePath}. Skipping.`);
          }
        } else {
          logger.debug(`Skipping image file (vision support disabled): ${relativeFilePath}`);
        }
      } else if (isOfficeFile(filePath)) {
        logger.info(`Extracting text from Office file: ${relativeFilePath}`);
        let textContent = '';
        const ext = path.extname(filePath).toLowerCase();

        try {
            switch (ext) {
                case DOCX_EXT:
                    textContent = await new Promise((resolve, reject) => {
                        docxParser.parseDocx(filePath, (data, err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(data);
                        });
                    });
                    break;
                case XLSX_EXT:
                    const xlsxBuffer = await fs.readFile(filePath);
                    const workbook = xlsx.read(xlsxBuffer, { type: 'buffer' });
                    let fullText = [];
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const sheetText = xlsx.utils.sheet_to_csv(sheet);
                        fullText.push(sheetText);
                    });
                    textContent = fullText.join('\n\n');
                    break;
            }

            if (textContent && textContent.trim().length > 0) {
                chunks = chunkText(textContent, relativeFilePath, this.config.chunking);
                if (!chunks || chunks.length === 0) {
                    logger.warn(`Extracted text from ${relativeFilePath} resulted in 0 chunks.`);
                }
            } else {
                logger.warn(`Could not extract any text from Office file ${relativeFilePath}. Skipping.`);
            }
        } catch(extractError) {
             logger.error(`Failed to extract text from ${relativeFilePath}:`, extractError);
        }
      } else {
        logger.info(`Indexing file: ${relativeFilePath}`);
        chunks = await chunkFile(filePath, this.repoPath, this.config.chunking);
      }

      if (chunks && chunks.length > 0) {
        await this.vectorStore.upsertChunks(chunks);
        this.totalChunks += chunks.length;
        this.totalFiles++; // Increment total files count
        const logMessage = isImageFile(filePath)
          ? `Indexed description for image ${relativeFilePath} as ${chunks.length} chunks.`
          : `Indexed ${chunks.length} chunks for ${relativeFilePath}`;
        logger.info(logMessage);
      }

      this.status = 'completed';
      logger.info('Indexing completed successfully.');
      return true;
    } catch (error) {
      logger.error(`Failed to index file ${filePath}:`, error);
      this.errorCount++;
      this.status = 'error';
      // Re-throw the error so that the caller can handle it, e.g., for batch processing.
      throw error;
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

        let filesToConsider = [];
        if (this.isGitRepo) {
            logger.info('Discovering files via Git...');
            filesToConsider = await listGitFiles(this.repoPath);
        } else {
            logger.info('Discovering files via file system scan (non-Git mode)...');
            filesToConsider = await this._findAllFiles(this.repoPath);
        }

        const ig = ignore().add(this.config.indexing.excludePatterns);
        const filesToIndex = filesToConsider.filter(file => !ig.ignores(file));

        const batchSize = 10;
        for (let i = 0; i < filesToIndex.length; i += batchSize) {
            const batch = filesToIndex.slice(i, i + batchSize).map(file => path.join(this.repoPath, file));
            const results = await Promise.allSettled(batch.map(file => this.indexFile(file)));

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    logger.error(`File failed to index during re-index: ${batch[index]}`);
                }
            });
        }

        this.status = 'completed';
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

  /**
   * Recursively finds all files in a directory, for use in non-git repositories.
   * Returns a list of paths relative to the startPath.
   * @param {string} startPath - The absolute path to start the search from.
   * @returns {Promise<string[]>} A list of relative file paths.
   * @private
   */
  async _findAllFiles(startPath) {
    const files = [];
    // These should always be ignored in non-git mode, especially node_modules for performance.
    const hardcodedIgnores = new Set(['.git', '.gitcontextor', 'node_modules']);

    const walk = async (currentDir) => {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (err) {
            logger.debug(`Could not read directory ${currentDir}, skipping. Error: ${err.message}`);
            return;
        }

        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (hardcodedIgnores.has(entry.name)) {
                    continue;
                }
                await walk(path.join(currentDir, entry.name));
            } else if (entry.isFile()) {
                files.push(path.relative(startPath, path.join(currentDir, entry.name)));
            }
        }
    };

    await walk(startPath);
    return files;
  }
}

module.exports = Indexer;
