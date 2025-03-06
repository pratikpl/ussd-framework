// src/middleware/requestLogger.js
const logger = require('../lib/utils/logger');

/**
 * Middleware to log incoming requests and outgoing responses
 */
function requestLogger(req, res, next) {
  // Generate a unique request ID
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  req.requestId = requestId;

  // Log the incoming request
  logger.info(`[${requestId}] Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
    requestId
  });

  // Capture the original send method
  const originalSend = res.send;

  // Override the send method to log the response
  res.send = function(body) {
    let responseBody;
    
    // Parse the response body if it's a string (likely JSON)
    if (typeof body === 'string') {
      try {
        responseBody = JSON.parse(body);
      } catch (e) {
        responseBody = body;
      }
    } else {
      responseBody = body;
    }

    // Log the response
    logger.info(`[${requestId}] Response sent with status ${res.statusCode}`, {
      statusCode: res.statusCode,
      responseBody,
      responseTime: Date.now() - req._startTime,
      requestId
    });

    // Call the original send method
    return originalSend.call(this, body);
  };

  // Set the start time
  req._startTime = Date.now();

  // Continue to the next middleware
  next();
}

module.exports = requestLogger;