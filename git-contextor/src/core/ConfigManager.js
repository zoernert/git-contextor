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
      services: {
        port: 3000,
        qdrantHost: 'localhost',
        qdrantPort: 6333,
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
