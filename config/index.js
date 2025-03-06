// config/index.js
const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // File paths
  flowsPath: path.resolve(process.env.FLOWS_PATH || './src/flows'),
  helpersPath: path.resolve(process.env.HELPERS_PATH || './src/helpers'),
  
  // Redis configuration for session management
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    useMemoryStore: process.env.USE_MEMORY_STORE === 'true' || process.env.NODE_ENV === 'development'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.resolve('./logs/ussd.log')
  },
  
  // USSD configuration
  ussd: {
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '120'),
    maxMenuLength: parseInt(process.env.MAX_MENU_LENGTH || '160'),
    // Add active flow configuration here
    activeFlow: process.env.ACTIVE_FLOW
  }
};