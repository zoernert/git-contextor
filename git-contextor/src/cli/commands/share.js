const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const ConfigManager = require('../../core/ConfigManager');
const { execSync } = require('child_process');

async function share(action, options) {
    const repoPath = process.cwd();
    const configManager = new ConfigManager(repoPath);
    
    try {
        await configManager.load();
        const { port, apiKey } = configManager.config.services;
        
        if (action === 'create') {
            await createShare(port, apiKey, options);
        } else if (action === 'list') {
            await listShares(port, apiKey);
        } else if (action === 'tunnel') {
            await createTunnel(port, options);
        }
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

async function createShare(port, apiKey, options) {
    const spinner = ora('Creating share...').start();
    
    const response = await fetch(`http://localhost:${port}/api/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            duration: parseDuration(options.duration || '24h'),
            scope: options.scope ? options.scope.split(',') : ['general'],
            description: options.description || 'Repository AI Access',
            maxQueries: options.maxQueries || 100
        })
    });
    
    const data = await response.json();
    spinner.succeed('Share created');
    
    console.log(chalk.green('\n✅ Repository share created!'));
    console.log(chalk.blue('Share ID:'), data.share_id);
    if (data.public_url) {
        console.log(chalk.yellow('Public URL:'), data.public_url);
    }
    console.log(chalk.blue('Local URL:'), `http://localhost:${port}${data.access_url}`);
    console.log(chalk.blue('API Key:'), data.api_key);
    console.log(chalk.blue('Expires:'), new Date(data.expires_at).toLocaleString());
    
    if (options.tunnel && !data.public_url) {
        console.log(chalk.yellow('\n🚇 Creating tunnel...'));
        createTunnel(port, { service: options.tunnel });
    }
}

async function listShares(port, apiKey) {
    const spinner = ora('Fetching shares...').start();
    try {
        const response = await fetch(`http://localhost:${port}/api/share`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        spinner.succeed('Active shares retrieved');
        
        if (data.shares.length === 0) {
            console.log(chalk.yellow('No active shares found.'));
            return;
        }

        console.log(chalk.blue('\n📦 Active Repository Shares:'));
        console.log(chalk.gray('─'.repeat(50)));
        data.shares.forEach(share => {
            console.log(`  ${chalk.bold('ID:')} ${share.id}`);
            console.log(`  ${chalk.bold('Description:')} ${share.description}`);
            console.log(`  ${chalk.bold('Expires:')} ${new Date(share.expires_at).toLocaleString()}`);
            console.log(`  ${chalk.bold('Usage:')} ${share.access_count}/${share.max_queries} queries`);
            console.log(chalk.gray('─'.repeat(50)));
        });
    } catch (error) {
        spinner.fail('Failed to fetch shares');
        logger.error(error.message);
    }
}

async function createTunnel(port, options = {}) {
    const service = options.service || 'localtunnel';
    
    try {
        let command;
        let tunnelUrl;
        
        switch (service) {
            case 'managed':
                console.log(chalk.yellow('🚇 Creating managed tunnel...'));
                const response = await fetch(`http://localhost:${port}/api/tunnel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': options.apiKey || ''
                    },
                    body: JSON.stringify({
                        service: 'managed'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to create managed tunnel: ${response.statusText}`);
                }
                
                const tunnelData = await response.json();
                console.log(chalk.green('🌍 Managed tunnel created:'), tunnelData.url);
                break;
                
            case 'ngrok':
                execSync(`ngrok http ${port}`, { stdio: 'inherit' });
                break;
                
            case 'localtunnel':
                const lt = execSync(`npx localtunnel --port ${port}`, { encoding: 'utf8' });
                tunnelUrl = lt.trim();
                console.log(chalk.green('🌍 Public URL:'), tunnelUrl);
                break;
                
            case 'serveo':
                execSync(`ssh -R 80:localhost:${port} serveo.net`, { stdio: 'inherit' });
                break;
                
            default:
                logger.error('Unsupported tunnel service. Use: managed, ngrok, localtunnel, or serveo');
        }
        
    } catch (error) {
        logger.error('Tunnel creation failed:', error.message);
        console.log(chalk.yellow('\n💡 Tunnel options:'));
        console.log('- Use managed tunneling: --tunnel managed (requires API key)');
        console.log('- Install ngrok: https://ngrok.com/download');
        console.log('- Use localtunnel: npx localtunnel --port', port);
        console.log('- Try serveo: ssh -R 80:localhost:' + port + ' serveo.net');
    }
}

function parseDuration(duration) {
    const match = duration.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h
    
    const [, amount, unit] = match;
    const multipliers = { h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000, m: 30 * 24 * 60 * 60 * 1000 };
    return parseInt(amount) * multipliers[unit];
}

module.exports = share;
