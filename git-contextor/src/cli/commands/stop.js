const GitContextor = require('../../index');
const logger = require('../utils/logger');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;

async function stop() {
  const spinner = ora('Stopping Git Contextor...').start();
  const repoPath = process.cwd();

  try {
    await fs.access(path.join(repoPath, '.gitcontextor'));
  } catch (error) {
    spinner.warn('Nothing to stop. Git Contextor not initialized here.');
    process.exit(0);
  }

  try {
    const contextor = new GitContextor(repoPath);
    await contextor.initialize();
    await contextor.stop();
    spinner.succeed('Git Contextor stopped successfully.');
  } catch (error) {
    spinner.fail('Failed to stop Git Contextor.');
    logger.error(error.message);
    if (error.stack && !error.message.includes('not running')) {
        logger.debug(error.stack);
    }
    process.exit(1);
  }
}

module.exports = stop;
