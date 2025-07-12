const { GitContextor } = require('../../index');
const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const ora = require('ora');
const { checkQdrant } = require('../utils/checkQdrant');

async function waitForService(port, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`http://localhost:${port}/health`, {
                signal: AbortSignal.timeout(1000)
            });
            if (response.ok) return true;
        } catch (error) {
            logger.debug(`Service not ready yet (attempt ${i + 1}/${maxRetries}):`, error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    logger.error('Service failed to start within the expected time frame.');
    return false;
}

async function start(options) {
  const repoPath = process.cwd();
  const spinner = ora('Preparing to start Git Contextor...').start();

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

  if (options.port && config.services.port !== parseInt(options.port, 10)) {
      updates.services.port = parseInt(options.port, 10);
      configChanged = true;
  }

  // The --clean flag will force deletion of the collection. The default is to keep it.
  const keepCollection = !options.clean;
  if (config.services.keepCollectionOnExit !== keepCollection) {
      updates.services.keepCollectionOnExit = keepCollection;
      configChanged = true;
  }

  if (configChanged) {
    await configManager.updateConfig(updates);
    logger.info('Configuration updated.');
  }

  spinner.text = 'Connecting to Qdrant...';
  await checkQdrant(configManager);

  spinner.text = 'Starting services... This may take a moment for initial indexing.';
  const contextor = new GitContextor(repoPath);

  try {
      await contextor.start();
      if (!await waitForService(config.services.port)) {
          spinner.fail('Service failed to start within 30 seconds');
          logger.debug('Service startup failed. Check configuration and logs for details.');
          process.exit(1);
      } else {
          spinner.succeed(`
🚀 Git Contextor is running!

📊 Dashboard: http://localhost:${config.services.port}
🔍 Quick search: git-contextor query "your question"
📚 Documentation: git-contextor config --show

Tip: Try querying "authentication logic" or "error handling" to see it in action!
`);
      }
  } catch (error) {
      spinner.fail('Failed to start Git Contextor.');
      logger.error(error.message);
      if (error.stack) {
          logger.debug(error.stack);
      }
      process.exit(1);
  }
}

module.exports = start;
