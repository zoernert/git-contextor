const GitContextor = require('../../index');
const logger = require('../utils/logger');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;

async function reindex(options) {
  const repoPath = process.cwd();
  
  try {
    await fs.access(path.join(repoPath, '.gitcontextor'));
  } catch (error) {
    logger.error('Reindex failed. Git Contextor not initialized. Run "git-contextor init" first.');
    process.exit(1);
  }

  const spinner = ora().start();
  
  try {
    const contextor = new GitContextor(repoPath);
    await contextor.initialize();

    if (options.file) {
      const filePath = path.resolve(repoPath, options.file);
      spinner.text = `Reindexing file: ${options.file}...`;
      await contextor.indexer.indexFile(filePath);
      spinner.succeed(`Successfully reindexed ${options.file}.`);
    } else {
      spinner.text = 'Starting full repository reindex... (This may take a while)';
      // Assuming runFullIndex exists on indexer and returns stats
      const stats = await contextor.indexer.runFullIndex();
      spinner.succeed('Full repository reindex complete.');
      if (stats) {
        logger.info(`- Files indexed: ${stats.files}`);
        logger.info(`- Chunks created: ${stats.chunks}`);
        logger.info(`- Errors: ${stats.errors}`);
      }
    }
  } catch (error) {
    spinner.fail('Reindex failed.');
    logger.error(error.message);
    if(error.stack) logger.debug(error.stack);
    process.exit(1);
  }
}

module.exports = reindex;
