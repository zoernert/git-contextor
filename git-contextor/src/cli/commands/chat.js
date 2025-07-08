const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const ConfigManager = require('../../core/ConfigManager');

async function chat(query, options) {
    const spinner = ora('Thinking...').start();
    const repoPath = process.cwd();
    const configManager = new ConfigManager(repoPath);
    
    try {
        await configManager.load();
        const { port, apiKey } = configManager.config.services;
        const url = `http://localhost:${port}/api/chat`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ 
                query,
                context_type: options.context || 'general'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        spinner.succeed('Response ready');

        console.log(chalk.blue('\n🤖 Repository AI:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(data.response);
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.dim(`Context chunks used: ${data.context_chunks}`));

        if (data.context_chunks === 0) {
            logger.warn('\nNo local context was used for this response. The index may be empty or still building.');
            logger.info('You can check the status of the index with:');
            logger.info(chalk.green('  git-contextor status'));
        }

    } catch (error) {
        spinner.fail('Chat failed');
        if (error.message.includes('fetch failed') || (error.cause && error.cause.code === 'ECONNREFUSED')) {
            logger.error('Could not connect to the Git Contextor server.');
            logger.info('Please make sure the service is running. You can start it with:');
            logger.info(chalk.green('  git-contextor start'));
        } else {
            logger.error(error.message);
        }
        process.exit(1);
    }
}

module.exports = chat;
