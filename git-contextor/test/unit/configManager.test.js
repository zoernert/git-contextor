const ConfigManager = require('../../src/core/ConfigManager');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ConfigManager', () => {
    let tempDir;
    let configManager;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-test-'));
        configManager = new ConfigManager(tempDir);
    });

    afterEach(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('initialization', () => {
        it('should create default config', async () => {
            await configManager.init();
            
            const config = configManager.getConfig();
            expect(config).toHaveProperty('repository');
            expect(config).toHaveProperty('services');
            expect(config).toHaveProperty('indexing');
            expect(config).toHaveProperty('embedding');
            expect(config).toHaveProperty('chunking');
        });

        it('should create config directory', async () => {
            await configManager.init();
            
            const configDir = path.join(tempDir, '.gitcontextor');
            const exists = await fs.access(configDir).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        it('should create config file', async () => {
            await configManager.init();
            
            const configFile = path.join(tempDir, '.gitcontextor', 'config.json');
            const exists = await fs.access(configFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });
    });

    describe('config management', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        it('should update config values', async () => {
            await configManager.updateConfig({
                services: { port: 4000 }
            });
            
            const config = configManager.getConfig();
            expect(config.services.port).toBe(4000);
        });

        it('should validate config structure', () => {
            const config = configManager.getConfig();
            
            // Check required sections
            expect(config.repository).toBeDefined();
            expect(config.services).toBeDefined();
            expect(config.indexing).toBeDefined();
            expect(config.embedding).toBeDefined();
            expect(config.chunking).toBeDefined();
            
            // Check required fields
            expect(config.repository).toHaveProperty('name');
            expect(config.repository).toHaveProperty('path');
            expect(config.services).toHaveProperty('port');
            expect(config.services).toHaveProperty('apiKey');
            expect(config.indexing).toHaveProperty('includeExtensions');
            expect(config.indexing).toHaveProperty('excludePatterns');
        });

        it('should handle partial config updates', async () => {
            const originalPort = configManager.getConfig().services.port;
            
            await configManager.updateConfig({
                services: { qdrantPort: 6334 }
            });
            
            const config = configManager.getConfig();
            expect(config.services.port).toBe(originalPort); // Should remain unchanged
            expect(config.services.qdrantPort).toBe(6334); // Should be updated
        });

        it('should persist config changes', async () => {
            await configManager.updateConfig({
                services: { port: 5000 }
            });
            
            // Create new config manager instance
            const newConfigManager = new ConfigManager(tempDir);
            await newConfigManager.load();
            
            expect(newConfigManager.getConfig().services.port).toBe(5000);
        });
    });

    describe('validation', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        it('should validate port numbers', async () => {
            await expect(configManager.updateConfig({
                services: { port: 'invalid' }
            })).rejects.toThrow();
        });

        it('should validate required fields', async () => {
            await expect(configManager.updateConfig({
                repository: { name: null }
            })).rejects.toThrow();
        });

        it('should validate array fields', async () => {
            await expect(configManager.updateConfig({
                indexing: { includeExtensions: 'not an array' }
            })).rejects.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle missing config file', async () => {
            const configManager = new ConfigManager('/non/existent/path');
            
            await expect(configManager.load()).rejects.toThrow();
        });

        it('should handle corrupted config file', async () => {
            await configManager.init();
            
            const configFile = path.join(tempDir, '.gitcontextor', 'config.json');
            await fs.writeFile(configFile, 'invalid json');
            
            await expect(configManager.load()).rejects.toThrow();
        });
    });
});
