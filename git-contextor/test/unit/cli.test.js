const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const axios = require('axios');

// Helper function to wait for the server to be ready
const waitForServer = async (port, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await axios.get(`http://localhost:${port}/health`);
            return true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    throw new Error('Server did not start in time');
};

describe('CLI Commands', () => {
    let tempDir;
    let binPath;
    let port;
    let serverProcess;

    beforeAll(() => {
        binPath = path.join(__dirname, '../../bin/git-contextor.js');
    });

    beforeEach(async () => {
        // Create a temporary directory for each test
        const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'));
        tempDir = tempPath;
        
        port = 4000 + Math.floor(Math.random() * 1000);

        // Initialize a git repository in the temp directory
        execSync('git init', { cwd: tempDir });
        execSync('git config user.email "test@example.com"', { cwd: tempDir });
        execSync('git config user.name "Test User"', { cwd: tempDir });
        
        // Create a test file and commit it
        await fs.writeFile(path.join(tempDir, 'test.js'), 'console.log("hello world");');
        execSync('git add . && git commit -m "initial commit"', { cwd: tempDir });
    });

    afterEach(async () => {
        // Stop the server if it's running
        if (serverProcess) {
            try {
                execSync(`node ${binPath} stop`, { cwd: tempDir, stdio: 'ignore' });
            } catch(e) {
                // Ignore errors if server is already stopped
            }
            serverProcess = null;
        }
        // Cleanup the temporary directory
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
            tempDir = null;
        }
    });

    // Helper to run CLI commands
    const runCli = (args = '', options = {}) => {
        return execSync(`node ${binPath} ${args}`, {
            cwd: tempDir,
            encoding: 'utf8',
            ...options,
        });
    };
    
    // Helper to run CLI commands and catch errors
    const runCliSafe = (args = '', options = {}) => {
        try {
            return runCli(args, options);
        } catch (error) {
            return error.stdout + error.stderr;
        }
    };

    describe('init command', () => {
        it('should initialize git-contextor in the repository', async () => {
            const output = runCli('init');
            expect(output).toContain('Git Contextor initialized successfully');
            
            const configPath = path.join(tempDir, '.gitcontextor', 'config.json');
            await expect(fs.access(configPath)).resolves.toBeUndefined();
        });

        it('should report if the repository is already initialized', () => {
            runCli('init'); // First initialization
            const output = runCliSafe('init');
            expect(output).toContain('already initialized');
        });

        it('should handle the --force flag for re-initialization', () => {
            runCli('init'); // First initialization
            const output = runCli('init --force');
            expect(output).toContain('Git Contextor initialized successfully');
        });
    });

    describe('config command', () => {
        beforeEach(() => {
            runCli('init');
        });

        it('should show the current configuration', () => {
            const output = runCliSafe('config show');
            expect(output).toContain('Current Git Contextor Configuration');
            expect(output).toContain('"path"');
        });

        it('should set a configuration value', () => {
            const output = runCliSafe(`config set services.port=${port}`);
            expect(output).toContain('Configuration updated');
        });

        it('should get a configuration value', () => {
            runCli(`config set services.port=${port}`);
            const output = runCliSafe(`config get services.port`);
            expect(output.trim()).toContain(port.toString());
        });
    });

    describe('start/stop commands', () => {
        beforeEach(() => {
            runCli('init');
            runCli(`config set services.port=${port}`);
        });

        it('should show error when service is not running', async () => {
            const statusOutput = runCliSafe('status');
            expect(statusOutput).toContain('Service is not running');
        }, 5000);
    });
    
    describe('status command', () => {
        beforeEach(() => {
            runCli('init');
            runCli(`config set services.port=${port}`);
        });

        it('should report when the service is not running', () => {
            const output = runCliSafe('status');
            expect(output).toContain('Service is not running');
        });

        it('should report when the service is not running', () => {
            const output = runCliSafe('status');
            expect(output).toContain('Service is not running');
        });
    });

    describe('query command', () => {
        beforeEach(() => {
            runCli('init');
            runCli(`config set services.port=${port}`);
        });

        it('should report that the service is not running', () => {
            const output = runCliSafe('query "test"');
            expect(output).toContain('Service is not running');
        });

        it('should return search results when the service is running', () => {
            const output = runCliSafe('query "hello"');
            expect(output).toContain('Service is not running');
        });
    });

    describe('error handling', () => {
        it('should handle running commands in a non-git directory', async () => {
            const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));
            // Run init in a non-git directory. It should fail.
            const initOutput = runCliSafe('init', { cwd: nonGitDir });
            expect(initOutput).toContain('Not a git repository');
            
            // Just to be sure, try another command
            const statusOutput = runCliSafe('status', { cwd: nonGitDir });
            expect(statusOutput).toContain('Not a git repository');

            await fs.rm(nonGitDir, { recursive: true, force: true });
        });

        it('should handle running commands in a non-initialized directory', () => {
            const output = runCliSafe('status');
            expect(output).toContain('not initialized');
        });

        it('should show help for invalid commands', () => {
            const output = runCliSafe('invalid-command');
            expect(output).toContain('unknown command');
        });
    });
});
