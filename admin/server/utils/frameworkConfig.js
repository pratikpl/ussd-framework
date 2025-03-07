// admin/server/utils/frameworkConfig.js
const path = require('path');
const fs = require('fs').promises;

// Explicitly determine the project root - going up two levels from the current file
// Current: admin/server/utils/frameworkConfig.js
// Need to go up to: /
const frameworkRoot = path.resolve(__dirname, '../../../');

console.log('Framework root directory:', frameworkRoot);

// Explicitly set paths to ensure they're correct
const defaultConfig = {
  flowsPath: path.join(frameworkRoot, 'src', 'flows'),
  helpersPath: path.join(frameworkRoot, 'src', 'helpers'),
  logsPath: path.join(frameworkRoot, 'logs'),
  configPath: path.join(frameworkRoot, 'config')
};

// Log the default paths for debugging
console.log('Default config paths:');
console.log('- flowsPath:', defaultConfig.flowsPath);
console.log('- helpersPath:', defaultConfig.helpersPath);
console.log('- logsPath:', defaultConfig.logsPath);
console.log('- configPath:', defaultConfig.configPath);

/**
 * Loads the framework configuration
 * @returns {Promise<Object>} Framework configuration
 */
async function loadFrameworkConfig() {
  try {
    // Create required directories if they don't exist
    await ensureDirectories(defaultConfig);
    
    // Try to load from the main config file
    const configFile = path.join(defaultConfig.configPath, 'index.js');
    console.log('Trying to load config from:', configFile);
    
    let config = {};
    try {
      config = require(configFile);
      console.log('Successfully loaded config from file');
    } catch (error) {
      console.warn('Could not load main config file:', error.message);
      console.warn('Using default configuration paths');
    }
    
    // Create a config that uses the correct paths
    const finalConfig = {
      ...defaultConfig,
      ...config,
      // Always use the absolute paths from default config to avoid path issues
      flowsPath: defaultConfig.flowsPath,
      helpersPath: defaultConfig.helpersPath,
      logsPath: defaultConfig.logsPath
    };
    
    console.log('Final config paths:');
    console.log('- flowsPath:', finalConfig.flowsPath);
    console.log('- helpersPath:', finalConfig.helpersPath);
    console.log('- logsPath:', finalConfig.logsPath);
    
    return finalConfig;
  } catch (error) {
    console.warn('Error in loadFrameworkConfig:', error);
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
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`Error creating directory ${dir}:`, error);
        throw error;
      } else {
        console.log(`Directory already exists: ${dir}`);
      }
    }
  }
}

module.exports = {
  loadFrameworkConfig,
  ensureDirectories
};