// src/helpers/validateOtp.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Validate OTP code
 * @param {string} otpCode - OTP code to validate
 * @param {Object} session - Session variables
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
module.exports = async function validateOtp(otpCode, session) {
  try {
    logger.debug(`Validating OTP: ${otpCode}`);
    
    // Simple numeric validation
    if (!/^\d{6}$/.test(otpCode)) {
      logger.debug('OTP validation failed: Not a 6-digit number');
      return false;
    }
    
    // Make API call to validate OTP
    const response = await apiClient.post('/otp/verify', {
      otpCode: otpCode,
      otpReference: session.otpReference || '',
      msisdn: session.msisdn
    });
    
    if (response.status === 'success' && response.data.verified) {
      logger.debug('OTP validation successful');
      return true;
    } else {
      logger.debug('OTP validation failed: Invalid code');
      return false;
    }
  } catch (error) {
    logger.error(`Error validating OTP: ${error.message}`);
    return false;
  }
};