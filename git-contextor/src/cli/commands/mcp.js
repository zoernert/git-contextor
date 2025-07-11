const MCPServer = require('../../core/MCPServer');
const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');

// Import all the services
const Indexer = require('../../core/Indexer');
const VectorStore = require('../../core/VectorStore');
const MemoryVectorStore = require('../../core/MemoryVectorStore');
const ContextOptimizer = require('../../core/ContextOptimizer');

async function mcp(options) {
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);
  
  try {
    await configManager.load();
    const config = configManager.config;

    // Initialize services (similar to main index.js)
    const vectorStoreProvider = config.vectorStore.provider;
    const qdrantHost = config.vectorStore.qdrant.host;

    let vectorStore;
    if (vectorStoreProvider === 'qdrant' || (vectorStoreProvider === 'auto' && qdrantHost)) {
      vectorStore = new VectorStore(config);
    } else {
      vectorStore = new MemoryVectorStore(config);
    }

    const indexer = new Indexer(repoPath, vectorStore, config);
    const contextOptimizer = new ContextOptimizer(vectorStore, config);

    const services = {
      indexer,
      vectorStore,
      contextOptimizer,
    };

    // Create and start MCP server
    const mcpServer = new MCPServer(services, config);
    
    // Default: stdio transport for VS Code
    await mcpServer.startStdio();

  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

module.exports = mcp;
