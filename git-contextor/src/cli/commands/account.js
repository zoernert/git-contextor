const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');
const ConfigManager = require('../../core/ConfigManager');
const inquirer = require('inquirer');

async function account(action, options) {
    const repoPath = process.cwd();
    const configManager = new ConfigManager(repoPath);
    
    try {
        await configManager.load();
        
        switch (action) {
            case 'login':
                await loginAccount(configManager, options);
                break;
            case 'register':
                await registerAccount(configManager, options);
                break;
            case 'status':
                await getAccountStatus(configManager);
                break;
            case 'logout':
                await logoutAccount(configManager);
                break;
            case 'plans':
                await getPlans(configManager);
                break;
            default:
                logger.error('Unknown account action. Use: login, register, status, logout, or plans');
        }
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

async function loginAccount(configManager, options) {
    const spinner = ora('Logging in...').start();
    
    try {
        let email = options.email;
        let password = options.password;
        
        // If credentials not provided, prompt for them
        if (!email || !password) {
            spinner.stop();
            const credentials = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'email',
                    message: 'Email:',
                    when: !email
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Password:',
                    when: !password
                }
            ]);
            
            email = email || credentials.email;
            password = password || credentials.password;
            spinner.start('Logging in...');
        }
        
        const response = await fetch(`${configManager.config.tunneling.managed.apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Login failed: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store the API key in config
        await configManager.updateConfig({
            tunneling: {
                ...configManager.config.tunneling,
                managed: {
                    ...configManager.config.tunneling.managed,
                    apiKey: data.token
                }
            }
        });
        
        spinner.succeed('Login successful');
        console.log(chalk.green('✅ Successfully logged in to managed tunneling service'));
        console.log(chalk.blue('API key saved to configuration'));
        
    } catch (error) {
        spinner.fail('Login failed');
        logger.error(error.message);
    }
}

async function registerAccount(configManager, options) {
    const spinner = ora('Creating account...').start();
    
    try {
        let email = options.email;
        let password = options.password;
        let name = options.name;
        
        // If details not provided, prompt for them
        if (!email || !password || !name) {
            spinner.stop();
            const details = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Full Name:',
                    when: !name
                },
                {
                    type: 'input',
                    name: 'email',
                    message: 'Email:',
                    when: !email
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Password:',
                    when: !password
                }
            ]);
            
            email = email || details.email;
            password = password || details.password;
            name = name || details.name;
            spinner.start('Creating account...');
        }
        
        const response = await fetch(`${configManager.config.tunneling.managed.apiUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, name })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Registration failed: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store the API key in config
        await configManager.updateConfig({
            tunneling: {
                ...configManager.config.tunneling,
                managed: {
                    ...configManager.config.tunneling.managed,
                    apiKey: data.token
                }
            }
        });
        
        spinner.succeed('Account created successfully');
        console.log(chalk.green('✅ Successfully created account and logged in'));
        console.log(chalk.blue('API key saved to configuration'));
        
    } catch (error) {
        spinner.fail('Account creation failed');
        logger.error(error.message);
    }
}

async function getAccountStatus(configManager) {
    const spinner = ora('Checking account status...').start();
    
    try {
        const apiKey = configManager.config.tunneling.managed.apiKey;
        if (!apiKey) {
            spinner.fail('Not logged in');
            console.log(chalk.yellow('You are not logged in to the managed tunneling service.'));
            console.log(chalk.blue('Use: git-contextor account login'));
            return;
        }
        
        const response = await fetch(`${configManager.config.tunneling.managed.apiUrl}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get account status: ${response.statusText}`);
        }
        
        const data = await response.json();
        spinner.succeed('Account status retrieved');
        
        console.log(chalk.blue('\n👤 Account Status:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`  ${chalk.bold('Name:')} ${data.name}`);
        console.log(`  ${chalk.bold('Email:')} ${data.email}`);
        console.log(`  ${chalk.bold('Plan:')} ${data.plan || 'Free'}`);
        console.log(`  ${chalk.bold('Tunnels:')} ${data.tunnelCount || 0} active`);
        console.log(`  ${chalk.bold('Member since:')} ${new Date(data.createdAt).toLocaleDateString()}`);
        
    } catch (error) {
        spinner.fail('Failed to get account status');
        logger.error(error.message);
    }
}

async function logoutAccount(configManager) {
    const spinner = ora('Logging out...').start();
    
    try {
        // Remove API key from config
        await configManager.updateConfig({
            tunneling: {
                ...configManager.config.tunneling,
                managed: {
                    ...configManager.config.tunneling.managed,
                    apiKey: null
                }
            }
        });
        
        spinner.succeed('Logged out successfully');
        console.log(chalk.green('✅ Successfully logged out from managed tunneling service'));
        
    } catch (error) {
        spinner.fail('Logout failed');
        logger.error(error.message);
    }
}

async function getPlans(configManager) {
    const spinner = ora('Fetching subscription plans...').start();
    
    try {
        const response = await fetch(`${configManager.config.tunneling.managed.apiUrl}/api/subscriptions/plans`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch plans: ${response.statusText}`);
        }
        
        const data = await response.json();
        spinner.succeed('Plans retrieved');
        
        console.log(chalk.blue('\n💳 Available Plans:'));
        console.log(chalk.gray('─'.repeat(60)));
        
        data.plans.forEach(plan => {
            console.log(`  ${chalk.bold('Name:')} ${plan.name}`);
            console.log(`  ${chalk.bold('Price:')} ${plan.price}`);
            console.log(`  ${chalk.bold('Tunnels:')} ${plan.tunnelLimit}`);
            console.log(`  ${chalk.bold('Bandwidth:')} ${plan.bandwidth}`);
            console.log(`  ${chalk.bold('Features:')} ${plan.features.join(', ')}`);
            console.log(chalk.gray('─'.repeat(60)));
        });
        
    } catch (error) {
        spinner.fail('Failed to fetch plans');
        logger.error(error.message);
    }
}

module.exports = account;
