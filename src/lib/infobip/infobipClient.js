// src/lib/infobip/infobipClient.js
const axios = require('axios');
const logger = require('../utils/logger');
const inputSanitizer = require('../utils/inputSanitizer');

class InfobipClient {
  /**
   * Send response to Infobip USSD Gateway
   * @param {string} menu - USSD menu text to display
   * @param {boolean} shouldClose - Whether to end the session
   * @returns {Object} - Response object for Infobip
   */
  createResponse(menu, shouldClose = false) {
    return {
      shouldClose,
      ussdMenu: menu,
      responseExitCode: 200,
      responseMessage: ''
    };
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {number} exitCode - Exit code (default: 500)
   * @returns {Object} - Error response for Infobip
   */
  createErrorResponse(message = 'An error occurred', exitCode = 500) {
    return {
      shouldClose: true,
      ussdMenu: message,
      responseExitCode: exitCode,
      responseMessage: message
    };
  }

  /**
   * Parse Infobip request data
   * @param {Object} requestBody - Request body from Infobip
   * @returns {Object} - Parsed request data
   */
  parseRequest(requestBody) {
    try {
      return {
        msisdn: requestBody.msisdn,
        sessionId: requestBody.sessionId || '',
        shortCode: requestBody.shortCode || '',
        input: inputSanitizer.sanitizeInput(requestBody.text) || '',
        networkName: requestBody.networkName || '',
        countryName: requestBody.countryName || '',
        ussdNodeId: requestBody.ussdNodeId || ''
      };
    } catch (error) {
      logger.error('Error parsing Infobip request:', error);
      throw new Error('Invalid request format');
    }
  }
}

module.exports = new InfobipClient();