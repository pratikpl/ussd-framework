// src/index.js
const express = require('express');
const bodyParser = require('body-parser');
const config = require('../config');
const logger = require('./lib/utils/logger');
const flowLoader = require('./lib/core/flowLoader');
const helperRegistry = require('./lib/core/helperRegistry');
const configValidator = require('./lib/utils/configValidator');
const errorHandler = require('./lib/utils/errorHandler');
const middlewareManager = require('./lib/core/middlewareManager');
const performanceMonitor = require('./lib/utils/performanceMonitor');
const analyticsTracker = require('./lib/utils/analyticsTracker');
const ussdRoutes = require('./routes/ussd');
const statusRoutes = require('./routes/status');

// Initialize error handler early
errorHandler.init();

// Validate configuration
if (!configValidator.validate(config)) {
  logger.error('Invalid configuration. Exiting.');
  process.exit(1);
}

// Create Express application
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Register routes
app.use('/status', statusRoutes);
app.use('/', ussdRoutes);

// Add error handling middleware
app.use(errorHandler.createExpressErrorMiddleware());

// Initialize framework components
async function initFramework() {
  try {
    // Load all flows
    await flowLoader.loadAllFlows();
    
    // Load all helper functions
    await helperRegistry.loadAllHelpers();
    
    // Register example middleware
    middlewareManager.use('beforeSessionStart', async (data) => {
      logger.debug(`Middleware: beforeSessionStart for ${data.msisdn}`);
      return data;
    });
    
    middlewareManager.use('afterSessionEnd', async (data) => {
      logger.debug(`Middleware: afterSessionEnd for session ${data.sessionId}`);
      return data;
    });
    
    logger.info('USSD Framework initialized successfully');
  } catch (error) {
    logger.error('Error initializing USSD Framework:', error);
    process.exit(1);
  }
}

// Initialize the HTTP server
const server = app.listen(config.port, async () => {
  logger.info(`USSD Framework started on port ${config.port} in ${config.env} mode`);
  await initFramework();
  
  // Log a startup message with available routes
  logger.info(`Active flow: ${config.ussd.activeFlow}`);
  logger.info(`Available routes:
  - Main USSD endpoints:
    POST /session/:sessionId/start
    PUT /session/:sessionId/response
    PUT /session/:sessionId/end
  - Status endpoints:
    GET /status
    GET /status/detailed`);
});

// Set up graceful shutdown
function setupGracefulShutdown(server) {
  logger.info('Setting up graceful shutdown handlers');
  
  // Create a flag to track if shutdown is in progress
  let isShuttingDown = false;
  
  // Create the shutdown function
  const shutdown = async (signal) => {
    // Prevent multiple shutdown calls
    if (isShuttingDown) {
      logger.info(`Additional ${signal} received, already shutting down`);
      return;
    }
    
    isShuttingDown = true;
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    
    // Set a timeout to force exit if shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 30s, forcing exit');
      process.exit(1);
    }, 30000);
    
    try {
      // Close HTTP server (stop accepting new requests)
      await new Promise((resolve) => {
        server.close(resolve);
      });
      logger.info('HTTP server closed, no longer accepting new connections');
      
      // Clean up performance monitor
      performanceMonitor.cleanup();
      
      // Flush analytics events
      await analyticsTracker.flushEvents();
      
      // Close Redis connection
      if (sessionManager.redis && typeof sessionManager.redis.disconnect === 'function') {
        logger.info('Closing Redis connection...');
        await sessionManager.redis.disconnect();
        logger.info('Redis connection closed');
      }
      
      // Clear force exit timeout
      clearTimeout(forceExitTimeout);
      
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      // Clear force exit timeout
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  // Attach signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

setupGracefulShutdown(server);

module.exports = app;