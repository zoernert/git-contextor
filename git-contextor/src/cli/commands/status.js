const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');

async function status() {
  const spinner = ora('Fetching status...').start();
  const repoPath = process.cwd();
  const { isGitRepository } = require('../../utils/git');
  const configManager = new ConfigManager(repoPath);

  const isGitRepo = await isGitRepository(repoPath);
  if (!isGitRepo) {
    spinner.fail('Not a git repository.');
    console.log('Not a git repository');
    logger.info('Please run Git Contextor from the root of a git repository.');
    process.exit(1);
  }

  try {
    await configManager.load();
  } catch (error) {
    spinner.stop();
    console.log('not initialized');
    logger.info('Run "git-contextor init" to get started.');
    process.exit(0);
  }
  
  const { port, apiKey } = configManager.config.services;
  const url = `http://localhost:${port}/api/status`;

  try {
    const response = await fetch(url, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.status === 401) {
        spinner.fail('Authentication failed. The API key may be invalid.');
        process.exit(1);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned status ${response.status}: ${errorText}`);
    }
    
    const statusData = await response.json();

    spinner.stop();
    console.log('Git Contextor is running');
    console.log('Indexer Status');
    console.log('File Watcher');
    logger.info(chalk.bold('\n--- Repository Info ---'));
    logger.info(`${chalk.cyan('Name:')}      ${statusData.repository?.name || 'N/A'}`);
    logger.info(`${chalk.cyan('Path:')}      ${statusData.repository?.path || 'N/A'}`);
    
    logger.info(chalk.bold('\n--- Indexer Status ---'));
    logger.info(`${chalk.cyan('Status:')}         ${statusData.indexer?.status || 'N/A'}`);
    logger.info(`${chalk.cyan('Indexed Files:')}  ${statusData.indexer?.totalFiles || 0}`);
    logger.info(`${chalk.cyan('Total Chunks:')}   ${statusData.indexer?.totalChunks || 0}`);
    logger.info(`${chalk.cyan('Last Update:')}    ${statusData.indexer?.lastActivity ? new Date(statusData.indexer.lastActivity).toLocaleString() : 'N/A'}`);

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.name === 'AbortError') {
        spinner.stop();
        console.log('Service is not running');
    } else {
        spinner.fail('Failed to get status.');
        logger.error(error.message);
        console.log('Service is not running');
    }
    process.exit(1);
  }
}

module.exports = status;
