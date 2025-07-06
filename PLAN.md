# Git Contextor - Aider Implementation Plan

## Project Overview

You are tasked with implementing **Git Contextor**, a CLI-first tool that monitors a git repository and provides semantically relevant code context via REST API, optimized for LLM token limits.

**Core Requirements:**
- CLI tool that runs in the background for a specific git repository
- Automatically watches for file changes and updates vector index in real-time
- Simple web UI for monitoring metrics and status
- REST API for external tools (n8n, VS Code extensions, etc.)
- Git-aware indexing (respects .gitignore, tracks file history)

## File Structure to Create

Create the following file structure exactly as specified:

```
git-contextor/
├── package.json
├── README.md
├── .gitignore
├── .env.example
├── bin/
│   └── git-contextor.js
├── src/
│   ├── index.js
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.js
│   │   │   ├── start.js
│   │   │   ├── stop.js
│   │   │   ├── status.js
│   │   │   ├── config.js
│   │   │   ├── query.js
│   │   │   └── reindex.js
│   │   └── utils/
│   │       ├── logger.js
│   │       └── spinner.js
│   ├── core/
│   │   ├── FileWatcher.js
│   │   ├── Indexer.js
│   │   ├── VectorStore.js
│   │   ├── ContextOptimizer.js
│   │   ├── ServiceManager.js
│   │   └── ConfigManager.js
│   ├── api/
│   │   ├── server.js
│   │   └── routes/
│   │       ├── search.js
│   │       ├── status.js
│   │       ├── metrics.js
│   │       └── health.js
│   ├── ui/
│   │   ├── server.js
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── metrics.html
│   │   │   ├── config.html
│   │   │   ├── css/
│   │   │   │   └── style.css
│   │   │   └── js/
│   │   │       ├── app.js
│   │   │       └── charts.js
│   │   └── templates/
│   │       └── dashboard.html
│   └── utils/
│       ├── git.js
│       ├── embeddings.js
│       ├── chunking.js
│       ├── tokenizer.js
│       └── security.js
├── test/
│   ├── unit/
│   │   ├── fileWatcher.test.js
│   │   ├── indexer.test.js
│   │   └── vectorStore.test.js
│   └── integration/
│       ├── api.test.js
│       └── e2e.test.js
├── docs/
│   ├── API.md
│   └── INTEGRATION.md
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Implementation Instructions

### Phase 1: Foundation (Core Files)

**1. Start with package.json:**
```json
{
  "name": "git-contextor",
  "version": "1.0.0",
  "description": "Git-aware code context tool with vector search and real-time monitoring",
  "main": "src/index.js",
  "bin": {
    "git-contextor": "./bin/git-contextor.js"
  },
  "scripts": {
    "start": "node bin/git-contextor.js start",
    "test": "jest",
    "dev": "nodemon bin/git-contextor.js start",
    "lint": "eslint src/**/*.js",
    "build": "echo 'No build step required'"
  },
  "keywords": ["git", "vector", "search", "code", "context", "ai", "llm"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "commander": "^11.1.0",
    "express": "^4.18.2",
    "chokidar": "^3.5.3",
    "@qdrant/js-client-rest": "^1.9.0",
    "openai": "^4.20.1",
    "@google/generative-ai": "^0.15.0",
    "@xenova/transformers": "^2.6.0",
    "tiktoken": "^1.0.10",
    "ignore": "^5.3.0",
    "simple-git": "^3.19.1",
    "tree-sitter": "^0.20.4",
    "tree-sitter-javascript": "^0.20.1",
    "tree-sitter-python": "^0.20.4",
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "inquirer": "^8.2.6",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "lodash": "^4.17.21",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "eslint": "^8.52.0",
    "supertest": "^6.3.3"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

**2. Create bin/git-contextor.js (CLI Entry Point):**
```javascript
#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for Git Contextor.
 * Sets up commander.js to handle command-line arguments and subcommands.
 */

const { program } = require('commander');
const path = require('path');

// Import command modules
const initCommand = require('../src/cli/commands/init');
const startCommand = require('../src/cli/commands/start');
const stopCommand = require('../src/cli/commands/stop');
const statusCommand = require('../src/cli/commands/status');
const configCommand = require('../src/cli/commands/config');
const queryCommand = require('../src/cli/commands/query');
const reindexCommand = require('../src/cli/commands/reindex');

program
  .name('git-contextor')
  .description('Git-aware code context tool with vector search')
  .version('1.0.0');

// Register commands
program
  .command('init')
  .description('Initialize Git Contextor in current repository')
  .option('-f, --force', 'Force initialization even if already exists')
  .action(initCommand);

program
  .command('start')
  .description('Start the Git Contextor service')
  .option('-p, --port <port>', 'API port (default: 3000)', '3000')
  .option('-u, --ui-port <port>', 'UI port (default: 3001)', '3001')
  .option('-d, --daemon', 'Run as daemon')
  .action(startCommand);

program
  .command('stop')
  .description('Stop the Git Contextor service')
  .action(stopCommand);

program
  .command('status')
  .description('Show service status and repository info')
  .action(statusCommand);

program
  .command('config')
  .description('Manage configuration')
  .option('--embedding-provider <provider>', 'Set embedding provider (openai|local)')
  .option('--api-key <key>', 'Set API key for embedding provider')
  .option('--exclude-pattern <pattern>', 'Add exclude pattern')
  .option('--max-chunk-size <size>', 'Set maximum chunk size', parseInt)
  .option('--show', 'Show current configuration')
  .action(configCommand);

program
  .command('query <search>')
  .description('Search for code context')
  .option('-t, --max-tokens <tokens>', 'Maximum tokens to return', '2048')
  .option('-l, --llm-type <type>', 'LLM type for token optimization', 'gemini-1.5-flash-latest')
  .option('-f, --filter <filter>', 'File type filter (js,ts,py)')
  .action(queryCommand);

program
  .command('reindex')
  .description('Force full reindex of repository')
  .option('-f, --file <file>', 'Reindex specific file')
  .action(reindexCommand);

program.parse();
```

**3. Create src/index.js (Main Module):**
```javascript
const path = require('path');
const fs = require('fs').promises;

// Core modules
const ServiceManager = require('./core/ServiceManager');
const ConfigManager = require('./core/ConfigManager');
const FileWatcher = require('./core/FileWatcher');
const Indexer = require('./core/Indexer');
const VectorStore = require('./core/VectorStore');
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
    
    // Initialize components
    this.vectorStore = new VectorStore(this.configManager.config);
    this.indexer = new Indexer(this.repoPath, this.vectorStore, this.configManager.config);
    this.contextOptimizer = new ContextOptimizer(this.vectorStore, this.configManager.config);
    this.fileWatcher = new FileWatcher(this.repoPath, this.indexer, this.configManager.config);
    this.serviceManager = new ServiceManager(this.repoPath, this.configManager.config, {
      fileWatcher: this.fileWatcher,
      indexer: this.indexer,
      vectorStore: this.vectorStore,
      contextOptimizer: this.contextOptimizer
    });
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
  async stop() {
    if (this.serviceManager) {
      await this.serviceManager.stop();
    }
  }

  /**
   * Gets the status of the Git Contextor services. This method is intended
   * to be called on an active GitContextor instance. The standalone `status`
   * CLI command will fetch status independently.
   * @returns {Promise<object>} A status object.
   */
  async getStatus() {
    if (!this.serviceManager) {
      // This path is taken if getStatus() is called without start().
      // The CLI status command should handle this state more gracefully by
      // checking for a PID file or making an API call.
      return { status: 'stopped', message: 'Service not running in this process.' };
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

module.exports = GitContextor;
```

### Phase 2: Core Components

**4. Implement src/core/ConfigManager.js:**
```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Manages the configuration for a Git Contextor instance.
 * Handles creating, loading, saving, and updating configuration files.
 */
class ConfigManager {
  /**
   * @param {string} repoPath The absolute path to the repository.
   */
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.configDir = path.join(repoPath, '.gitcontextor');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultConfig = {
      version: '1.0.0',
      repository: {
        path: repoPath,
        name: path.basename(repoPath),
        branch: 'main'
      },
      embedding: {
        provider: 'gemini',
        model: 'text-embedding-004',
        apiKey: null,
        dimensions: 768
      },
      chunking: {
        strategy: 'function',
        maxChunkSize: 1024,
        overlap: 50,
        includeComments: true
      },
      indexing: {
        excludePatterns: [
          'node_modules/**',
          '.git/**',
          '.gitcontextor/**',
          '*.test.js',
          '*.spec.js',
          'dist/**',
          'build/**',
          'coverage/**'
        ],
        includeExtensions: [
          '.js', '.jsx', '.ts', '.tsx',
          '.py', '.java', '.c', '.cpp', '.cs',
          '.php', '.rb', '.go', '.rs', '.kt',
          '.scala', '.swift', '.dart', '.r',
          '.html', '.css', '.scss', '.sass',
          '.json', '.yaml', '.yml', '.toml',
          '.xml', '.md', '.txt', '.sql'
        ],
        followSymlinks: false
      },
      services: {
        apiPort: 3000,
        uiPort: 3001,
        qdrantPort: 6333,
        apiKey: this.generateApiKey()
      },
      monitoring: {
        watchEnabled: true,
        debounceMs: 1000,
        maxQueueSize: 100
      },
      performance: {
        batchSize: 10,
        concurrency: 3,
        cacheEnabled: true,
        cacheTtl: 300000
      }
    };
    this.config = { ...this.defaultConfig };
  }

  /**
   * Initializes the .gitcontextor directory and config file.
   * @param {boolean} [force=false] - If true, reinitialize even if it exists.
   * @throws {Error} If already initialized and force is false.
   */
  async init(force = false) {
    try {
      await fs.access(this.configDir);
      if (!force) {
        throw new Error('Git Contextor already initialized. Use --force to reinitialize.');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Create .gitcontextor directory
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.mkdir(path.join(this.configDir, 'qdrant'), { recursive: true });
    await fs.mkdir(path.join(this.configDir, 'logs'), { recursive: true });

    // Write default config
    await this.save();

    // Create .gitignore entry
    await this.updateGitignore();
  }

  /**
   * Loads the configuration from config.json.
   * @throws {Error} If the config file is not found (not initialized).
   */
  async load() {
    try {
      const configData = await fs.readFile(this.configFile, 'utf8');
      const loadedConfig = JSON.parse(configData);
      this.config = { ...this.defaultConfig, ...loadedConfig };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Git Contextor not initialized. Run "git-contextor init" first.');
      }
      throw error;
    }
  }

  /**
   * Saves the current configuration to config.json.
   */
  async save() {
    await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
  }

  /**
   * Updates the configuration with new values and saves it.
   * @param {object} updates - An object with keys and values to update.
   */
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.save();
  }

  /**
   * Generates a secure random API key.
   * @returns {string} The generated API key.
   */
  generateApiKey() {
    return 'gctx_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Adds .gitcontextor/ to the repository's .gitignore file.
   */
  async updateGitignore() {
    const gitignorePath = path.join(this.repoPath, '.gitignore');
    const entry = '\n# Git Contextor\n.gitcontextor/\n';
    
    try {
      const content = await fs.readFile(gitignorePath, 'utf8');
      if (!content.includes('.gitcontextor/')) {
        await fs.writeFile(gitignorePath, content + entry);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(gitignorePath, entry.trim() + '\n');
      }
    }
  }
}

module.exports = ConfigManager;
```

**5. Implement src/core/FileWatcher.js:**
```javascript
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

    logger.debug(`File ${event}: ${relativePath}`);
    this.queueFileProcessing(event, filePath);
  }

  /**
   * Checks if a file is tracked by Git.
   * @param {string} filePath - The path to the file.
   * @returns {boolean} True if the file is tracked by Git.
   */
  isGitTracked(filePath) {
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
}

module.exports = FileWatcher;
```

**6. Continue with remaining core files following the same pattern...**

### Phase 3: Testing

This phase involves creating a comprehensive test suite to ensure the stability and correctness of the application.

**1. Create test/unit/configManager.test.js:**
```javascript
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ConfigManager = require('../../src/core/ConfigManager');

jest.mock('fs/promises');

describe('ConfigManager', () => {
  let repoPath;
  let configManager;

  beforeEach(async () => {
    // Create a temporary directory for the repo path
    repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
    configManager = new ConfigManager(repoPath);
    // Reset mocks before each test
    fs.access.mockReset();
    fs.mkdir.mockReset();
    fs.writeFile.mockReset();
    fs.readFile.mockReset();
  });

  afterEach(async () => {
    // Clean up the temporary directory
    // In a real file system test, you would use fs.rmdir(repoPath, { recursive: true });
  });

  describe('init', () => {
    it('should initialize configuration successfully', async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' }); // Simulate dir not existing
      await configManager.init();

      expect(fs.mkdir).toHaveBeenCalledWith(configManager.configDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(configManager.configFile, expect.any(String));
      expect(fs.writeFile).toHaveBeenCalledWith(path.join(repoPath, '.gitignore'), expect.stringContaining('.gitcontextor/'));
    });

    it('should throw an error if already initialized without force', async () => {
      fs.access.mockResolvedValue(); // Simulate dir existing
      await expect(configManager.init()).rejects.toThrow('Git Contextor already initialized.');
    });

    it('should reinitialize if force is true', async () => {
      fs.access.mockResolvedValue(); // Simulate dir existing
      await configManager.init(true);
      expect(fs.writeFile).toHaveBeenCalledWith(configManager.configFile, expect.any(String));
    });
  });

  describe('load', () => {
    it('should load the configuration file', async () => {
      const mockConfig = { repository: { name: 'test-repo' } };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      await configManager.load();
      expect(configManager.config.repository.name).toBe('test-repo');
    });

    it('should throw an error if config file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      await expect(configManager.load()).rejects.toThrow('Git Contextor not initialized.');
    });
  });

  describe('updateConfig', () => {
    it('should update and save the configuration', async () => {
      await configManager.load(); // Load defaults
      const updates = { embedding: { provider: 'local' } };
      await configManager.updateConfig(updates);

      expect(configManager.config.embedding.provider).toBe('local');
      expect(fs.writeFile).toHaveBeenCalledWith(configManager.configFile, expect.stringContaining('"provider": "local"'));
    });
  });
});
```

**2. Create test/unit/fileWatcher.test.js:**
```javascript
const FileWatcher = require('../../src/core/FileWatcher');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(),
        close: jest.fn(),
      })),
    })),
  })),
}));

jest.mock('child_process');

describe('FileWatcher', () => {
  let fileWatcher;
  let mockIndexer;
  const repoPath = '/test/repo';
  const config = {
    indexing: {
      excludePatterns: ['node_modules/**', '*.log'],
      includeExtensions: ['.js', '.py'],
    },
    monitoring: {
      debounceMs: 10,
    },
  };

  beforeEach(() => {
    mockIndexer = {
      indexFile: jest.fn(),
      removeFile: jest.fn(),
    };
    fileWatcher = new FileWatcher(repoPath, mockIndexer, config);
    execSync.mockClear();
  });

  it('should start the watcher', () => {
    fileWatcher.start();
    expect(chokidar.watch).toHaveBeenCalledWith(repoPath, expect.any(Object));
  });

  it('should handle a new supported file addition', () => {
    execSync.mockReturnValue(true); // isGitTracked returns true
    fileWatcher.isSupportedFile = jest.fn(() => true);

    fileWatcher.handleFileChange('add', '/test/repo/src/main.js');
    
    // Using fake timers to control debounce
    jest.useFakeTimers();
    setTimeout(() => {
        expect(mockIndexer.indexFile).toHaveBeenCalledWith('/test/repo/src/main.js');
    }, 20);
    jest.runAllTimers();
  });
  
  it('should ignore files not tracked by git', () => {
    execSync.mockImplementation(() => { throw new Error(); }); // isGitTracked returns false
    fileWatcher.handleFileChange('add', '/test/repo/untracked.js');
    expect(mockIndexer.indexFile).not.toHaveBeenCalled();
  });

  it('should ignore excluded files', () => {
    fileWatcher.handleFileChange('add', '/test/repo/node_modules/lib/index.js');
    expect(mockIndexer.indexFile).not.toHaveBeenCalled();
  });
  
  it('should handle file deletion', () => {
    execSync.mockReturnValue(true);
    fileWatcher.isSupportedFile = jest.fn(() => true);

    fileWatcher.handleFileChange('delete', '/test/repo/src/old.js');

    jest.useFakeTimers();
    setTimeout(() => {
      expect(mockIndexer.removeFile).toHaveBeenCalledWith('/test/repo/src/old.js');
    }, 20);
    jest.runAllTimers();
  });
});
```

**3. Placeholder for other tests:**
- `test/unit/indexer.test.js`: Should test file reading, chunking logic, and interaction with `VectorStore`. Mocks `fs`, `VectorStore`, and `chunking` utilities.
- `test/unit/vectorStore.test.js`: Should test interaction with Qdrant client, collection creation, point upsertion, and search queries. Mocks `@qdrant/js-client-rest`.
- `test/integration/api.test.js`: Uses `supertest` to make requests to the running API server, testing all endpoints (`/search`, `/status`, `/metrics`, `/health`). Requires a setup that starts the server.
- `test/integration/e2e.test.js`: A full end-to-end test. It would initialize a temporary git repo, run `git-contextor init`, `start`, make some file changes, and then use `query` or the API to verify the context is updated correctly.

### Phase 4: Documentation

**1. Create docs/API.md:**
```markdown
# Git Contextor REST API

This document outlines the REST API endpoints provided by Git Contextor.

**Base URL:** `http://localhost:3000` (configurable)
**Authentication:** All endpoints require an API key passed in the `x-api-key` header.

---

### Health Check

- **Endpoint:** `/health`
- **Method:** `GET`
- **Description:** Checks if the API server is running and responsive.
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "timestamp": "2023-10-27T10:00:00.000Z"
  }
  ```

---

### Service Status

- **Endpoint:** `/status`
- **Method:** `GET`
- **Description:** Retrieves the current status of all Git Contextor services, including the indexer and repository information.
- **Success Response (200 OK):**
  ```json
  {
    "status": "running",
    "pid": 12345,
    "repository": {
      "name": "my-project",
      "path": "/path/to/my-project"
    },
    "indexer": {
      "status": "idle",
      "totalFiles": 150,
      "lastActivity": "2023-10-27T09:55:00.000Z"
    }
  }
  ```

---

### Metrics

- **Endpoint:** `/metrics`
- **Method:** `GET`
- **Description:** Provides detailed performance and usage metrics.
- **Success Response (200 OK):**
  ```json
  {
    "indexer": {
      "totalFiles": 150,
      "totalChunks": 2500,
      "errors": 5
    },
    "vectorStore": {
      "collectionName": "git-contextor-my-project",
      "vectorCount": 2500
    },
    "system": {
      "uptime": 3600,
      "memoryUsage": "128MB"
    }
  }
  ```

---

### Semantic Search

- **Endpoint:** `/search`
- **Method:** `POST`
- **Description:** Performs a semantic search for contextually relevant code chunks.
- **Request Body:**
  ```json
  {
    "query": "how to implement user authentication",
    "maxTokens": 4096,
    "filter": {
      "fileTypes": ["js", "py"]
    },
    "llmType": "claude-sonnet"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "query": "how to implement user authentication",
    "optimizedContext": "...",
    "results": [
      {
        "filePath": "src/auth/jwt.js",
        "score": 0.92,
        "chunk": "..."
      }
    ]
  }
  ```
```

**2. Create docs/INTEGRATION.md:**
```markdown
# Integrating Git Contextor

Git Contextor is designed to be easily integrated with various development tools, CI/CD pipelines, and AI workflows.

### With VS Code Extension

A VS Code extension can use the `/search` endpoint to provide real-time, context-aware code suggestions.

1.  **Get API Key:** Retrieve the API key from `.gitcontextor/config.json`.
2.  **On User Query:** When a user types a comment query (e.g., `// how do I...?`), the extension sends it to the `/search` endpoint.
3.  **Display Results:** The returned `optimizedContext` can be displayed directly to the user or used as context for a call to an LLM.

### With n8n or Zapier

You can create automated workflows that use Git Contextor. For example, a workflow that enriches new GitHub issues with relevant code context.

1.  **Webhook Trigger:** Set up a webhook in your automation tool to trigger on a new GitHub issue.
2.  **HTTP Request Node:** Use an HTTP Request node to call the Git Contextor `/search` endpoint. Use the issue title or body as the `query`.
3.  **Update Issue:** Post the search results as a comment on the GitHub issue to provide developers with immediate context.

### Programmatic Usage

You can use any language to interact with the API. Here is a Python example:

```python
import requests
import json

API_URL = "http://localhost:3000/search"
API_KEY = "gctx_..." # Your API key

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

payload = {
    "query": "database connection pooling",
    "maxTokens": 2048
}

response = requests.post(API_URL, headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}", response.text)
```
```

### Implementation Strategy for Aider

**IMPORTANT:** When implementing with Aider, follow these guidelines:

1. **Start with the foundation files** (package.json, bin/git-contextor.js, src/index.js)
2. **Implement core components first** (ConfigManager, ServiceManager)
3. **Build API layer** (Express server with routes)
4. **Add file processing** (FileWatcher, Indexer, VectorStore)
5. **Create web UI** (Simple HTML/CSS/JS)
6. **Add CLI commands** (Each command as separate file)
7. **Write tests** (Unit and integration tests)

### Key Implementation Notes

**Vector Store Integration:**
- Use local Qdrant instance (download binary or Docker)
- Create collections with semantic naming
- Store chunks with rich metadata (filename, line numbers, function names)

**Chunking Strategy:**
- Use tree-sitter for language-aware parsing
- Preserve function/class boundaries
- Include contextual information (imports, class names)

**Token Optimization:**
- Use tiktoken for accurate token counting
- Implement greedy packing algorithm for context
- Support different LLM token limits

**Real-time Monitoring:**
- Use chokidar for cross-platform file watching
- Debounce rapid file changes
- Queue processing with error recovery

**API Design:**
- RESTful endpoints with consistent error handling
- Authentication via API keys
- CORS support for web UI

**Web UI:**
- Vanilla JavaScript (no frameworks)
- Real-time updates via polling
- Responsive design with CSS Grid

### Testing Strategy

**Unit Tests:**
- Mock file system operations
- Test chunking algorithms
- Verify vector operations

**Integration Tests:**
- End-to-end API testing
- File watching scenarios
- Error recovery

### Aider Commands Sequence

1. **Initialize project structure:**
   ```bash
   aider --message "Create the complete file structure for git-contextor project as specified in the plan"
   ```

2. **Implement foundation:**
   ```bash
   aider --message "Implement package.json, bin/git-contextor.js, and src/index.js with all dependencies and CLI structure"
   ```

3. **Build core components:**
   ```bash
   aider --message "Implement ConfigManager, ServiceManager, FileWatcher with complete functionality including git integration and file monitoring"
   ```

4. **Add vector operations:**
   ```bash
   aider --message "Implement VectorStore, Indexer, and ContextOptimizer with Qdrant integration and smart chunking"
   ```

5. **Create API layer:**
   ```bash
   aider --message "Implement Express API server with all routes for search, status, metrics, and health endpoints"
   ```

6. **Build web UI:**
   ```bash
   aider --message "Create responsive web dashboard with real-time monitoring, search interface, and metrics visualization"
   ```

7. **Add CLI commands:**
   ```bash
   aider --message "Implement all CLI commands (init, start, stop, status, config, query, reindex) with proper error handling"
   ```

8. **Write tests:**
   ```bash
   aider --message "Create comprehensive test suite with unit and integration tests for all major components"
   ```

This plan is designed to work optimally with Aider's file management capabilities and provides a clear, sequential implementation path.
