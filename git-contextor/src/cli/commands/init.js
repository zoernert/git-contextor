const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs').promises;

async function init(options) {
  const spinner = ora('Checking repository status...').start();
  const configManager = new ConfigManager(process.cwd());

  try {
    await fs.access(configManager.configFile);
    if (!options.force) {
      spinner.info('Git Contextor already initialized. Use --force to reinitialize.');
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      spinner.fail('Error checking initialization status.');
      logger.error(error.message);
      process.exit(1);
    }
    // Not initialized, which is the expected case, so we continue.
  }
  spinner.stop();

  try {
    let userConfig;

    // Check for environment variables to skip questions
    if (process.env.GEMINI_API_KEY) {
      spinner.info('Found GEMINI_API_KEY in environment. Configuring with Google Gemini.');
      userConfig = {
        embedding: {
          provider: 'gemini',
          apiKey: process.env.GEMINI_API_KEY,
          model: 'text-embedding-004',
          dimensions: 768,
        },
        chat: {
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          apiKey: process.env.GEMINI_API_KEY,
        },
      };
    } else if (process.env.OPENAI_API_KEY) {
      spinner.info('Found OPENAI_API_KEY in environment. Configuring with OpenAI.');
      userConfig = {
        embedding: {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          model: 'text-embedding-3-small',
          dimensions: 1536,
        },
        chat: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY,
        },
      };
    }

    if (!userConfig) {
      console.log('Welcome to Git Contextor initialization!');

      const questions = [
        {
          type: 'list',
          name: 'embeddingProvider',
          message: 'Choose your embedding provider:',
          choices: [
            { name: 'Local (runs on your machine, no key needed)', value: 'local' },
            { name: 'OpenAI', value: 'openai' },
            { name: 'Google Gemini', value: 'gemini' },
          ],
          default: 'local',
        },
        {
          type: 'password',
          name: 'embeddingApiKey',
          message: 'Enter your OpenAI API Key:',
          mask: '*',
          when: (answers) => answers.embeddingProvider === 'openai' && !process.env.OPENAI_API_KEY,
          validate: (input) => !!input || 'API Key cannot be empty.',
        },
        {
          type: 'password',
          name: 'embeddingApiKey',
          message: 'Enter your Google Gemini API Key:',
          mask: '*',
          when: (answers) => answers.embeddingProvider === 'gemini' && !process.env.GOOGLE_API_KEY,
          validate: (input) => !!input || 'API Key cannot be empty.',
        },
        {
            type: 'list',
            name: 'chatProvider',
            message: 'Choose your chat model provider (for conversational search):',
            choices: [
              { name: 'OpenAI', value: 'openai' },
              { name: 'Google Gemini', value: 'gemini' },
            ],
            default: 'openai',
          },
          {
            type: 'input',
            name: 'chatModel',
            message: 'Enter the chat model to use:',
            default: (answers) => (answers.chatProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
          },
          {
            type: 'confirm',
            name: 'useSameApiKey',
            message: (answers) => `Use the same API key for the chat provider (${answers.chatProvider})?`,
            default: true,
            when: (answers) => answers.embeddingProvider === answers.chatProvider && answers.embeddingProvider !== 'local',
          },
          {
            type: 'password',
            name: 'chatApiKey',
            message: 'Enter your OpenAI API Key for chat:',
            mask: '*',
            when: (answers) =>
              answers.chatProvider === 'openai' &&
              !answers.useSameApiKey && // if they said no to using the same key
              !process.env.OPENAI_API_KEY,
            validate: (input) => !!input || 'API Key cannot be empty.',
          },
          {
            type: 'password',
            name: 'chatApiKey',
            message: 'Enter your Google Gemini API Key for chat:',
            mask: '*',
            when: (answers) =>
              answers.chatProvider === 'gemini' &&
              !answers.useSameApiKey &&
              !process.env.GOOGLE_API_KEY,
            validate: (input) => !!input || 'API Key cannot be empty.',
          },
      ];

      const answers = await inquirer.prompt(questions);

      // Construct config from answers
      userConfig = {
        embedding: {
          provider: answers.embeddingProvider,
          apiKey: answers.embeddingApiKey,
        },
        chat: {
          provider: answers.chatProvider,
          model: answers.chatModel,
          apiKey: answers.useSameApiKey ? answers.embeddingApiKey : answers.chatApiKey,
        },
      };

      // Set model and dimensions based on provider
      if (answers.embeddingProvider === 'openai') {
          userConfig.embedding.model = 'text-embedding-3-small';
          userConfig.embedding.dimensions = 1536;
      } else if (answers.embeddingProvider === 'gemini') {
          userConfig.embedding.model = 'text-embedding-004';
          userConfig.embedding.dimensions = 768;
      }
      // Local defaults are already set in ConfigManager
    }

    spinner.start('Applying configuration...');

    await configManager.init(userConfig, options.force);

    spinner.succeed('Git Contextor initialized successfully.');
    logger.info(`Configuration file saved to ${configManager.configFile}`);
    logger.info('\nRun "git-contextor start" to begin monitoring and indexing the repository.');
  } catch (error) {
    spinner.fail('Initialization failed.');
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = init;
