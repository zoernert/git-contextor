const ConfigManager = require('../../core/ConfigManager');
const logger = require('../utils/logger');
const ora = require('ora');
const chalk = require('chalk');

async function config(options) {
  const spinner = ora('Managing configuration...').start();
  const repoPath = process.cwd();
  const configManager = new ConfigManager(repoPath);

  try {
    await configManager.load();
  } catch (error) {
    spinner.fail('Configuration management failed.');
    logger.error(error.message);
    process.exit(1);
  }
  
  if (options.show) {
    spinner.succeed('Current Git Contextor Configuration:');
    console.log(JSON.stringify(configManager.config, null, 2));
    return;
  }

  const updates = {};
  let updated = false;

  const embeddingUpdates = {};
  if (options.embeddingProvider) {
    embeddingUpdates.provider = options.embeddingProvider;
    updated = true;
  }
  if (options.embeddingModel) {
    embeddingUpdates.model = options.embeddingModel;
    updated = true;
  }
  if (options.embeddingDimensions) {
    embeddingUpdates.dimensions = options.embeddingDimensions;
    updated = true;
  }
  if (options.apiKey) {
    embeddingUpdates.apiKey = options.apiKey;
    updated = true;
  }
  
  if (Object.keys(embeddingUpdates).length > 0) {
    updates.embedding = { ...configManager.config.embedding, ...embeddingUpdates };
  }

  const chunkingUpdates = {};
  if (options.maxChunkSize) {
    chunkingUpdates.maxChunkSize = options.maxChunkSize;
    updated = true;
  }
  if (options.chunkOverlap) {
    if (options.chunkOverlap >= 0 && options.chunkOverlap < 1) {
        chunkingUpdates.overlap = options.chunkOverlap;
        updated = true;
    } else {
        spinner.fail('Invalid overlap value. Must be between 0 and 1 (e.g., 0.25 for 25%).');
        return;
    }
  }

  if (Object.keys(chunkingUpdates).length > 0) {
      updates.chunking = { ...configManager.config.chunking, ...chunkingUpdates };
  }
  if (options.excludePattern) {
    const currentPatterns = configManager.config.indexing.excludePatterns;
    if (!currentPatterns.includes(options.excludePattern)) {
      updates.indexing = { 
        ...configManager.config.indexing, 
        excludePatterns: [...currentPatterns, options.excludePattern] 
      };
      updated = true;
    } else {
        logger.info(`Exclude pattern "${options.excludePattern}" already exists.`);
    }
  }

  if (!updated) {
    spinner.warn('No configuration changes specified. Use --show to see current config or provide options to update.');
    logger.info('Run "git-contextor config --help" for more information.');
    return;
  }

  try {
    await configManager.updateConfig(updates);
    spinner.succeed('Configuration updated successfully.');
    logger.info('Changes will take effect on next service restart.');
  } catch (error) {
    spinner.fail('Failed to update configuration.');
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = config;
