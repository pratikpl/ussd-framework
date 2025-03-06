// src/helpers/processTransfer.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Process a transfer transaction
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function processTransfer(session) {
  try {
    logger.info(`Processing transfer of ${session.variables.transferAmount} to ${session.variables.beneficiaryName}`);
    
    // Make API call to process transfer
    const response = await apiClient.post('/transfers/process', {
      msisdn: session.variables.msisdn,
      amount: session.variables.transferAmount,
      recipientName: session.variables.beneficiaryName,
      recipientAccount: session.variables.beneficiaryAccount,
      recipientBank: session.variables.beneficiaryBank || 'Same Bank',
      otpCode: session.variables.otpCode
    });
    
    if (response.status === 'success') {
      const { transactionId, newBalance } = response.data;
      
      // Store transaction reference and new balance
      session.variables.transactionRef = transactionId;
      session.variables.newBalance = newBalance;
      
      return {
        text: `Transfer Successful!\n\nAmount: $${session.variables.transferAmount}\nTo: ${session.variables.beneficiaryName}\nReference: ${transactionId}\nNew Balance: $${newBalance.toFixed(2)}`,
        shouldClose: true
      };
    } else {
      return {
        text: "Transfer failed. Please try again later.\n\n0. Back to Menu",
        options: {
          "0": { next: "welcome" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error processing transfer: ${error.message}`);
    return {
      text: "Error processing transfer. Please try again later.\n\n0. Back to Menu",
      options: {
        "0": { next: "welcome" }
      }
    };
  }
};