// src/helpers/processAirtime.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Process an airtime purchase
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function processAirtime(session) {
  try {
    const phoneNumber = session.variables.airtimePhone === 'self' 
      ? session.variables.msisdn 
      : session.variables.airtimePhone;
      
    logger.info(`Processing airtime purchase of ${session.variables.airtimeAmount} for ${phoneNumber}`);
    
    // Make API call to process airtime purchase
    const response = await apiClient.post('/airtime/purchase', {
      msisdn: session.variables.msisdn,
      amount: session.variables.airtimeAmount,
      phoneNumber: session.variables.airtimePhone
    });
    
    if (response.status === 'success') {
      const { reference, newBalance } = response.data;
      
      // Store reference and new balance
      session.variables.airtimeRef = reference;
      session.variables.newBalance = newBalance;
      
      // Format phone display
      const displayPhone = session.variables.airtimePhone === 'self' 
        ? 'your number' 
        : session.variables.airtimePhone;
      
      return {
        text: `Airtime Purchase Successful!\n\nAmount: $${session.variables.airtimeAmount}\nFor: ${displayPhone}\nReference: ${reference}\nNew Balance: $${newBalance.toFixed(2)}`,
        shouldClose: true
      };
    } else {
      return {
        text: "Airtime purchase failed. Please try again later.\n\n0. Back to Menu",
        options: {
          "0": { next: "welcome" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error processing airtime purchase: ${error.message}`);
    return {
      text: "Error processing airtime purchase. Please try again later.\n\n0. Back to Menu",
      options: {
        "0": { next: "welcome" }
      }
    };
  }
};