// admin/server/utils/frameworkConfig.js
const path = require('path');
const fs = require('fs').promises;

// Get framework root directory (assuming admin is in framework root)
const frameworkRoot = path.resolve(__dirname, '../../');

// Default paths
const defaultConfig = {
  flowsPath: path.join(frameworkRoot, 'src/flows'),
  helpersPath: path.join(frameworkRoot, 'src/helpers'),
  logsPath: path.join(frameworkRoot, 'logs'),
  configPath: path.join(frameworkRoot, 'config')
};

/**
 * Loads the framework configuration
 * @returns {Promise<Object>} Framework configuration
 */
async function loadFrameworkConfig() {
  try {
    // Try to load from the main config file
    const configFile = path.join(defaultConfig.configPath, 'index.js');
    const config = require(configFile);
    
    return {
      ...defaultConfig,
      ...config,
      // Override with full paths if needed
      flowsPath: config.flowsPath || defaultConfig.flowsPath,
      helpersPath: config.helpersPath || defaultConfig.helpersPath,
      logsPath: path.join(frameworkRoot, 'logs')
    };
  } catch (error) {
    console.warn('Could not load framework config, using defaults:', error.message);
    return defaultConfig;
  }
}

/**
 * Check if directories exist, create them if they don't
 * @param {Object} config - Configuration object with paths
 */
async function ensureDirectories(config) {
  const directories = [
    config.flowsPath,
    config.helpersPath,
    config.logsPath
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = {
  loadFrameworkConfig,
  ensureDirectories
};