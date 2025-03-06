// src/helpers/validatePhone.js
const logger = require('../lib/utils/logger');

/**
 * Validates a phone number
 * @param {string} phoneNumber - Phone number to validate
 * @param {Object} session - Session data
 * @returns {boolean} - True if valid, false otherwise
 */
module.exports = function validatePhone(phoneNumber, session) {
  try {
    logger.debug(`Validating phone number: ${phoneNumber}`);
    
    // Simple validation - check if it's a valid number
    const numberPattern = /^\d{10,12}$/;
    const isValid = numberPattern.test(phoneNumber);
    
    logger.debug(`Phone validation result: ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  } catch (error) {
    logger.error('Error validating phone number:', error);
    return false;
  }
};