const GitContextor = require('../../index');
const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const ora = require('ora');

async function start(options) {
  const repoPath = process.cwd();
  const spinner = ora('Starting Git Contextor...').start();

  try {
    await fs.access(path.join(repoPath, '.gitcontextor', 'config.json'));
  } catch (error) {
    spinner.fail('Start failed.');
    logger.error('Git Contextor not initialized. Please run "git-contextor init" first.');
    process.exit(1);
  }

  const configManager = new ConfigManager(repoPath);
  await configManager.load();
  
  const config = configManager.config;
  const updates = { services: { ...config.services } };
  let configChanged = false;

  if (options.port && config.services.apiPort !== parseInt(options.port, 10)) {
      updates.services.apiPort = parseInt(options.port, 10);
      configChanged = true;
  }
  if (options.uiPort && config.services.uiPort !== parseInt(options.uiPort, 10)) {
      updates.services.uiPort = parseInt(options.uiPort, 10);
      configChanged = true;
  }

  if (configChanged) {
    await configManager.updateConfig(updates);
    logger.info('Configuration updated with new port settings.');
  }

  if (options.daemon) {
    spinner.succeed('Starting Git Contextor as a daemon.');
    const args = process.argv.slice(2).filter(arg => arg !== '-d' && arg !== '--daemon');
    const daemon = spawn(process.argv[0], [process.argv[1], ...args], {
      detached: true,
      stdio: 'ignore',
      cwd: repoPath
    });
    daemon.unref();
    logger.info('Git Contextor daemon started. Use "git-contextor status" to check its state and "git-contextor stop" to terminate it.');
    process.exit(0);
  } else {
    spinner.succeed('Git Contextor starting in foreground.');
    try {
      const contextor = new GitContextor(repoPath);
      await contextor.start();
      logger.info('Git Contextor running. Press Ctrl+C to stop.');
      // Keep process alive for foreground mode
      process.stdin.resume();
    } catch (error) {
      logger.error('Failed to start Git Contextor:');
      logger.error(error.message);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  }
}

module.exports = start;
