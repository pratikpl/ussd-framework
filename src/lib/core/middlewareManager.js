// src/lib/core/middlewareManager.js
const logger = require('../utils/logger');

class MiddlewareManager {
  constructor() {
    // Define middleware phases
    this.phases = {
      beforeRequest: [],   // Before processing USSD request
      afterRequest: [],    // After processing request but before generating response
      beforeResponse: [],  // Before sending response to gateway
      afterResponse: [],   // After sending response to gateway
      beforeSessionStart: [], // Before starting a new USSD session
      afterSessionEnd: []  // After ending a USSD session
    };
  }

  /**
   * Register middleware for a specific phase
   * @param {string} phase - The middleware phase
   * @param {Function} middleware - The middleware function
   * @throws {Error} - If phase is invalid
   */
  use(phase, middleware) {
    if (!this.phases[phase]) {
      throw new Error(`Invalid middleware phase: ${phase}. Valid phases are: ${Object.keys(this.phases).join(', ')}`);
    }
    
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    
    this.phases[phase].push(middleware);
    logger.debug(`Registered middleware for phase: ${phase}`);
  }

  /**
   * Execute all middleware for a specific phase
   * @param {string} phase - The middleware phase
   * @param {Object} data - Data to pass to middleware
   * @returns {Promise<Object>} - Modified data after middleware execution
   * @throws {Error} - If phase is invalid
   */
  async executeMiddleware(phase, data) {
    if (!this.phases[phase]) {
      throw new Error(`Invalid middleware phase: ${phase}`);
    }
    
    if (this.phases[phase].length === 0) {
      return data; // No middleware to execute
    }
    
    logger.debug(`Executing ${this.phases[phase].length} middleware(s) for phase: ${phase}`);
    
    let result = data;
    
    for (const middleware of this.phases[phase]) {
      try {
        // Execute middleware and update result
        result = await middleware(result);
      } catch (error) {
        logger.error(`Middleware execution error in phase ${phase}:`, error);
        // Continue with other middleware despite error
      }
    }
    
    return result;
  }
}

module.exports = new MiddlewareManager();