// src/lib/utils/configValidator.js
const logger = require('./logger');

class ConfigValidator {
  /**
   * Validate the application configuration
   * @param {Object} config - Application configuration
   * @returns {boolean} - True if valid
   */
  validate(config) {
    let isValid = true;
    const errors = [];
    const warnings = [];
    
    // Check required paths
    if (!config.flowsPath) {
      errors.push('Missing required config: flowsPath');
      isValid = false;
    }
    
    if (!config.helpersPath) {
      errors.push('Missing required config: helpersPath');
      isValid = false;
    }
    
    // Check USSD configuration
    if (!config.ussd || typeof config.ussd !== 'object') {
      errors.push('Missing required config section: ussd');
      isValid = false;
    } else {
      if (!config.ussd.activeFlow) {
        errors.push('Missing required config: ussd.activeFlow');
        isValid = false;
      }
      
      if (!config.ussd.sessionTimeout) {
        warnings.push('Missing config: ussd.sessionTimeout - using default of 120 seconds');
      }
      
      if (!config.ussd.maxMenuLength) {
        warnings.push('Missing config: ussd.maxMenuLength - using default of 160 characters');
      }
    }
    
    // Check Redis configuration
    if (!config.redis || typeof config.redis !== 'object') {
      errors.push('Missing required config section: redis');
      isValid = false;
    } else {
      if (!config.redis.useMemoryStore && !config.redis.host) {
        errors.push('Missing required config: Either redis.host or redis.useMemoryStore must be specified');
        isValid = false;
      }
    }
    
    // Log all errors and warnings
    errors.forEach(error => logger.error(`Config validation error: ${error}`));
    warnings.forEach(warning => logger.warn(`Config validation warning: ${warning}`));
    
    if (isValid) {
      logger.info('Configuration validation passed');
    } else {
      logger.error(`Configuration validation failed with ${errors.length} error(s)`);
    }
    
    return isValid;
  }
}

module.exports = new ConfigValidator();