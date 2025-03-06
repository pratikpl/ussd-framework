// src/lib/utils/errorHandler.js
const logger = require('./logger');

class ErrorHandler {
  /**
   * Initialize global error handlers
   */
  init() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleFatalError('UncaughtException', error);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleFatalError('UnhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
    });
    
    logger.info('Global error handlers initialized');
  }
  
  /**
   * Handle fatal errors that would otherwise crash the application
   * @param {string} type - Error type
   * @param {Error} error - Error object
   */
  handleFatalError(type, error) {
    logger.error(`${type}: ${error.message}`, {
      type,
      error: error.message,
      stack: error.stack
    });
    
    // In production, you might want to restart the process rather than exiting
    if (process.env.NODE_ENV === 'production') {
      logger.info('Application continuing despite fatal error');
    } else {
      // In development, exit with error code
      // process.exit(1);
      // For now, we'll just log and continue to avoid disrupting development
      logger.warn('In production, this error would trigger a restart. Continuing for development.');
    }
  }
  
  /**
   * Handle API errors in a standardized way
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context about the error
   * @returns {Object} - Standard error response
   */
  handleApiError(error, context = {}) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    logger.error(`API Error [${errorId}]: ${error.message}`, {
      errorId,
      ...context,
      error: error.message,
      stack: error.stack
    });
    
    return {
      error: {
        id: errorId,
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred processing your request' 
          : error.message,
        status: error.status || 500
      }
    };
  }
  
  /**
   * Create express error handling middleware
   * @returns {Function} - Express error handling middleware
   */
  createExpressErrorMiddleware() {
    return (err, req, res, next) => {
      const errorResponse = this.handleApiError(err, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        params: req.params,
        query: req.query,
        body: req.body
      });
      
      res.status(errorResponse.error.status || 500).json(errorResponse);
    };
  }
}

module.exports = new ErrorHandler();