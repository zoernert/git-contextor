const chokidar = require('chokidar');
const path = require('path');
const { execSync } = require('child_process');
const ignore = require('ignore');
const logger = require('../cli/utils/logger');

/**
 * Watches the repository for file changes and triggers indexing operations.
 */
class FileWatcher {
  /**
   * @param {string} repoPath - The absolute path to the repository.
   * @param {Indexer} indexer - An instance of the Indexer class.
   * @param {object} config - The application configuration object.
   */
  constructor(repoPath, indexer, config) {
    this.repoPath = repoPath;
    this.indexer = indexer;
    this.config = config;
    this.watcher = null;
    this.processingQueue = [];
    this.isProcessing = false;
    this.ignoreFilter = ignore().add(config.indexing.excludePatterns);
    this.activityLog = [];
    this.maxLogSize = 50;
    this.isGitRepo = false;
  }

  /**
   * Starts the file watcher.
   */
  start() {
    logger.info('Starting file watcher...');
    
    this.watcher = chokidar.watch(this.repoPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.gitcontextor/**'
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath))
      .on('error', (error) => logger.error('File watcher error:', error));

    logger.info('File watcher started');
  }

  /**
   * Stops the file watcher.
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      logger.info('File watcher stopped');
    }
  }

  /**
   * Handles a file change event from chokidar.
   * @param {string} event - The type of event ('add', 'change', 'unlink').
   * @param {string} filePath - The path to the file that changed.
   */
  handleFileChange(event, filePath) {
    const relativePath = path.relative(this.repoPath, filePath);

    // Check if file should be ignored
    if (this.ignoreFilter.ignores(relativePath)) {
      return;
    }

    // Check if file is tracked by git
    if (!this.isGitTracked(filePath)) {
      return;
    }

    // Check file extension
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    const logEntry = {
        event,
        path: relativePath,
        timestamp: new Date().toISOString()
    };
    this.activityLog.unshift(logEntry);
    if (this.activityLog.length > this.maxLogSize) {
        this.activityLog.pop();
    }

    logger.debug(`File ${event}: ${relativePath}`);
    this.queueFileProcessing(event, filePath);
  }

  /**
   * Checks if a file is tracked by Git.
   * @param {string} filePath - The path to the file.
   * @returns {boolean} True if the file is tracked by Git.
   */
  isGitTracked(filePath) {
    if (!this.isGitRepo) {
      // In a non-git folder, if a file is not ignored by our patterns, we treat it as "tracked".
      return true;
    }
    try {
      const relativePath = path.relative(this.repoPath, filePath);
      execSync(`git ls-files --error-unmatch "${relativePath}"`, {
        cwd: this.repoPath,
        stdio: 'ignore'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a file has a supported extension.
   * @param {string} filePath - The path to the file.
   * @returns {boolean} True if the file extension is in the include list.
   */
  isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.indexing.includeExtensions.includes(ext);
  }

  /**
   * Adds a file change event to a queue for debounced processing.
   * @param {string} event - The file change event type.
   * @param {string} filePath - The path to the file.
   */
  queueFileProcessing(event, filePath) {
    const existing = this.processingQueue.find(item => item.filePath === filePath);
    if (existing) {
      existing.event = event;
      existing.timestamp = Date.now();
      return;
    }

    this.processingQueue.push({
      event,
      filePath,
      timestamp: Date.now()
    });

    setTimeout(() => this.processQueue(), this.config.monitoring.debounceMs);
  }

  /**
   * Processes the file change queue.
   * @private
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const items = this.processingQueue.splice(0, this.config.monitoring.maxQueueSize);

    for (const item of items) {
      try {
        await this.processFileChange(item);
      } catch (error) {
        logger.error(`Error processing ${item.filePath}:`, error);
      }
    }

    this.isProcessing = false;

    if (this.processingQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Dispatches the file change to the indexer.
   * @param {object} item - The item from the processing queue.
   * @param {string} item.event - The event type.
   * @param {string} item.filePath - The file path.
   * @private
   */
  async processFileChange({ event, filePath }) {
    switch (event) {
      case 'add':
      case 'change':
        await this.indexer.indexFile(filePath);
        break;
      case 'delete':
        await this.indexer.removeFile(filePath);
        break;
    }
  }

  getActivityLog() {
    return this.activityLog;
  }
}

module.exports = FileWatcher;
