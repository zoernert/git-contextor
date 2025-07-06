const logger = require('./logger');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Checks if the Qdrant service is available at the configured URL.
 * @param {string} host
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function isQdrantReady(host, port) {
    const url = `http://${host}:${port}`;
    const spinner = ora(`Checking Qdrant connection at ${url}...`).start();
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
            spinner.succeed(`Qdrant connection successful at ${url}`);
            return true;
        }
        spinner.fail(`Qdrant at ${url} responded with status ${response.status}`);
        return false;
    } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ECONNREFUSED') {
            spinner.fail(`Could not connect to Qdrant at ${url}.`);
        } else {
            spinner.fail(`An unexpected error occurred while checking Qdrant: ${error.message}`);
        }
        return false;
    }
}

/**
 * Checks for a running Qdrant instance and provides interactive prompts if not found.
 * @param {import('../../core/ConfigManager')} configManager - The application's config manager.
 * @returns {Promise<void>}
 */
async function checkQdrant(configManager) {
    let { qdrantHost, qdrantPort } = configManager.config.services;
    
    if (await isQdrantReady(qdrantHost, qdrantPort)) {
        return;
    }

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Qdrant connection failed. What would you like to do?',
            choices: [
                { name: 'Enter a different host and port', value: 'enter_new' },
                { name: 'Attempt to start Qdrant via Docker (requires Docker & docker-compose)', value: 'start_docker' },
                { name: 'Abort', value: 'abort' },
            ],
        },
    ]);

    if (action === 'abort') {
        logger.info('Aborting. Please start Qdrant and try again.');
        process.exit(0);
    }

    if (action === 'enter_new') {
        const { newHost, newPort } = await inquirer.prompt([
            { type: 'input', name: 'newHost', message: 'Enter Qdrant host:', default: qdrantHost },
            { type: 'input', name: 'newPort', message: 'Enter Qdrant port:', default: qdrantPort, validate: input => !isNaN(parseInt(input, 10)) || 'Please enter a valid port number.' },
        ]);
        
        qdrantHost = newHost;
        qdrantPort = parseInt(newPort, 10);

        if (await isQdrantReady(qdrantHost, qdrantPort)) {
            await configManager.updateConfig({ services: { qdrantHost, qdrantPort } });
            logger.success(`Configuration updated with new Qdrant host: ${qdrantHost}:${qdrantPort}`);
            return;
        } else {
            logger.error('Still unable to connect with the new details. Aborting.');
            process.exit(1);
        }
    }

    if (action === 'start_docker') {
        const spinner = ora('Attempting to start Qdrant Docker container...').start();
        try {
            const packagePath = path.dirname(require.resolve('git-contextor/package.json'));
            const composeFile = path.join(packagePath, 'docker', 'docker-compose.yml');

            if (!fs.existsSync(composeFile)) {
                spinner.fail('Could not find docker-compose.yml file. Please start Qdrant manually.');
                logger.info('You can usually start it by running: docker-compose -f /path/to/git-contextor/docker/docker-compose.yml up -d');
                process.exit(1);
            }
            
            execSync(`docker-compose -f "${composeFile}" up -d`, { stdio: 'ignore' });
            spinner.succeed('Docker command executed. Waiting 5 seconds for Qdrant to start...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            if (await isQdrantReady(qdrantHost, qdrantPort)) {
                return;
            } else {
                spinner.fail('Qdrant container was started, but the service is still not responding.');
                logger.error('Please check the Docker container logs and try again.');
                process.exit(1);
            }
        } catch (error) {
            spinner.fail('Failed to start Qdrant via Docker.');
            logger.error(error.message);
            logger.info('Please ensure Docker and docker-compose are installed and running.');
            process.exit(1);
        }
    }
}

module.exports = { checkQdrant };
