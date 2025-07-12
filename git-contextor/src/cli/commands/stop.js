const logger = require('../utils/logger');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;

async function stop() {
  const spinner = ora('Stopping Git Contextor service...').start();
  const repoPath = process.cwd();
  const pidFile = path.join(repoPath, '.gitcontextor', 'daemon.pid');

  try {
    const pid = parseInt(await fs.readFile(pidFile, 'utf8'), 10);
    
    try {
      // Send SIGTERM to request graceful shutdown
      process.kill(pid, 'SIGTERM');
      spinner.text = `Sent shutdown signal to process ${pid}. Waiting for it to terminate...`;

      // Wait up to 5 seconds for the process to exit
      let isRunning = true;
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          process.kill(pid, 0); // Check if process exists
        } catch (e) {
          isRunning = false;
          break;
        }
      }

      if (isRunning) {
        spinner.warn(`Process ${pid} did not terminate gracefully. Forcing shutdown...`);
        process.kill(pid, 'SIGKILL');
      }

      spinner.stop();
      console.log('Service stopped successfully');
    } catch (error) {
      if (error.code === 'ESRCH') {
        spinner.succeed('Service was not running, but cleaned up stale PID file.');
      } else {
        throw error;
      }
    } finally {
      // Always try to remove the PID file
      await fs.unlink(pidFile).catch(() => {});
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      spinner.warn('Git Contextor service is not running (no PID file found).');
    } else {
      spinner.fail('Failed to stop Git Contextor service.');
      logger.error(error.message);
      process.exit(1);
    }
  }
}

module.exports = stop;
