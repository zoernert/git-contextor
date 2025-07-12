const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const { isGitRepository } = require('../../utils/git');
const chalk = require('chalk');

async function init(options) {
  const spinner = ora('Checking repository status...').start();
  
  // Await the isGitRepository check, as it is async
  const isGitRepo = await require('../../utils/git').isGitRepository(process.cwd());
  if (!isGitRepo) {
    spinner.fail('Not a git repository.');
    console.log('Error: Not a git repository.');
    console.log('Please run Git Contextor from the root of a git repository.');
    logger.error('Please run Git Contextor from the root of a git repository.');
    process.exit(1);
  }

  const configManager = new ConfigManager(process.cwd());

  try {
    await fs.access(configManager.configFile);
    if (!options.force) {
      spinner.info('Git Contextor already initialized. Use --force to reinitialize.');
      console.log('Git Contextor already initialized. Use --force to reinitialize.');
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      spinner.fail('Error checking initialization status.');
      console.log('Error: Unable to check initialization status.');
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
        {
          type: 'confirm',
          name: 'setupTunneling',
          message: 'Would you like to set up tunneling for sharing your repository with AI agents?',
          default: true,
        },
      ];

      const answers = await inquirer.prompt(questions);

      // Handle tunnel setup
      if (answers.setupTunneling) {
        console.log('\n' + chalk.blue('🚇 Tunnel Setup'));
        console.log('Git Contextor can create secure tunnels to share your repository with AI agents.');
        console.log('We recommend using tunnel.corrently.cloud for enterprise-grade security.');
        console.log('\nTo get your CORRENTLY_TUNNEL_API_KEY:');
        console.log('  1. Visit ' + chalk.cyan('https://tunnel.corrently.cloud/') + ' in your browser.');
        console.log('  2. Sign up or log in to your Corrently Tunnel account.');
        console.log('  3. Go to your dashboard and copy your API key.');
        console.log('  4. Paste it below when prompted, or set it later using the frontend or by exporting CORRENTLY_TUNNEL_API_KEY.');
        console.log('  5. You can always manage this key via the web UI (Config > Tunnel Configuration).');
        console.log('');

        const tunnelQuestions = [
          {
            type: 'rawlist',
            name: 'tunnelProvider',
            message: 'Choose your tunnel provider:',
            choices: [
              { name: 'tunnel.corrently.cloud (Recommended - Enterprise-grade, secure)', value: 'corrently' },
              { name: 'localtunnel (Free but less reliable)', value: 'localtunnel' },
              { name: 'Skip for now', value: 'skip' },
            ],
            default: 1,
          },
        ];

        const tunnelAnswers = await inquirer.prompt(tunnelQuestions);

        if (tunnelAnswers.tunnelProvider === 'corrently') {
          console.log('\n' + chalk.green('🔑 Getting your tunnel.corrently.cloud API Key'));
          console.log('To use tunnel.corrently.cloud, you need an API key:');
          console.log('1. Visit: ' + chalk.cyan('https://tunnel.corrently.cloud/'));
          console.log('2. Sign up or log in to your account');
          console.log('3. Navigate to your dashboard');
          console.log('4. Copy your API key');
          console.log('5. Paste it below or set it as an environment variable later\n');

          const apiKeyQuestions = [
            {
              type: 'password',
              name: 'tunnelApiKey',
              message: 'Enter your tunnel.corrently.cloud API Key (or press Enter to skip):',
              mask: '*',
              validate: (input) => {
                if (!input) {
                  return 'You can set this later with: export CORRENTLY_TUNNEL_API_KEY=your_key';
                }
                return true;
              },
            },
          ];

          const apiKeyAnswers = await inquirer.prompt(apiKeyQuestions);
          Object.assign(answers, tunnelAnswers, apiKeyAnswers);
        } else {
          Object.assign(answers, tunnelAnswers);
        }
      }

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

      // Add tunnel configuration if set up
      if (answers.setupTunneling && answers.tunnelProvider && answers.tunnelProvider !== 'skip') {
        userConfig.tunneling = {
          provider: answers.tunnelProvider,
        };

        if (answers.tunnelProvider === 'corrently') {
          userConfig.tunneling.corrently = {
            serverUrl: 'https://tunnel.corrently.cloud',
            apiKey: answers.tunnelApiKey || process.env.CORRENTLY_TUNNEL_API_KEY || null,
            description: 'Git Contextor Share',
          };
        }
      }

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

    // Add tunnel configuration from environment if not already set
    if (!userConfig.tunneling && process.env.CORRENTLY_TUNNEL_API_KEY) {
      userConfig.tunneling = {
        provider: 'corrently',
        corrently: {
          serverUrl: 'https://tunnel.corrently.cloud',
          apiKey: process.env.CORRENTLY_TUNNEL_API_KEY,
          description: 'Git Contextor Share',
        },
      };
    }

    spinner.start('Applying configuration...');

    await configManager.init(userConfig, options.force);

    spinner.succeed('Git Contextor initialized successfully.');
    console.log('Git Contextor initialized successfully');
    logger.info(`Configuration file saved to ${configManager.configFile}`);
    
    // Display tunnel setup summary
    if (userConfig.tunneling) {
      console.log('\n' + chalk.blue('🚇 Tunnel Configuration:'));
      console.log(`Provider: ${userConfig.tunneling.provider}`);
      if (userConfig.tunneling.provider === 'corrently') {
        if (userConfig.tunneling.corrently.apiKey) {
          console.log('✅ API key configured');
          console.log('Test your connection: ' + chalk.cyan('npx git-contextor tunnel test'));
        } else {
          console.log('⚠️  API key not set');
          console.log('Set it with: ' + chalk.cyan('export CORRENTLY_TUNNEL_API_KEY=your_key'));
        }
      }
    }
    
    logger.info('\nRun "npx git-contextor start" to begin monitoring and indexing the repository.');
  } catch (error) {
    spinner.fail('Initialization failed.');
    console.log('Error: Initialization failed.');
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = init;
