const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');

async function init(options) {
  const spinner = ora('Initializing Git Contextor...').start();
  try {
    const configManager = new ConfigManager(process.cwd());
    await configManager.init(options.force);
    spinner.succeed('Git Contextor initialized successfully.');
    logger.info(`Configuration file created at ${configManager.configFile}`);
    logger.info('Run "git-contextor start" to begin monitoring the repository.');
  } catch (error) {
    spinner.fail('Initialization failed.');
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = init;
