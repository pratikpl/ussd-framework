// src/helpers/validateAccountNumber.js
const logger = require('../lib/utils/logger');

/**
 * Validate account number
 * @param {string} accountNumber - Account number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
module.exports = function validateAccountNumber(accountNumber) {
  try {
    logger.debug(`Validating account number: ${accountNumber}`);
    
    // Simple validation - check if it's a 10-digit number
    const isValid = /^\d{10}$/.test(accountNumber);
    
    logger.debug(`Account number validation result: ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  } catch (error) {
    logger.error(`Error validating account number: ${error.message}`);
    return false;
  }
};