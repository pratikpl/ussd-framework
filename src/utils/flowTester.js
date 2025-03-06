// src/utils/flowTester.js
const flowExecutor = require('../lib/core/flowExecutor');
const sessionManager = require('../lib/core/sessionManager');
const logger = require('../lib/utils/logger');

class FlowTester {
  /**
   * Create a new flow tester
   * @param {string} flowName - Name of the flow to test
   * @param {Object} options - Test options
   * @param {string} options.msisdn - Test phone number
   * @param {string} options.shortCode - Test short code
   */
  constructor(flowName, options = {}) {
    this.flowName = flowName;
    this.sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    this.msisdn = options.msisdn || '1234567890';
    this.shortCode = options.shortCode || '*123#';
    this.history = [];
  }

  /**
   * Initialize the test session
   * @returns {Promise<FlowTester>} - This tester instance
   */
  async initialize() {
    logger.info(`Initializing test session for flow: ${this.flowName}`);
    
    // Create a test session
    await sessionManager.createSession(this.sessionId, {
      msisdn: this.msisdn,
      shortCode: this.shortCode,
      initialScreen: 'welcome',
      variables: {
        networkName: 'TestNetwork',
        countryName: 'TestCountry'
      }
    });
    
    // Start the flow (simulate first request)
    const startResponse = await this.sendInput('');
    
    // Record in history
    this.history.push({
      type: 'start',
      input: '',
      response: startResponse,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Test session initialized with ID: ${this.sessionId}`);
    return this;
  }

  /**
   * Send input to the flow
   * @param {string} input - User input
   * @returns {Promise<Object>} - USSD response
   */
  async sendInput(input) {
    logger.info(`Sending input "${input}" to flow: ${this.flowName}`);
    
    // Create request data
    const requestData = {
      msisdn: this.msisdn,
      shortCode: this.shortCode,
      input: input,
      networkName: 'TestNetwork',
      countryName: 'TestCountry'
    };
    
    // Process the request
    const response = await flowExecutor.processRequest(this.flowName, this.sessionId, requestData);
    
    // Record in history if not initialization
    if (input !== '') {
      this.history.push({
        type: 'input',
        input,
        response,
        timestamp: new Date().toISOString()
      });
    }
    
    return response;
  }

  /**
   * Run a sequence of inputs
   * @param {string[]} inputs - Array of inputs to send
   * @returns {Promise<Object[]>} - Array of responses
   */
  async runSequence(inputs) {
    logger.info(`Running sequence of ${inputs.length} inputs`);
    
    const responses = [];
    
    for (const input of inputs) {
      const response = await this.sendInput(input);
      responses.push(response);
      
      // If session should close, stop the sequence
      if (response.shouldClose) {
        logger.info('Sequence ended early due to session close');
        break;
      }
    }
    
    return responses;
  }

  /**
   * Get the current session data
   * @returns {Promise<Object>} - Session data
   */
  async getSessionData() {
    return sessionManager.getSession(this.sessionId);
  }

  /**
   * Get test history
   * @returns {Object[]} - Test history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Clean up the test session
   * @returns {Promise<void>}
   */
  async cleanUp() {
    logger.info(`Cleaning up test session: ${this.sessionId}`);
    
    // End the session
    await this.endSession('test_completed');
    
    // Delete test session
    await sessionManager.deleteSession(this.sessionId);
  }

  /**
   * End the session
   * @param {string} reason - Reason for ending
   * @returns {Promise<void>}
   */
  async endSession(reason) {
    const requestData = {
      exitCode: 200,
      reason: reason || 'test_completed'
    };
    
    // Record in history
    this.history.push({
      type: 'end',
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = FlowTester;