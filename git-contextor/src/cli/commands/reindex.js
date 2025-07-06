const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');

async function reindex(options) {
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);

  try {
    await configManager.load();
  } catch (error) {
    logger.error('Reindex failed. Git Contextor not initialized. Run "git-contextor init" first.');
    process.exit(1);
  }
  
  const spinner = ora().start();
  const { port, apiKey } = configManager.config.services;
  const url = `http://localhost:${port}/api/reindex`;

  try {
    const body = options.file ? { file: options.file } : {};
    
    spinner.text = options.file ? `Reindexing file: ${options.file}...` : 'Starting full repository reindex...';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
        throw new Error(`API Error (${response.status}): ${errorData.error}`);
    }

    const result = await response.json();
    spinner.succeed(result.message);
    if (response.status === 202) {
        logger.info('The reindex is running in the background. Use "git-contextor status" to monitor progress.');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
        spinner.fail('Reindex failed. Is the Git Contextor service running? (run "git-contextor start")');
    } else {
        spinner.fail('Reindex failed.');
        logger.error(error.message);
    }
    process.exit(1);
  }
}

module.exports = reindex;
