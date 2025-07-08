const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { merge } = require('lodash');
require('dotenv').config();

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
        provider: 'local', // Safe default - no API key needed
        model: 'Xenova/all-MiniLM-L6-v2',
        apiKey: process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY || null,
        dimensions: 384
      },
      chat: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: null
      },
      vision: {
        enabled: false,
        provider: null,
        model: null,
        apiKey: null,
        prompt: 'Describe this image for a software developer. Focus on text, code, diagrams, UI elements, and technical content. Be concise but comprehensive.'
      },
      chunking: {
        strategy: 'function',
        maxChunkSize: 1024,
        overlap: 0.25,
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
          '.xml', '.md', '.txt', '.sql', '.pdf'
        ],
        followSymlinks: false
      },
      vectorStore: {
        provider: 'auto', // 'auto', 'memory', 'qdrant'
        memory: {
          persistence: true
        },
        qdrant: {
          host: null,
          port: 6333
        }
      },
      services: {
        port: 3333,
        apiKey: this.generateApiKey(),
        keepCollectionOnExit: true
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

  async init(initialOverrides = {}, force = false) {
    try {
      await fs.access(this.configDir);
      if (!force) {
        // This case is handled in the init command now, but we keep it for safety.
        throw new Error('Git Contextor already initialized. Use --force to reinitialize.');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Create .gitcontextor directory
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.mkdir(path.join(this.configDir, 'qdrant'), { recursive: true });
    await fs.mkdir(path.join(this.configDir, 'logs'), { recursive: true });

    // Apply overrides to default config before saving
    this.config = merge(this.config, initialOverrides);

    // Write the merged config
    await this.save();

    // Create .gitignore entry
    await this.updateGitignore();
  }

  async load() {
    try {
      const configData = await fs.readFile(this.configFile, 'utf8');
      const loadedConfig = JSON.parse(configData);
      this._migrateConfig(loadedConfig); // Ensure old configs are compatible
      this.config = merge({}, this.defaultConfig, loadedConfig);
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

  _migrateConfig(config) {
    if (config.services?.qdrantHost || config.services?.qdrantPort) {
      config.vectorStore = config.vectorStore || {};
      config.vectorStore.provider = 'qdrant';
      config.vectorStore.qdrant = {
        host: config.services.qdrantHost || 'localhost',
        port: config.services.qdrantPort || 6333
      };
      
      delete config.services.qdrantHost;
      delete config.services.qdrantPort;
    }
    return config;
  }

  async updateConfig(updates) {
    this.config = merge(this.config, updates);
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
