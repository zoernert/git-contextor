const path = require('path');
const fs = require('fs').promises;

// Core modules
const ServiceManager = require('./core/ServiceManager');
const ConfigManager = require('./core/ConfigManager');
const FileWatcher = require('./core/FileWatcher');
const Indexer = require('./core/Indexer');
const VectorStore = require('./core/VectorStore'); // This is the Qdrant implementation
const MemoryVectorStore = require('./core/MemoryVectorStore');
const ContextOptimizer = require('./core/ContextOptimizer');

// Utilities
const logger = require('./cli/utils/logger');

/**
 * Main class for the Git Contextor application.
 * Orchestrates all the components like configuration, services, and core functionalities.
 * This class is primarily used by the `start` command. Other commands may
 * instantiate components directly to perform their tasks.
 */
class GitContextor {
  /**
   * @param {string} [repoPath=process.cwd()] - The path to the git repository.
   */
  constructor(repoPath) {
    this.repoPath = repoPath || process.cwd();
    this.configManager = new ConfigManager(this.repoPath);
    this.serviceManager = null;
    this.fileWatcher = null;
    this.indexer = null;
    this.vectorStore = null;
    this.contextOptimizer = null;
  }

  /**
   * Initializes all components of Git Contextor.
   * Loads configuration, sets up vector store, indexer, etc.
   * @returns {Promise<void>}
   * @throws {Error} If configuration cannot be loaded.
   */
  async initialize() {
    // Load configuration
    await this.configManager.load();
    const config = this.configManager.config;
    
    // Initialize components
    const vectorStoreProvider = config.vectorStore.provider;
    const qdrantHost = config.vectorStore.qdrant.host;

    if (vectorStoreProvider === 'qdrant' || (vectorStoreProvider === 'auto' && qdrantHost)) {
        logger.info(`Using Qdrant vector store at ${qdrantHost}:${config.vectorStore.qdrant.port}`);
        this.vectorStore = new VectorStore(config);
        config.vectorStore.provider = 'qdrant'; // Solidify the provider choice for this session
    } else {
        logger.info('Using in-memory vector store. No Qdrant host configured or provider is set to memory.');
        this.vectorStore = new MemoryVectorStore(config);
        config.vectorStore.provider = 'memory'; // Solidify the provider choice for this session
    }
    this.indexer = new Indexer(this.repoPath, this.vectorStore, config);
    this.contextOptimizer = new ContextOptimizer(this.vectorStore, config);
    const services = {
        indexer: this.indexer,
        vectorStore: this.vectorStore,
        contextOptimizer: this.contextOptimizer,
    };
    this.fileWatcher = new FileWatcher(this.repoPath, this.indexer, config);
    services.fileWatcher = this.fileWatcher; // Add to services object
    this.serviceManager = new ServiceManager(this.repoPath, config, services);
  }

  /**
   * Starts the Git Contextor services after initialization.
   * @param {object} [options={}] - Start options, e.g., for running as a daemon.
   * @returns {Promise<void>}
   */
  async start(options = {}) {
    await this.initialize();
    await this.serviceManager.start(options);
  }

  /**
   * Stops the Git Contextor services. This method is intended to be called
   * on an active GitContextor instance (one that has been `start`ed). 
   * The standalone `stop` CLI command will manage service shutdown independently.
   * @returns {Promise<void>}
   */
  async stop(options = {}) {
    // For in-process stop, we need a ServiceManager instance.
    // The CLI stop command will use a different mechanism for daemons.
    if (!this.serviceManager) {
        await this.initialize();
    }
    await this.serviceManager.stop(options);
  }

  /**
   * Gets the status of the Git Contextor services. This method is intended
   * to be called on an active GitContextor instance. The standalone `status`
   * CLI command will fetch status independently via API.
   * @returns {Promise<object>} A status object.
   */
  async getStatus() {
    if (!this.serviceManager) {
      await this.initialize();
    }
    return await this.serviceManager.getStatus();
  }

  /**
   * Performs a semantic search. This method is for programmatic use within a
   * running application instance. The standalone `query` CLI command will
   * make an API request to the running service instead.
   * @param {string} query - The search query.
   * @param {object} [options={}] - Search options like `maxTokens`.
   * @returns {Promise<object>} Search results.
   * @throws {Error} If service is not initialized.
   */
  async search(query, options = {}) {
    if (!this.contextOptimizer) {
      // For programmatic use, the service must be initialized first.
      await this.initialize();
    }
    return await this.contextOptimizer.search(query, options);
  }
}

module.exports = {
  GitContextor,
  ServiceManager,
  ConfigManager,
  FileWatcher,
  Indexer,
  VectorStore,
  MemoryVectorStore,
  ContextOptimizer,
  APIServer: require('./api/server'),
  MCPServer: require('./core/MCPServer'),
  SharingService: require('./core/SharingService'),
  utils: {
    chunking: require('./utils/chunking'),
    embeddings: require('./utils/embeddings'),
    git: require('./utils/git'),
    llm: require('./utils/llm'),
    security: require('./utils/security'),
    tokenizer: require('./utils/tokenizer'),
    vision: require('./utils/vision'),
  },
};
