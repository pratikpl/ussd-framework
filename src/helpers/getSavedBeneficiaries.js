// src/helpers/getSavedBeneficiaries.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Get saved beneficiaries from API
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function getSavedBeneficiaries(session) {
  try {
    logger.info(`Fetching beneficiaries for ${session.variables.msisdn}`);
    
    // Make API call to get beneficiaries
    const response = await apiClient.get('/beneficiaries', {
      msisdn: session.variables.msisdn
    });
    
    if (response.status === 'success') {
      const { beneficiaries } = response.data;
      
      if (beneficiaries.length === 0) {
        return {
          text: "You don't have any saved beneficiaries. Please add a new beneficiary.\n\n1. Add New Beneficiary\n2. Back",
          options: {
            "1": { next: "newBeneficiary" },
            "2": { next: "transferMenu" }
          }
        };
      }
      
      // Format beneficiaries as a menu
      let menuText = "Select Beneficiary:\n\n";
      
      beneficiaries.forEach((ben, index) => {
        menuText += `${index + 1}. ${ben.name} - ${ben.accountNumber.substring(0, 4)}****${ben.accountNumber.substring(ben.accountNumber.length - 4)}\n`;
      });
      
      menuText += `${beneficiaries.length + 1}. Back`;
      
      // Store beneficiaries in session
      session.variables.beneficiaryList = beneficiaries;
      
      // Define options for the menu
      const options = {};
      
      beneficiaries.forEach((ben, index) => {
        options[String(index + 1)] = { 
          next: "transferAmount",
          store: { 
            beneficiaryName: ben.name,
            beneficiaryAccount: ben.accountNumber,
            beneficiaryBank: ben.bank
          }
        };
      });
      
      // Add back option
      options[String(beneficiaries.length + 1)] = { next: "transferMenu" };
      
      return {
        text: menuText,
        options: options
      };
    } else {
      return {
        text: "Unable to retrieve beneficiaries. Please try again later.\n\n0. Back",
        options: {
          "0": { next: "transferMenu" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error fetching beneficiaries: ${error.message}`);
    return {
      text: "Error retrieving beneficiaries. Please try again later.\n\n0. Back",
      options: {
        "0": { next: "transferMenu" }
      }
    };
  }
};