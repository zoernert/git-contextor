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

    } catch (error) {
        spinner.fail('Chat failed');
        logger.error(error.message);
        process.exit(1);
    }
}

module.exports = chat;
