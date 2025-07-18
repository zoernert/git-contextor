#!/usr/bin/env node

process.on('uncaughtException', (error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Git Contextor requires Node.js 18 or higher.');
  console.error(`   Current version: ${nodeVersion}`);
  console.error('   Please upgrade: https://nodejs.org/');
  process.exit(1);
}

/**
 * @fileoverview CLI entry point for Git Contextor.
 * Sets up commander.js to handle command-line arguments and subcommands.
 */

const { program } = require('commander');

// Import command modules
const initCommand = require('../src/cli/commands/init');
const startCommand = require('../src/cli/commands/start');
const stopCommand = require('../src/cli/commands/stop');
const statusCommand = require('../src/cli/commands/status');
const configCommand = require('../src/cli/commands/config');
const queryCommand = require('../src/cli/commands/query');
const reindexCommand = require('../src/cli/commands/reindex');
const chatCommand = require('../src/cli/commands/chat');
const shareCommand = require('../src/cli/commands/share');
const mcpCommand = require('../src/cli/commands/mcp');
const tunnelCommand = require('../src/cli/commands/tunnel');
const accountCommand = require('../src/cli/commands/account');

program
  .name('git-contextor')
  .description('Git-aware code context tool with vector search')
  .version('1.0.0');

// Register commands
program
  .command('init')
  .description('Initialize Git Contextor in current repository')
  .option('-f, --force', 'Force initialization even if already exists')
  .action(initCommand);

program
  .command('start')
  .description('Start the Git Contextor service')
  .option('-p, --port <port>', 'Port for API and UI (default from config)')
  .option('-d, --daemon', 'Run as daemon')
  .option('--clean', 'Configure the service to delete the Qdrant collection on the next "stop" command. Forces a full re-index on next start.')
  .option('--no-watch', 'Disable file watching for this session.')
  .action(startCommand);

program
  .command('stop')
  .description('Stop the Git Contextor service')
  .action(stopCommand);

program
  .command('status')
  .description('Show service status and repository info')
  .action(statusCommand);

const config = program
  .command('config')
  .description('Manage configuration (show, get, set)')
  .action(() => configCommand({ show: true }));

config
  .command('show')
  .description('Show the current configuration')
  .action(() => configCommand({ show: true }));

config
  .command('get <key>')
  .description('Get a specific configuration value (e.g., services.port)')
  .action((key) => configCommand({ get: key }));

config
  .command('set <key=value>')
  .description('Set a specific configuration value (e.g., services.port=4000)')
  .action((kv) => configCommand({ set: kv }));

// Add specific tunneling configuration options
config
  .command('tunneling')
  .description('Configure tunneling settings')
  .option('--provider <provider>', 'Set tunneling provider (corrently|managed|localtunnel)')
  .option('--api-key <key>', 'Set managed tunneling API key')
  .option('--api-url <url>', 'Set managed tunneling API URL')
  .option('--subdomain <subdomain>', 'Set custom subdomain')
  .action((options) => configCommand({ tunneling: options }));

program
  .command('query <searchQuery>')
  .description('Search for code context')
  .option('-t, --max-tokens <tokens>', 'Maximum tokens to return', '2048')
  .option('-l, --llm-type <type>', 'LLM type for token optimization', 'claude-sonnet')
  .option('-f, --filter <filter>', 'File type filter (js,ts,py)')
  .action(queryCommand);

program
  .command('reindex')
  .description('Force full reindex of repository')
  .option('-f, --file <file>', 'Reindex specific file')
  .action(reindexCommand);

program
  .command('chat <query>')
  .description('Chat with your repository using AI')
  .option('-c, --context <type>', 'Context type (general|architecture|security)', 'general')
  .action(chatCommand);

program
  .command('share <action>')
  .description('Share repository AI access (create|list|tunnel)')
  .option('-d, --duration <duration>', 'Share duration (24h, 7d, 1w)', '24h')
  .option('-s, --scope <scope>', 'Access scope (general,architecture,security)')
  .option('--description <desc>', 'Share description')
  .option('--max-queries <num>', 'Maximum queries allowed', '100')
  .option('-t, --tunnel [service]', 'Create public tunnel (corrently|managed|ngrok|localtunnel|serveo)')
  .action(shareCommand);

program
  .command('tunnel <action>')
  .description('Manage tunnels (start|stop|status|list|test)')
  .option('-s, --service <service>', 'Tunnel service (corrently|managed|localtunnel|ngrok)', 'corrently')
  .option('--subdomain <subdomain>', 'Custom subdomain')
  .option('--description <desc>', 'Tunnel description')
  .option('--api-key <key>', 'API key for managed tunneling')
  .action(tunnelCommand);

program
  .command('account <action>')
  .description('Manage tunneling account (login|register|status|logout|plans)')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .option('-n, --name <name>', 'Full name (for registration)')
  .action(accountCommand);

program
  .command('mcp')
  .description('Start Git Contextor as an MCP server')
  .action(mcpCommand);

program.parse(process.argv);
