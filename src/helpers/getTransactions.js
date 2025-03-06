// src/helpers/getTransactions.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Get mini statement from API
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function getTransactions(session) {
  try {
    logger.info(`Fetching mini statement for ${session.variables.msisdn}`);
    
    // Make API call to get transactions
    const response = await apiClient.get('/account/transactions', {
      accountNumber: session.variables.msisdn,
      limit: 4 // Limit to last 4 transactions for USSD
    });
    
    if (response.status === 'success') {
      const { transactions } = response.data;
      
      // Format transactions for USSD display
      let transactionText = "Mini Statement\n\n";
      
      transactions.forEach((trx, index) => {
        const amountPrefix = trx.type === 'credit' ? '+' : '-';
        const amount = Math.abs(trx.amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        
        transactionText += `${trx.date}: ${trx.description.substring(0, 10)}...\n${amountPrefix}$${amount}\n`;
        
        // Add separator except for last item
        if (index < transactions.length - 1) {
          transactionText += "---------------\n";
        }
      });
      
      transactionText += "\n0. Back";
      
      return {
        text: transactionText,
        options: {
          "0": { next: "accountMenu" }
        }
      };
    } else {
      return {
        text: "Unable to retrieve transactions. Please try again later.\n\n0. Back",
        options: {
          "0": { next: "accountMenu" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error fetching transactions: ${error.message}`);
    return {
      text: "Error retrieving transaction history. Please try again later.\n\n0. Back",
      options: {
        "0": { next: "accountMenu" }
      }
    };
  }
};