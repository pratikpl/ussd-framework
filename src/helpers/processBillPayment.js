// src/helpers/processBillPayment.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Process a bill payment
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function processBillPayment(session) {
  try {
    logger.info(`Processing bill payment of ${session.variables.billAmount} to ${session.variables.selectedBiller}`);
    
    // Make API call to process bill payment
    const response = await apiClient.post('/bills/pay', {
      msisdn: session.variables.msisdn,
      amount: session.variables.billAmount,
      billerId: session.variables.selectedBillerId,
      billerName: session.variables.selectedBiller,
      accountNumber: session.variables.billAccount,
      billerType: session.variables.selectedBillerType
    });
    
    if (response.status === 'success') {
      const { reference, newBalance } = response.data;
      
      // Store payment reference and new balance
      session.variables.paymentRef = reference;
      session.variables.newBalance = newBalance;
      
      return {
        text: `Bill Payment Successful!\n\nAmount: $${session.variables.billAmount}\nBiller: ${session.variables.selectedBiller}\nAccount: ${session.variables.billAccount}\nReference: ${reference}\nNew Balance: $${newBalance.toFixed(2)}`,
        shouldClose: true
      };
    } else {
      return {
        text: "Bill payment failed. Please try again later.\n\n0. Back to Menu",
        options: {
          "0": { next: "welcome" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error processing bill payment: ${error.message}`);
    return {
      text: "Error processing bill payment. Please try again later.\n\n0. Back to Menu",
      options: {
        "0": { next: "welcome" }
      }
    };
  }
};