const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Mock dependencies
jest.mock('../../src/cli/utils/logger');
jest.mock('ora');
jest.mock('inquirer');
jest.mock('chalk');

const ora = require('ora');
const inquirer = require('inquirer');
const chalk = require('chalk');

// Mock spinner
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  text: '',
};

ora.mockReturnValue(mockSpinner);
chalk.green = jest.fn((text) => text);

describe('CLI Commands', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCwd = process.cwd();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    console.log.mockRestore();
    console.error.mockRestore();
    process.exit.mockRestore();
  });

  afterAll(async () => {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('init command', () => {
    const init = require('../../src/cli/commands/init');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should fail if not in a git repository', async () => {
      await init({});
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Not a git repository.');
    });

    it('should initialize git-contextor in a git repository', async () => {
      // Initialize git repository
      execSync('git init', { cwd: tempDir });
      
      // Mock inquirer prompts
      inquirer.prompt = jest.fn().mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        vectorModel: 'text-embedding-ada-002',
        qdrantUrl: 'http://localhost:6333',
        port: 3000,
        indexOnStartup: true,
        watchFiles: true,
        apiKeyRequired: true,
        includePatterns: ['**/*.js', '**/*.py', '**/*.md'],
        excludePatterns: ['node_modules/**', '.git/**'],
        maxFileSize: 1000000,
        chunkSize: 1000,
        chunkOverlap: 200,
        enableClustering: true,
        clusteringThreshold: 0.5,
        maxResults: 10,
        maxTokens: 4000,
        temperature: 0.7,
        contextOptimization: true,
        semanticChunking: true,
        enableSharing: false,
        shareExpirationHours: 24,
        enableMCP: false,
        mcpPort: 3001,
        enableVision: false,
        visionModel: 'gpt-4-vision-preview',
        visionMaxTokens: 300,
        enableUI: true,
        uiPath: '/contextor',
        logLevel: 'info',
        enableMetrics: true,
        enableCors: true,
        corsOrigins: ['*'],
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitWindow: 15,
        enableCompression: true,
        compressionLevel: 6,
      });

      await init({});
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Git Contextor initialized successfully.');
    });

    it('should handle force reinitialize', async () => {
      // Initialize git repository
      execSync('git init', { cwd: tempDir });
      
      // Create existing config
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), '{}');
      
      // Mock inquirer prompts
      inquirer.prompt = jest.fn().mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        vectorModel: 'text-embedding-ada-002',
        qdrantUrl: 'http://localhost:6333',
        port: 3000,
        indexOnStartup: true,
        watchFiles: true,
        apiKeyRequired: true,
        includePatterns: ['**/*.js', '**/*.py', '**/*.md'],
        excludePatterns: ['node_modules/**', '.git/**'],
        maxFileSize: 1000000,
        chunkSize: 1000,
        chunkOverlap: 200,
        enableClustering: true,
        clusteringThreshold: 0.5,
        maxResults: 10,
        maxTokens: 4000,
        temperature: 0.7,
        contextOptimization: true,
        semanticChunking: true,
        enableSharing: false,
        shareExpirationHours: 24,
        enableMCP: false,
        mcpPort: 3001,
        enableVision: false,
        visionModel: 'gpt-4-vision-preview',
        visionMaxTokens: 300,
        enableUI: true,
        uiPath: '/contextor',
        logLevel: 'info',
        enableMetrics: true,
        enableCors: true,
        corsOrigins: ['*'],
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitWindow: 15,
        enableCompression: true,
        compressionLevel: 6,
      });

      await init({ force: true });
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Git Contextor initialized successfully.');
    });

    it('should skip initialization if already initialized and not forced', async () => {
      // Initialize git repository
      execSync('git init', { cwd: tempDir });
      
      // Create existing config
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), '{}');
      
      await init({});
      
      expect(mockSpinner.info).toHaveBeenCalledWith('Git Contextor already initialized. Use --force to reinitialize.');
    });
  });

  describe('config command', () => {
    const config = require('../../src/cli/commands/config');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository and config
      execSync('git init', { cwd: tempDir });
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        port: 3000,
      }));
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should show current configuration', async () => {
      await config({ show: true });
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Current Git Contextor Configuration');
    });

    it('should set configuration value', async () => {
      await config({ set: 'port=4000' });
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Configuration updated successfully.');
    });

    it('should get configuration value', async () => {
      await config({ get: 'port' });
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('port: 3000');
    });

    it('should handle invalid configuration key', async () => {
      await config({ set: 'invalid-key-format' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Invalid configuration format.');
    });

    it('should handle non-existent configuration key', async () => {
      await config({ get: 'nonexistent' });
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('nonexistent: undefined');
    });

    it('should handle non-initialized repository', async () => {
      // Remove config file
      await fs.rm(path.join(tempDir, '.git-contextor'), { recursive: true, force: true });
      
      await config({ show: true });
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Git Contextor not initialized in this repository.');
    });
  });

  describe('status command', () => {
    const status = require('../../src/cli/commands/status');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository
      execSync('git init', { cwd: tempDir });
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should show service not running when not initialized', async () => {
      await status();
      
      expect(console.log).toHaveBeenCalledWith('Service is not running');
    });

    it('should handle non-git repository', async () => {
      // Remove git directory
      await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
      
      await status();
      
      expect(console.log).toHaveBeenCalledWith('Not a git repository.');
    });
  });

  describe('query command', () => {
    const query = require('../../src/cli/commands/query');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository and config
      execSync('git init', { cwd: tempDir });
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        port: 3000,
      }));
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle search when service is not running', async () => {
      await query('test query');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Search failed.');
    });

    it('should handle non-git repository', async () => {
      // Remove git directory
      await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
      
      await query('test query');
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Not a git repository.');
    });
  });

  describe('reindex command', () => {
    const reindex = require('../../src/cli/commands/reindex');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository and config
      execSync('git init', { cwd: tempDir });
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        port: 3000,
      }));
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle reindex when service is not running', async () => {
      await reindex();
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Reindexing failed.');
    });

    it('should handle file-specific reindex', async () => {
      await reindex({ file: 'test.js' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Reindexing failed.');
    });

    it('should handle non-git repository', async () => {
      // Remove git directory
      await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
      
      await reindex();
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Not a git repository.');
    });
  });

  describe('start command', () => {
    const start = require('../../src/cli/commands/start');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository and config
      execSync('git init', { cwd: tempDir });
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        port: 3000,
      }));
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle non-git repository', async () => {
      // Remove git directory
      await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
      
      await start();
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Not a git repository.');
    });
  });

  describe('stop command', () => {
    const stop = require('../../src/cli/commands/stop');

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-contextor-test-'));
      process.chdir(tempDir);
      
      // Initialize git repository and config
      execSync('git init', { cwd: tempDir });
      const configDir = path.join(tempDir, '.git-contextor');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        port: 3000,
      }));
    });

    afterEach(async () => {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle service not running', async () => {
      await stop();
      
      expect(mockSpinner.info).toHaveBeenCalledWith('Service is not running');
    });

    it('should handle non-git repository', async () => {
      // Remove git directory
      await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
      
      await stop();
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Not a git repository.');
    });
  });
});
