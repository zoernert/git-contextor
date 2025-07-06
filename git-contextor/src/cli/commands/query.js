const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');

async function query(searchQuery, options) {
  const spinner = ora('Searching...').start();
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);
  
  try {
    await configManager.load();
  } catch (error) {
    spinner.fail('Query failed.');
    logger.error('Git Contextor not initialized in this repository. Run "git-contextor init" first.');
    process.exit(1);
  }

  const { apiPort, apiKey } = configManager.config.services;
  const url = `http://localhost:${apiPort}/api/search`;
  
  try {
    const searchOptions = {
        query: searchQuery,
        maxTokens: parseInt(options.maxTokens, 10),
        llmType: options.llmType,
    };
    if (options.filter) {
        searchOptions.filter = { fileTypes: options.filter.split(',') };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify(searchOptions)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error (${response.status}): ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    spinner.succeed('Search complete.');

    if (!data.results || data.results.length === 0) {
      logger.info('No relevant context found.');
      return;
    }

    logger.info(chalk.bold.blue(`\nOptimized context for query "${searchQuery}": (${data.tokenCount} tokens)`));
    console.log(chalk.gray('---'));
    console.log(data.optimizedContext);
    console.log(chalk.gray('---\n'));

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
        spinner.fail('Search failed. Is the Git Contextor service running? (run "git-contextor start")');
    } else {
        spinner.fail('Search failed.');
        logger.error(error.message);
    }
    process.exit(1);
  }
}

module.exports = query;
