const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const ConfigManager = require('../../core/ConfigManager');

async function tunnel(action, options) {
    const repoPath = process.cwd();
    const configManager = new ConfigManager(repoPath);
    
    try {
        await configManager.load();
        const { port, apiKey } = configManager.config.services;
        
        switch (action) {
            case 'start':
                await startTunnel(port, apiKey, options);
                break;
            case 'stop':
                await stopTunnel(port, apiKey);
                break;
            case 'status':
                await getTunnelStatus(port, apiKey);
                break;
            case 'list':
                await listTunnels(port, apiKey);
                break;
            case 'test':
                await testTunnelConnection(options);
                break;
            default:
                logger.error('Unknown tunnel action. Use: start, stop, status, list, or test');
        }
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

async function startTunnel(port, apiKey, options) {
    const spinner = ora('Starting tunnel...').start();
    
    try {
        const service = options.service || 'corrently';
        
        if ((service === 'managed' || service === 'corrently') && !options.apiKey) {
            // Check if API key is available in config
            const config = configManager.config;
            const hasApiKey = (service === 'corrently' && config.tunneling?.corrently?.apiKey) ||
                            (service === 'managed' && config.tunneling?.managed?.apiKey);
            
            if (!hasApiKey) {
                spinner.fail(`API key required for ${service} tunneling`);
                if (service === 'corrently') {
                    console.log(chalk.yellow('Set API key with: export CORRENTLY_TUNNEL_API_KEY=your_api_key'));
                    console.log(chalk.yellow('Or configure it with: git-contextor config --set tunneling.corrently.apiKey YOUR_API_KEY'));
                } else {
                    console.log(chalk.yellow('Set API key with: git-contextor config --tunneling-api-key YOUR_API_KEY'));
                }
                return;
            }
        }
        
        const response = await fetch(`http://localhost:${port}/api/tunnel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                service: service,
                subdomain: options.subdomain,
                description: options.description || 'Git Contextor Tunnel'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to start tunnel: ${response.statusText}`);
        }
        
        const data = await response.json();
        spinner.succeed('Tunnel started successfully');
        
        console.log(chalk.green('\n✅ Tunnel created!'));
        console.log(chalk.blue('Service:'), data.service);
        console.log(chalk.blue('Public URL:'), data.url);
        console.log(chalk.blue('Status:'), data.status);
        
        if (data.service === 'managed' || data.service === 'corrently') {
            console.log(chalk.blue('Tunnel ID:'), data.id);
        }
        
        if (data.password) {
            console.log(chalk.yellow('Password:'), data.password);
        }
        
    } catch (error) {
        spinner.fail('Failed to start tunnel');
        logger.error(error.message);
    }
}

async function stopTunnel(port, apiKey) {
    const spinner = ora('Stopping tunnel...').start();
    
    try {
        const response = await fetch(`http://localhost:${port}/api/tunnel`, {
            method: 'DELETE',
            headers: {
                'x-api-key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to stop tunnel: ${response.statusText}`);
        }
        
        spinner.succeed('Tunnel stopped');
        console.log(chalk.green('✅ Tunnel stopped successfully'));
        
    } catch (error) {
        spinner.fail('Failed to stop tunnel');
        logger.error(error.message);
    }
}

async function getTunnelStatus(port, apiKey) {
    const spinner = ora('Checking tunnel status...').start();
    
    try {
        const response = await fetch(`http://localhost:${port}/api/tunnel`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get tunnel status: ${response.statusText}`);
        }
        
        const data = await response.json();
        spinner.succeed('Tunnel status retrieved');
        
        console.log(chalk.blue('\n🚇 Tunnel Status:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`  ${chalk.bold('Status:')} ${getStatusColor(data.status)}`);
        console.log(`  ${chalk.bold('Service:')} ${data.service || 'None'}`);
        console.log(`  ${chalk.bold('URL:')} ${data.url || 'Not available'}`);
        
        if ((data.service === 'managed' || data.service === 'corrently') && data.id) {
            console.log(`  ${chalk.bold('Tunnel ID:')} ${data.id}`);
        }
        
        if (data.password) {
            console.log(`  ${chalk.bold('Password:')} ${data.password}`);
        }
        
    } catch (error) {
        spinner.fail('Failed to get tunnel status');
        logger.error(error.message);
    }
}

async function listTunnels(port, apiKey) {
    const spinner = ora('Fetching tunnels...').start();
    
    try {
        const response = await fetch(`http://localhost:${port}/api/tunnels`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to list tunnels: ${response.statusText}`);
        }
        
        const data = await response.json();
        spinner.succeed('Tunnels retrieved');
        
        if (!data.tunnels || data.tunnels.length === 0) {
            console.log(chalk.yellow('No tunnels found.'));
            return;
        }
        
        console.log(chalk.blue('\n🚇 Available Tunnels:'));
        console.log(chalk.gray('─'.repeat(60)));
        
        data.tunnels.forEach(tunnel => {
            console.log(`  ${chalk.bold('ID:')} ${tunnel.id}`);
            console.log(`  ${chalk.bold('URL:')} ${tunnel.url}`);
            console.log(`  ${chalk.bold('Status:')} ${getStatusColor(tunnel.status)}`);
            console.log(`  ${chalk.bold('Created:')} ${new Date(tunnel.created_at).toLocaleString()}`);
            console.log(chalk.gray('─'.repeat(60)));
        });
        
    } catch (error) {
        spinner.fail('Failed to list tunnels');
        logger.error(error.message);
    }
}

async function testTunnelConnection(options) {
    const spinner = ora('Testing tunnel connection...').start();
    
    try {
        const ConfigManager = require('../../core/ConfigManager');
        const CorrentlyTunnelProvider = require('../../tunneling/CorrentlyTunnelProvider');
        
        const repoPath = process.cwd();
        const configManager = new ConfigManager(repoPath);
        await configManager.load();
        
        const service = options.service || 'corrently';
        
        if (service === 'corrently') {
            const config = configManager.config.tunneling.corrently;
            if (!config.apiKey) {
                spinner.fail('API key required for tunnel.corrently.cloud');
                console.log(chalk.yellow('Set API key with: export CORRENTLY_TUNNEL_API_KEY=your_api_key'));
                return;
            }
            
            const provider = new CorrentlyTunnelProvider(config);
            
            // Test health check
            const health = await provider.testConnection();
            console.log(chalk.green('✓ Health check passed'));
            console.log(chalk.blue('Server mode:'), health.mode);
            
            // Test user authentication
            const userInfo = await provider.getUserInfo();
            console.log(chalk.green('✓ Authentication successful'));
            console.log(chalk.blue('User:'), userInfo.email);
            console.log(chalk.blue('Plan:'), userInfo.plan);
            console.log(chalk.blue('Active:'), userInfo.isActive);
            
            // Display usage information
            if (userInfo.usage) {
                console.log(chalk.blue('Usage:'));
                console.log(chalk.gray('  Tunnels used:'), userInfo.usage.tunnelsUsed);
                console.log(chalk.gray('  Data transferred:'), userInfo.usage.dataTransferred, 'bytes');
                console.log(chalk.gray('  Reset date:'), new Date(userInfo.usage.resetDate).toLocaleDateString());
            }
            
            // List existing tunnels
            const tunnels = await provider.listTunnels();
            if (tunnels.length > 0) {
                console.log(chalk.blue('\nExisting tunnels:'));
                tunnels.forEach(tunnel => {
                    console.log(chalk.gray(`  ${tunnel.tunnelPath} -> ${tunnel.url} (${tunnel.isActive ? 'active' : 'inactive'})`));
                });
            } else {
                console.log(chalk.gray('\nNo existing tunnels found'));
            }
            
            spinner.succeed('Connection test completed successfully');
            
        } else {
            spinner.fail(`Connection test not supported for service: ${service}`);
        }
        
    } catch (error) {
        spinner.fail('Connection test failed');
        logger.error(error.message);
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'running':
            return chalk.green(status);
        case 'starting':
            return chalk.yellow(status);
        case 'stopped':
            return chalk.gray(status);
        case 'error':
            return chalk.red(status);
        default:
            return chalk.white(status);
    }
}

module.exports = tunnel;
