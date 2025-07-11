const MCPServer = require('../../core/MCPServer');
const ConfigManager = require('../../core/ConfigManager');
const logger =require('../utils/logger');
const simpleGit = require('simple-git');

// Import all necessary services
const Indexer = require('../../core/Indexer');
const VectorStore = require('../../core/VectorStore');
const MemoryVectorStore = require('../../core/MemoryVectorStore');
const ContextOptimizer = require('../../core/ContextOptimizer');
const FileWatcher = require('../../core/FileWatcher');
const apiServer = require('../../api/server');
const SharingService = require('../../core/SharingService');

async function mcp() {
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);

  try {
    // Suppress regular info logs during startup for cleaner MCP stdio operation.
    // Errors will still be logged to stderr.
    const originalInfo = logger.info;
    logger.info = (message, ...args) => logger.debug(`[MCP Startup] ${message}`, ...args);

    await configManager.load();
    const config = configManager.config;

    // --- Service Initialization and Startup Logic (inspired by ServiceManager) ---

    // 1. Environment validation
    let isGitRepo = false;
    try {
      await simpleGit(repoPath).status();
      isGitRepo = true;
      logger.info('Git repository detected.');
    } catch (error) {
      logger.warn('No Git repository detected. Operating in non-Git mode.');
    }

    // 2. Initialize services
    const vectorStoreProvider = config.vectorStore.provider;
    const qdrantHost = config.vectorStore.qdrant?.host;

    let vectorStore;
    if (vectorStoreProvider === 'qdrant' || (vectorStoreProvider === 'auto' && qdrantHost)) {
      vectorStore = new VectorStore(config);
    } else {
      vectorStore = new MemoryVectorStore(config);
    }
    
    const indexer = new Indexer(repoPath, vectorStore, config);
    indexer.isGitRepo = isGitRepo;

    const contextOptimizer = new ContextOptimizer(vectorStore, config);
    const fileWatcher = new FileWatcher(repoPath, indexer, config);
    fileWatcher.isGitRepo = isGitRepo;

    const sharingService = new SharingService(repoPath, config);
    await sharingService.init();

    const services = { indexer, vectorStore, contextOptimizer, fileWatcher, sharingService };

    // 3. Initial indexing logic
    const isConfigValid = await vectorStore.validateCollectionConfig();
    const vectorStoreStatus = await vectorStore.getStatus();
    
    const needsReindex = !isConfigValid;
    const needsInitialIndex = isConfigValid && (!vectorStoreStatus.vectorCount || vectorStoreStatus.vectorCount === 0);

    if (needsReindex) {
        logger.info('Configuration mismatch. Triggering a full re-index...');
        await indexer.reindexAll();
    } else if (needsInitialIndex) {
        logger.info('Vector store is empty. Performing initial repository index...');
        await indexer.reindexAll();
    } else {
        logger.info(`Found ${vectorStoreStatus.vectorCount} vectors. Skipping initial index.`);
    }

    // 4. Start file watcher if enabled
    if (config.monitoring.watchEnabled) {
      fileWatcher.start();
    } else {
      logger.info('File watcher is disabled by configuration.');
    }

    // 5. Start idle summary updater
    let isUpdatingSummary = false;
    let lastSummaryUpdateTime = null;
    setInterval(async () => {
        if (isUpdatingSummary) return;

        const indexerStatus = await indexer.getStatus();
        if (indexerStatus.status !== 'idle' || !indexerStatus.lastActivity) return;

        const lastActivityTime = new Date(indexerStatus.lastActivity).getTime();
        if (lastSummaryUpdateTime && lastActivityTime < lastSummaryUpdateTime) return;

        const idleTime = Date.now() - lastActivityTime;
        if (idleTime > 20000) { // 20 seconds idle
            isUpdatingSummary = true;
            logger.info('Indexer idle. Automatically updating collection summary...');
            try {
                await contextOptimizer.summarizeCollection();
                lastSummaryUpdateTime = Date.now();
            } catch (error) {
                logger.error('Automatic collection summary update failed:', error);
            } finally {
                isUpdatingSummary = false;
            }
        }
    }, 5000);

    // --- API Server Start ---
    const serviceManager = {
      getStatus: async () => {
        const indexerStatus = await indexer.getStatus();
        const watcherStatusValue = config.monitoring.watchEnabled ? 'enabled' : 'disabled';
        return {
          status: 'running',
          repository: config.repository,
          watcher: { status: watcherStatusValue },
          indexer: indexerStatus,
          fileWatcher: { latestActivity: fileWatcher.getActivityLog() }
        };
      }
    };
    apiServer.start(config, services, serviceManager).catch(err => {
        logger.error('Failed to start API server in MCP mode:', err);
    });

    // --- MCP Server Start ---
    const mcpServer = new MCPServer(services, config);
    
    // Restore original logger for the MCP server's own messages
    logger.info = originalInfo;

    logger.info('Starting MCP server on stdio...');
    await mcpServer.startStdio();
    // After startStdio, the process is kept alive by the MCP SDK, waiting for stdio messages.

  } catch (error) {
    logger.error('Failed to start MCP server:', error.message);
    logger.debug(error.stack);
    process.exit(1);
  }
}

module.exports = mcp;
