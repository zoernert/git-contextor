const GitContextor = require('../../index');
const logger = require('../utils/logger');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

async function status() {
  const spinner = ora('Fetching status...').start();
  const repoPath = process.cwd();

  try {
    await fs.access(path.join(repoPath, '.gitcontextor'));
  } catch (error) {
    spinner.warn('Git Contextor not initialized in this repository.');
    logger.info('Run "git-contextor init" to get started.');
    process.exit(0);
  }
  
  try {
    const contextor = new GitContextor(repoPath);
    await contextor.initialize();
    const statusData = await contextor.getStatus();

    if (statusData.status === 'stopped' || statusData.status === 'not_running') {
        spinner.succeed(chalk.yellow('Git Contextor is stopped.'));
        return;
    }

    spinner.succeed(chalk.green('Git Contextor is running.'));

    logger.info(chalk.bold('\n--- Repository Info ---'));
    logger.info(`${chalk.cyan('Name:')}      ${statusData.repository?.name || 'N/A'}`);
    logger.info(`${chalk.cyan('Path:')}      ${statusData.repository?.path || 'N/A'}`);

    logger.info(chalk.bold('\n--- Service Status ---'));
    logger.info(`${chalk.cyan('PID:')}       ${statusData.pid}`);
    logger.info(`${chalk.cyan('API Port:')}  ${statusData.apiPort}`);
    logger.info(`${chalk.cyan('UI Port:')}   ${statusData.uiPort}`);
    
    logger.info(chalk.bold('\n--- Indexer Status ---'));
    logger.info(`${chalk.cyan('Indexed Files:')}  ${statusData.indexer?.totalFiles || 0}`);
    logger.info(`${chalk.cyan('Total Chunks:')}   ${statusData.indexer?.totalChunks || 0}`);
    logger.info(`${chalk.cyan('Last Update:')}    ${statusData.indexer?.lastActivity ? new Date(statusData.indexer.lastActivity).toLocaleString() : 'N/A'}`);

  } catch (error) {
    spinner.fail('Failed to get status.');
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = status;
