const simpleGit = require('simple-git');

/**
 * Lists all files tracked by git.
 * `simple-git`'s `ls-files` respects .gitignore by default.
 * @param {string} repoPath - The absolute path to the repository.
 * @returns {Promise<Array<string>>} A list of relative file paths.
 */
async function listGitFiles(repoPath) {
  const git = simpleGit(repoPath);
  const files = await git.raw(['ls-files']);
  
  if (!files) {
    return [];
  }

  return files.split('\n').filter(file => !!file);
}

module.exports = { listGitFiles };
