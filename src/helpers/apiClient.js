// src/helpers/apiClient.js
const axios = require('axios');
const logger = require('../lib/utils/logger');

/**
 * Simple API client for making HTTP requests
 * This simulates API calls for testing purposes
 */
class ApiClient {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint to call
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Response data
   */
  async get(endpoint, params = {}) {
    try {
      logger.debug(`Making API GET request to ${endpoint}`, { params });
      
      // Simulate network delay (200-700ms)
      const delay = Math.floor(Math.random() * 500) + 200;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Mock responses based on the endpoint
      switch (endpoint) {
        case '/account/balance':
          return {
            status: 'success',
            data: {
              accountNumber: params.accountNumber || '1234567890',
              balance: 2543.87,
              availableBalance: 2493.87,
              currency: 'USD',
              timestamp: new Date().toISOString()
            }
          };
          
        case '/account/transactions':
          return {
            status: 'success',
            data: {
              transactions: [
                { date: '2025-03-02', description: 'GROCERY STORE', amount: -45.65, type: 'debit' },
                { date: '2025-03-01', description: 'SALARY CREDIT', amount: 1500.00, type: 'credit' },
                { date: '2025-02-28', description: 'RESTAURANT', amount: -32.40, type: 'debit' },
                { date: '2025-02-25', description: 'ATM WITHDRAWAL', amount: -200.00, type: 'debit' }
              ]
            }
          };
          
        case '/beneficiaries':
          return {
            status: 'success',
            data: {
              beneficiaries: [
                { id: '1', name: 'John Smith', accountNumber: '9876543210', bank: 'Same Bank' },
                { id: '2', name: 'Alice Johnson', accountNumber: '5678901234', bank: 'Other Bank' },
                { id: '3', name: 'Rental Agency', accountNumber: '1122334455', bank: 'Another Bank' }
              ]
            }
          };
          
        case '/billers':
          return {
            status: 'success',
            data: {
              billers: [
                { id: '1', name: 'Electricity Company', type: 'utility' },
                { id: '2', name: 'Water Services', type: 'utility' },
                { id: '3', name: 'Internet Provider', type: 'telecom' },
                { id: '4', name: 'TV Subscription', type: 'entertainment' }
              ]
            }
          };
          
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
    } catch (error) {
      logger.error(`API GET request failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint to call
   * @param {Object} data - Request body
   * @returns {Promise<Object>} - Response data
   */
  async post(endpoint, data = {}) {
    try {
      logger.debug(`Making API POST request to ${endpoint}`, { data });
      
      // Simulate network delay (200-700ms)
      const delay = Math.floor(Math.random() * 500) + 200;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Mock responses based on the endpoint
      switch (endpoint) {
        case '/otp/send':
          return {
            status: 'success',
            data: {
              otpReference: Math.random().toString(36).substring(2, 10).toUpperCase(),
              expiresIn: '5 minutes',
              targetMobile: '******' + (data.msisdn || '').substring(6)
            }
          };
          
        case '/otp/verify':
          // Simple logic to validate OTP - in this case any 6-digit number is fine
          const isValid = /^\d{6}$/.test(data.otpCode);
          if (!isValid) {
            return {
              status: 'error',
              message: 'Invalid OTP code'
            };
          }
          return {
            status: 'success',
            data: {
              verified: true,
              timestamp: new Date().toISOString()
            }
          };
          
        case '/transfers/process':
          return {
            status: 'success',
            data: {
              transactionId: Math.random().toString(36).substring(2, 15).toUpperCase(),
              amount: data.amount,
              recipientName: data.recipientName,
              recipientAccount: data.recipientAccount,
              timestamp: new Date().toISOString(),
              fee: 1.50,
              newBalance: 2493.87 - parseFloat(data.amount)
            }
          };
          
        case '/bills/pay':
          return {
            status: 'success',
            data: {
              billerId: data.billerId,
              billerName: data.billerName,
              accountNumber: data.accountNumber,
              amount: data.amount,
              reference: 'BIL' + Math.random().toString(36).substring(2, 10).toUpperCase(),
              timestamp: new Date().toISOString(),
              newBalance: 2493.87 - parseFloat(data.amount)
            }
          };
          
        case '/airtime/purchase':
          return {
            status: 'success',
            data: {
              phoneNumber: data.phoneNumber === 'self' ? 'Your number' : data.phoneNumber,
              amount: data.amount,
              reference: 'AIR' + Math.random().toString(36).substring(2, 10).toUpperCase(),
              timestamp: new Date().toISOString(),
              newBalance: 2493.87 - parseFloat(data.amount)
            }
          };
          
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
    } catch (error) {
      logger.error(`API POST request failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ApiClient();