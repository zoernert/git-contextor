#!/usr/bin/env node

/**
 * Migration script to help users upgrade to tunnel.corrently.cloud
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

async function migrateToCorrentlyTunnel() {
    console.log(chalk.blue('🚀 Git Contextor Tunnel Migration'));
    console.log(chalk.blue('='.repeat(40)));

    try {
        const configPath = path.join(process.cwd(), '.gitcontextor', 'config.json');
        
        // Check if config exists
        try {
            await fs.access(configPath);
        } catch (error) {
            console.log(chalk.red('❌ No Git Contextor config found in current directory'));
            console.log(chalk.gray('Run this script from your Git Contextor project root'));
            process.exit(1);
        }

        // Read existing config
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        console.log(chalk.green('✅ Found existing Git Contextor configuration'));

        // Check current tunnel provider
        const currentProvider = config.tunneling?.provider || 'localtunnel';
        console.log(chalk.blue('Current tunnel provider:'), currentProvider);

        if (currentProvider === 'corrently') {
            console.log(chalk.green('✅ Already using tunnel.corrently.cloud - no migration needed!'));
            return;
        }

        // Update config to use corrently
        if (!config.tunneling) {
            config.tunneling = {};
        }

        config.tunneling.provider = 'corrently';
        
        if (!config.tunneling.corrently) {
            config.tunneling.corrently = {
                serverUrl: 'https://tunnel.corrently.cloud',
                apiKey: process.env.CORRENTLY_TUNNEL_API_KEY || null,
                description: 'Git Contextor Share'
            };
        }

        // Write updated config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        console.log(chalk.green('✅ Configuration updated to use tunnel.corrently.cloud'));
        console.log(chalk.yellow('📋 Next steps:'));
        console.log(chalk.gray('1. Get your API key from tunnel.corrently.cloud'));
        console.log(chalk.gray('2. Set it as an environment variable:'));
        console.log(chalk.cyan('   export CORRENTLY_TUNNEL_API_KEY=your_api_key_here'));
        console.log(chalk.gray('3. Test the connection:'));
        console.log(chalk.cyan('   git-contextor tunnel test'));
        console.log(chalk.gray('4. Start sharing:'));
        console.log(chalk.cyan('   git-contextor share --tunnel'));

        // Check if API key is already set
        if (process.env.CORRENTLY_TUNNEL_API_KEY) {
            console.log(chalk.green('✅ API key found in environment'));
            console.log(chalk.blue('Testing connection...'));
            
            try {
                const { spawn } = require('child_process');
                const test = spawn('node', [
                    path.join(__dirname, '..', 'bin', 'git-contextor.js'),
                    'tunnel',
                    'test'
                ], { stdio: 'inherit' });
                
                test.on('close', (code) => {
                    if (code === 0) {
                        console.log(chalk.green('🎉 Migration completed successfully!'));
                    } else {
                        console.log(chalk.yellow('⚠️  Migration completed but connection test failed'));
                    }
                });
            } catch (error) {
                console.log(chalk.yellow('⚠️  Migration completed but could not run connection test'));
            }
        } else {
            console.log(chalk.yellow('⚠️  No API key found in environment'));
            console.log(chalk.gray('Don\'t forget to set CORRENTLY_TUNNEL_API_KEY'));
        }

    } catch (error) {
        console.error(chalk.red('❌ Migration failed:'), error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    migrateToCorrentlyTunnel();
}

module.exports = migrateToCorrentlyTunnel;
