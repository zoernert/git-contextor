const chalk = require('chalk');

const logger = {
  info: (message) => console.log(chalk.blue(message)),
  warn: (message) => console.log(chalk.yellow(message)),
  error: (message, ...args) => console.error(chalk.red(message), ...args),
  success: (message) => console.log(chalk.green(message)),
  debug: (message, ...args) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  },
};

module.exports = logger;
