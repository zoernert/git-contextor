const GitContextor = require('../../index');
const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;

async function query(searchQuery, options) {
  const spinner = ora('Searching...').start();
  const repoPath = process.cwd();

  try {
    await fs.access(path.join(repoPath, '.gitcontextor'));
  } catch (error) {
    spinner.fail('Query failed.');
    logger.error('Git Contextor not initialized in this repository. Run "git-contextor init" first.');
    process.exit(1);
  }

  try {
    const contextor = new GitContextor(repoPath);
    await contextor.initialize();

    const searchOptions = {
        maxTokens: parseInt(options.maxTokens, 10),
        llmType: options.llmType,
        filter: options.filter ? options.filter.split(',') : undefined
    };

    const results = await contextor.search(searchQuery, searchOptions);
    
    spinner.succeed('Search complete.');

    if (!results || results.length === 0) {
      logger.info('No relevant context found.');
      return;
    }

    logger.info(chalk.bold(`\nTop context for query: "${searchQuery}"\n`));
    
    results.forEach((result, index) => {
      logger.info(chalk.cyan(`--- Result ${index + 1} | Score: ${result.score.toFixed(4)} ---`));
      logger.info(chalk.yellow(`File: ${result.metadata.file_path}`));
      logger.info(chalk.yellow(`Lines: ${result.metadata.start_line}-${result.metadata.end_line}`));
      logger.info('```');
      console.log(result.payload.code);
      logger.info('```\n');
    });

  } catch (error) {
    spinner.fail('Search failed.');
    logger.error(error.message);
    if(error.stack) logger.debug(error.stack);
    process.exit(1);
  }
}

module.exports = query;
