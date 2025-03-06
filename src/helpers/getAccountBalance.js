// src/helpers/getAccountBalance.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Get account balance from API
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function getAccountBalance(session) {
  try {
    logger.info(`Fetching account balance for ${session.variables.msisdn}`);
    
    // Make API call to get balance
    const response = await apiClient.get('/account/balance', {
      accountNumber: session.variables.msisdn
    });
    
    if (response.status === 'success') {
      const { balance, availableBalance, currency } = response.data;
      
      // Format balance with commas
      const formattedBalance = balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const formattedAvailableBalance = availableBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      // Store balance in session for later use
      session.variables.accountBalance = balance;
      session.variables.availableBalance = availableBalance;
      
      return {
        text: `Account Balance\n\nCurrent Balance: ${currency} ${formattedBalance}\nAvailable Balance: ${currency} ${formattedAvailableBalance}\n\n0. Back`,
        options: {
          "0": { next: "accountMenu" }
        }
      };
    } else {
      return {
        text: "Unable to retrieve account balance. Please try again later.\n\n0. Back",
        options: {
          "0": { next: "accountMenu" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error fetching account balance: ${error.message}`);
    return {
      text: "Error retrieving account information. Please try again later.\n\n0. Back",
      options: {
        "0": { next: "accountMenu" }
      }
    };
  }
};