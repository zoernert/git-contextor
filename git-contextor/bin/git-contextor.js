#!/usr/bin/env node

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
  .option('-p, --port <port>', 'API port (default from config)')
  .option('-u, --ui-port <port>', 'UI port (default from config)')
  .option('-d, --daemon', 'Run as daemon')
  .action(startCommand);

program
  .command('stop')
  .description('Stop the Git Contextor service')
  .action(stopCommand);

program
  .command('status')
  .description('Show service status and repository info')
  .action(statusCommand);

program
  .command('config')
  .description('Manage configuration')
  .option('--embedding-provider <provider>', 'Set embedding provider (gemini|openai|local)')
  .option('--embedding-model <model>', 'Set embedding model name')
  .option('--embedding-dimensions <dim>', 'Set embedding dimensions', parseInt)
  .option('--api-key <key>', 'Set API key for embedding provider')
  .option('--exclude-pattern <pattern>', 'Add exclude pattern')
  .option('--max-chunk-size <size>', 'Set maximum chunk size', parseInt)
  .option('--show', 'Show current configuration')
  .action(configCommand);

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

program.parse(process.argv);
