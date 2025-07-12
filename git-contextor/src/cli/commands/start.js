const { GitContextor } = require('../../index');
const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
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
    await fsp.access(path.join(repoPath, '.gitcontextor', 'config.json'));
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

  spinner.text = 'Starting background service...';

  const logFile = path.join(configManager.configDir, 'daemon.log');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');
  const mainScript = path.resolve(process.argv[1]);

  const child = spawn(process.execPath, [mainScript, 'mcp'], {
      detached: true,
      stdio: ['ignore', out, err],
      cwd: repoPath,
  });

  child.unref();

  spinner.text = 'Waiting for service to become available...';

  if (await waitForService(config.services.port)) {
      spinner.succeed(`
🚀 Git Contextor is running!

PID: ${child.pid}
Logs: ${logFile}
📊 Dashboard: http://localhost:${config.services.port}
🔍 Quick search: git-contextor query "your question"
📚 To stop: git-contextor stop
`);
  } else {
      spinner.fail('Service failed to start within 30 seconds.');
      logger.error(`Check the log file for errors: ${logFile}`);
      process.exit(1);
  }
}

module.exports = start;
