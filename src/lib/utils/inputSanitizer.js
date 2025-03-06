// src/lib/utils/inputSanitizer.js
const logger = require('./logger');

class InputSanitizer {
  /**
   * Sanitize user input to prevent injection attacks
   * @param {string} input - Raw user input
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (input === null || input === undefined) return '';
    
    // Convert to string if not already
    let sanitized = String(input);
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length (USSD inputs are usually short)
    if (sanitized.length > 160) {
      logger.warn(`Input truncated: exceeded 160 characters (${sanitized.length})`);
      sanitized = sanitized.substring(0, 160);
    }
    
    return sanitized;
  }
  
  /**
   * Validate that input only contains expected characters
   * @param {string} input - Input to validate
   * @param {string} pattern - Regex pattern of allowed characters
   * @returns {boolean} - True if valid
   */
  validatePattern(input, pattern) {
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(input);
  }
  
  /**
   * Numeric input validation
   * @param {string} input - Input to validate
   * @returns {boolean} - True if input contains only digits
   */
  isNumeric(input) {
    return this.validatePattern(input, '[0-9]+');
  }
  
  /**
   * Alphanumeric input validation
   * @param {string} input - Input to validate
   * @returns {boolean} - True if input contains only letters and numbers
   */
  isAlphanumeric(input) {
    return this.validatePattern(input, '[A-Za-z0-9]+');
  }
  
  /**
   * Phone number validation
   * @param {string} input - Input to validate as phone number
   * @returns {boolean} - True if input is a valid phone number format
   */
  isPhoneNumber(input) {
    // Simple validation: 10-15 digits, may start with +
    return this.validatePattern(input, '\\+?[0-9]{10,15}');
  }
  
  /**
   * Money amount validation
   * @param {string} input - Input to validate as money amount
   * @returns {boolean} - True if input is a valid money amount
   */
  isMoneyAmount(input) {
    // Allow numbers with up to 2 decimal places
    return this.validatePattern(input, '[0-9]+(\\.[0-9]{1,2})?');
  }
}

module.exports = new InputSanitizer();