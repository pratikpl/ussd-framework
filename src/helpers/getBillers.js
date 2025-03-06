// src/helpers/getBillers.js
const apiClient = require('./apiClient');
const logger = require('../lib/utils/logger');

/**
 * Get list of billers from API
 * @param {Object} session - Session data
 * @returns {Promise<Object>} - USSD menu data
 */
module.exports = async function getBillers(session) {
  try {
    logger.info(`Fetching billers for ${session.variables.msisdn}`);
    
    // Make API call to get billers
    const response = await apiClient.get('/billers');
    
    if (response.status === 'success') {
      const { billers } = response.data;
      
      if (billers.length === 0) {
        return {
          text: "No billers available at the moment. Please try again later.\n\n0. Back to Main Menu",
          options: {
            "0": { next: "welcome" }
          }
        };
      }
      
      // Format billers as a menu
      let menuText = "Select Biller:\n\n";
      
      billers.forEach((biller, index) => {
        menuText += `${index + 1}. ${biller.name}\n`;
      });
      
      menuText += `${billers.length + 1}. Back`;
      
      // Store billers in session
      session.variables.billerList = billers;
      
      // Define options for the menu
      const options = {};
      
      billers.forEach((biller, index) => {
        options[String(index + 1)] = { 
          next: "enterBillAccount",
          store: { 
            selectedBiller: biller.name,
            selectedBillerId: biller.id,
            selectedBillerType: biller.type
          }
        };
      });
      
      // Add back option
      options[String(billers.length + 1)] = { next: "welcome" };
      
      return {
        text: menuText,
        options: options
      };
    } else {
      return {
        text: "Unable to retrieve billers. Please try again later.\n\n0. Back",
        options: {
          "0": { next: "welcome" }
        }
      };
    }
  } catch (error) {
    logger.error(`Error fetching billers: ${error.message}`);
    return {
      text: "Error retrieving billers. Please try again later.\n\n0. Back",
      options: {
        "0": { next: "welcome" }
      }
    };
  }
};