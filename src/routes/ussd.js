// src/routes/ussd.js
const express = require('express');
const router = express.Router();
const flowExecutor = require('../lib/core/flowExecutor');
const infobipClient = require('../lib/infobip/infobipClient');
const logger = require('../lib/utils/logger');
const sessionManager = require('../lib/core/sessionManager');
const config = require('../../config');
const middlewareManager = require('../lib/core/middlewareManager');
const performanceMonitor = require('../lib/utils/performanceMonitor');

/**
 * Get the active flow from configuration
 * @returns {string} - Active flow name
 */
function getActiveFlow() {
  return config.ussd.activeFlow;
}

// Infobip start endpoint
router.post('/session/:sessionId/start', async (req, res) => {
  const sessionId = req.params.sessionId;

  // Log the complete incoming request
  logger.info(`REQUEST - USSD START ${sessionId}`, {
    sessionId,
    requestId: req.requestId,
    endpoint: 'start',
    requestBody: JSON.stringify(req.body, null, 2)
  });

  const requestStartTime = Date.now();
  try {
    // Parse request data
    const requestData = infobipClient.parseRequest(req.body);

    // Execute beforeSessionStart middleware
    const modifiedRequestData = await middlewareManager.executeMiddleware('beforeSessionStart', requestData);

    // Get the active flow from config
    const flowName = config.ussd.activeFlow;

    logger.info(`Using active flow: ${flowName}`, {
      sessionId,
      shortCode: modifiedRequestData.shortCode,
      flowName
    });

    // Execute beforeRequest middleware
    const processedRequestData = await middlewareManager.executeMiddleware('beforeRequest', modifiedRequestData);

    // Process the request with the active flow
    const responseData = await flowExecutor.processRequest(flowName, sessionId, processedRequestData);

    // Execute afterRequest middleware
    const processedResponseData = await middlewareManager.executeMiddleware('afterRequest', {
      request: processedRequestData,
      response: responseData,
      sessionId
    });

    // Execute beforeResponse middleware
    const finalResponse = await middlewareManager.executeMiddleware('beforeResponse', processedResponseData.response);

    // Log the complete response
    logger.info(`RESPONSE - USSD START ${sessionId}`, {
      sessionId,
      requestId: req.requestId,
      responseBody: JSON.stringify(finalResponse, null, 2)
    });

    // Send response
    res.status(200).json(finalResponse);

    const responseTime = Date.now() - requestStartTime;
    performanceMonitor.recordRequest('start', true, responseTime);

    // Execute afterResponse middleware (don't await as it doesn't affect the response)
    middlewareManager.executeMiddleware('afterResponse', {
      request: processedRequestData,
      response: finalResponse,
      sessionId
    }).catch(error => {
      logger.error(`Error in afterResponse middleware: ${error.message}`);
    });


  } catch (error) {
    logger.error(`Error handling start request for session ${sessionId}:`, {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });

    res.status(200).json(infobipClient.createErrorResponse(
      'Service unavailable. Please try again later.',
      500
    ));
    performanceMonitor.recordRequest('start', false, Date.now() - requestStartTime);
  }
});

// Infobip response endpoint
router.put('/session/:sessionId/response', async (req, res) => {
  const sessionId = req.params.sessionId;
  // Log the complete incoming request
  logger.info(`REQUEST - USSD RESPONSE ${sessionId}`, {
    sessionId,
    requestId: req.requestId,
    endpoint: 'response',
    requestBody: JSON.stringify(req.body, null, 2) // Pretty-print JSON
  });

  const requestStartTime = Date.now();

  try {
    // Get current session state for logging
    const currentSession = await sessionManager.getSession(sessionId);
    if (currentSession) {
      logger.debug(`Current session state before processing response:`, {
        currentScreen: currentSession.currentScreen,
        navHistory: currentSession.navHistory,
        variables: currentSession.variables,
        requestId: req.requestId
      });
    }

    // Parse request data
    const requestData = infobipClient.parseRequest(req.body);
    const flowName = getActiveFlow();

    const response = await flowExecutor.processRequest(flowName, sessionId, requestData);

    // Log the processed response details
    logger.info(`RESPONSE - USSD RESPONSE ${sessionId}`, {
      sessionId,
      requestId: req.requestId,
      responseBody: JSON.stringify(response, null, 2) // Pretty-print JSON
    });

    // Send response
    res.status(200).json(response);
    const responseTime = Date.now() - requestStartTime;
    performanceMonitor.recordRequest('start', true, responseTime);

  } catch (error) {
    logger.error(`Error handling response request for session ${sessionId}:`, {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });

    res.status(200).json(infobipClient.createErrorResponse(
      'Service unavailable. Please try again later.',
      500
    ));
    performanceMonitor.recordRequest('start', false, Date.now() - requestStartTime);
  }
});

// Infobip end endpoint
router.put('/session/:sessionId/end', async (req, res) => {
  const sessionId = req.params.sessionId;

  // Log the complete incoming request
  logger.info(`REQUEST - USSD END ${sessionId}`, {
    sessionId,
    requestId: req.requestId,
    endpoint: 'end',
    requestBody: JSON.stringify(req.body, null, 2) // Pretty-print JSON
  });

  const requestStartTime = Date.now();

  try {
    // Get session data before cleanup for logging
    const sessionData = await sessionManager.getSession(sessionId);
    if (sessionData) {
      logger.debug(`Session data at end:`, {
        sessionId,
        sessionDuration: Date.now() - sessionData.startTime,
        screens: sessionData.navHistory,
        variables: sessionData.variables,
        requestId: req.requestId
      });
    }

    // Cleanup session
    await sessionManager.deleteSession(sessionId);
    logger.debug(`Session ${sessionId} deleted`, { requestId: req.requestId });

    // Define the response object properly before using it
    const response = {
      responseExitCode: 200,
      responseMessage: ''
    };

    // Log the complete response
    logger.info(`RESPONSE - USSD END ${sessionId}`, {
      sessionId,
      requestId: req.requestId,
      responseBody: JSON.stringify(response, null, 2) // Pretty-print JSON
    });

    // Send acknowledgement
    res.status(200).json(response);
    const responseTime = Date.now() - requestStartTime;
    performanceMonitor.recordRequest('start', true, responseTime);

  } catch (error) {
    logger.error(`Error handling end request for session ${sessionId}:`, {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });

    const errorResponse = {
      responseExitCode: 500,
      responseMessage: error.message
    };

    logger.error(`Error response for session ${sessionId}:`, {
      sessionId,
      requestId: req.requestId,
      responseBody: JSON.stringify(errorResponse)
    });

    res.status(200).json(errorResponse);
    performanceMonitor.recordRequest('start', false, Date.now() - requestStartTime);
  }
});


module.exports = router;