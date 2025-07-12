const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

/**
 * Checks if a directory is a git repository.
 * @param {string} repoPath - The absolute path to check.
 * @returns {Promise<boolean>} True if it's a git repository.
 */
async function isGitRepository(repoPath) {
  try {
    const git = simpleGit(repoPath);
    await git.status();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Lists all files tracked by git that are committed.
 * @param {string} repoPath - The absolute path to the repository.
 * @returns {Promise<Array<string>>} A list of relative file paths.
 */
async function listGitFiles(repoPath) {
  try {
    const git = simpleGit(repoPath);
    // Use git ls-tree to get only committed files
    const files = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD']);
    
    if (!files) {
      return [];
    }

    return files.split('\n').filter(file => !!file);
  } catch (error) {
    // If there's no HEAD (no commits), return empty array
    if (error.message.includes('HEAD') || error.message.includes('does not exist')) {
      return [];
    }
    return [];
  }
}

module.exports = { isGitRepository, listGitFiles };
