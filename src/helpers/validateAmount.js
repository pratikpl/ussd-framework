// src/helpers/validateAmount.js
const logger = require('../lib/utils/logger');

/**
 * Validates a transfer amount
 * @param {string} amount - Amount to validate
 * @param {Object} session - Session data
 * @returns {boolean} - True if valid, false otherwise
 */
module.exports = function validateAmount(amount, session) {
  try {
    logger.debug(`Validating amount: ${amount}`);
    
    // Check if it's a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      logger.debug('Amount is not a number');
      return false;
    }
    
    // Check if it's a positive number
    if (parsedAmount <= 0) {
      logger.debug('Amount is not positive');
      return false;
    }
    
    // Check if it's within allowed limits
    if (parsedAmount > 1000) {
      logger.debug('Amount exceeds maximum limit of 1000');
      return false;
    }
    
    logger.debug('Amount validation passed');
    return true;
  } catch (error) {
    logger.error('Error validating amount:', error);
    return false;
  }
};