const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const { get, set } = require('lodash');

async function config(options) {
  const spinner = ora('Managing configuration...').start();
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);

  try {
    await configManager.load();
  } catch (error) {
    if (error.message.includes('not initialized')) {
        spinner.fail('Git Contextor not initialized in this repository.');
        logger.info('Run "git-contextor init" to get started.');
    } else {
        spinner.fail('Configuration management failed.');
        logger.error(error.message);
    }
    process.exit(1);
  }
  
  if (options.show) {
    spinner.stop();
    console.log('Current Git Contextor Configuration');
    // Use chalk to pretty-print the JSON configuration
    console.log(chalk.green(JSON.stringify(configManager.config, null, 2)));
    return;
  }

  if (options.get) {
    spinner.stop();
    const value = get(configManager.config, options.get);
    if (value !== undefined) {
        // Check if the value is a string before calling trim()
        if (typeof value === 'string') {
            console.log(value.trim());
        } else {
            console.log(value); // Output as-is if not a string
        }
    } else {
        logger.error(`Configuration key "${options.get}" not found.`);
        process.exit(1);
    }
    return;
  }

  if (options.set) {
    spinner.stop();
    const [key, value] = options.set.split('=');
    if (!key || value === undefined) {
      logger.error('Invalid format. Use "key=value".');
      process.exit(1);
    }

    // Attempt to parse the value to its correct type
    let parsedValue = value;
    if (!isNaN(value) && value.trim() !== '') {
        parsedValue = Number(value);
    } else if (value.toLowerCase() === 'true') {
        parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
        parsedValue = false;
    }

    const updates = {};
    set(updates, key, parsedValue);

    try {
      await configManager.updateConfig(updates);
      console.log('Configuration updated');
      logger.info('Changes will take effect on the next service restart.');
    } catch (error) {
      spinner.fail('Failed to update configuration.');
      logger.error(error.message);
      process.exit(1);
    }
    return;
  }

  if (options.tunneling) {
    spinner.stop();
    const tunnelingOptions = options.tunneling;
    
    try {
      const updates = { tunneling: {} };
      
      if (tunnelingOptions.provider) {
        updates.tunneling.provider = tunnelingOptions.provider;
      }
      
      if (tunnelingOptions.apiKey) {
        updates.tunneling.managed = updates.tunneling.managed || {};
        updates.tunneling.managed.apiKey = tunnelingOptions.apiKey;
      }
      
      if (tunnelingOptions.apiUrl) {
        updates.tunneling.managed = updates.tunneling.managed || {};
        updates.tunneling.managed.apiUrl = tunnelingOptions.apiUrl;
      }
      
      if (tunnelingOptions.subdomain) {
        updates.tunneling.managed = updates.tunneling.managed || {};
        updates.tunneling.managed.subdomain = tunnelingOptions.subdomain;
      }
      
      await configManager.updateConfig(updates);
      console.log(chalk.green('✅ Tunneling configuration updated'));
      
      if (tunnelingOptions.provider) {
        console.log(chalk.blue('Provider:'), tunnelingOptions.provider);
      }
      if (tunnelingOptions.apiKey) {
        console.log(chalk.blue('API Key:'), '****' + tunnelingOptions.apiKey.slice(-4));
      }
      if (tunnelingOptions.apiUrl) {
        console.log(chalk.blue('API URL:'), tunnelingOptions.apiUrl);
      }
      if (tunnelingOptions.subdomain) {
        console.log(chalk.blue('Subdomain:'), tunnelingOptions.subdomain);
      }
      
      logger.info('Changes will take effect on the next service restart.');
    } catch (error) {
      spinner.fail('Failed to update tunneling configuration.');
      logger.error(error.message);
      process.exit(1);
    }
    return;
  }

  spinner.stop();
  // If no subcommand, print current configuration
  console.log('Current Git Contextor Configuration');
  console.log(chalk.green(JSON.stringify(configManager.config, null, 2)));
}

module.exports = config;
