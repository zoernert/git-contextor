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
    "qdrant-client": "^1.7.0",
    "openai": "^4.20.1",
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
  .option('-l, --llm-type <type>', 'LLM type for token optimization', 'claude-sonnet')
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

class GitContextor {
  constructor(repoPath) {
    this.repoPath = repoPath || process.cwd();
    this.configManager = new ConfigManager(this.repoPath);
    this.serviceManager = null;
    this.fileWatcher = null;
    this.indexer = null;
    this.vectorStore = null;
    this.contextOptimizer = null;
  }

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

  async start(options = {}) {
    await this.initialize();
    await this.serviceManager.start(options);
  }

  async stop() {
    if (this.serviceManager) {
      await this.serviceManager.stop();
    }
  }

  async getStatus() {
    if (!this.serviceManager) {
      return { status: 'not_running' };
    }
    return await this.serviceManager.getStatus();
  }

  async search(query, options = {}) {
    if (!this.contextOptimizer) {
      throw new Error('Service not initialized. Run "git-contextor start" first.');
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

class ConfigManager {
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
        provider: 'openai',
        model: 'text-embedding-3-small',
        apiKey: null,
        dimensions: 1536
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

  async save() {
    await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
  }

  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.save();
  }

  generateApiKey() {
    return 'gctx_' + crypto.randomBytes(32).toString('hex');
  }

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

class FileWatcher {
  constructor(repoPath, indexer, config) {
    this.repoPath = repoPath;
    this.indexer = indexer;
    this.config = config;
    this.watcher = null;
    this.processingQueue = [];
    this.isProcessing = false;
    this.ignoreFilter = ignore().add(config.indexing.excludePatterns);
  }

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

  stop() {
    if (this.watcher) {
      this.watcher.close();
      logger.info('File watcher stopped');
    }
  }

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

  isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.indexing.includeExtensions.includes(ext);
  }

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
