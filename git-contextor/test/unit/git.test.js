const { listGitFiles, isGitRepository } = require('../../src/utils/git');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('Git Utils', () => {
    let tempDir;
    let gitRepo;

    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-utils-test-'));
        gitRepo = path.join(tempDir, 'test-repo');
        await fs.mkdir(gitRepo);
        
        // Initialize git repository
        execSync('git init', { cwd: gitRepo });
        execSync('git config user.email "test@example.com"', { cwd: gitRepo });
        execSync('git config user.name "Test User"', { cwd: gitRepo });
        
        // Create test files
        await fs.writeFile(path.join(gitRepo, 'index.js'), 'console.log("hello");');
        await fs.writeFile(path.join(gitRepo, 'utils.py'), 'def test(): pass');
        await fs.writeFile(path.join(gitRepo, 'README.md'), '# Test Repo');
        await fs.writeFile(path.join(gitRepo, 'ignored.txt'), 'should be ignored');
        
        // Create .gitignore
        await fs.writeFile(path.join(gitRepo, '.gitignore'), 'ignored.txt\n*.log\n');
        
        // Add and commit files
        execSync('git add index.js utils.py README.md .gitignore', { cwd: gitRepo });
        execSync('git commit -m "Initial commit"', { cwd: gitRepo });
    });

    afterAll(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('isGitRepository', () => {
        it('should detect git repository', async () => {
            const result = await isGitRepository(gitRepo);
            expect(result).toBe(true);
        });

        it('should detect non-git directory', async () => {
            const nonGitDir = path.join(tempDir, 'non-git');
            await fs.mkdir(nonGitDir);
            
            const result = await isGitRepository(nonGitDir);
            expect(result).toBe(false);
        });

        it('should handle non-existent directory', async () => {
            const result = await isGitRepository('/non/existent/path');
            expect(result).toBe(false);
        });
    });

    describe('listGitFiles', () => {
        it('should list tracked files', async () => {
            const files = await listGitFiles(gitRepo);
            
            expect(Array.isArray(files)).toBe(true);
            expect(files).toContain('index.js');
            expect(files).toContain('utils.py');
            expect(files).toContain('README.md');
            expect(files).toContain('.gitignore');
            expect(files).not.toContain('ignored.txt');
        });

        it('should handle non-git directory', async () => {
            const nonGitDir = path.join(tempDir, 'non-git');
            try {
                await fs.mkdir(nonGitDir);
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
            
            const files = await listGitFiles(nonGitDir);
            expect(files).toHaveLength(0);
        });

        it('should handle repository with no commits', async () => {
            const emptyRepo = path.join(tempDir, 'empty-repo');
            await fs.mkdir(emptyRepo);
            execSync('git init', { cwd: emptyRepo });
            
            const files = await listGitFiles(emptyRepo);
            expect(files).toHaveLength(0);
        });

        it('should handle repository with staged but uncommitted files', async () => {
            // Add a new file and stage it
            await fs.writeFile(path.join(gitRepo, 'new-file.js'), 'console.log("new");');
            execSync('git add new-file.js', { cwd: gitRepo });
            
            const files = await listGitFiles(gitRepo);
            
            // Should still only show committed files
            expect(files).not.toContain('new-file.js');
            
            // Clean up
            execSync('git reset HEAD new-file.js', { cwd: gitRepo });
            await fs.unlink(path.join(gitRepo, 'new-file.js'));
        });
    });
});
