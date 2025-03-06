// src/lib/utils/logger.js
const winston = require('winston');
const path = require('path');
const config = require('../../../config');

// Define log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define a prettier format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    // Special handling for request/response logging
    if (meta.requestBody) {
      return `${timestamp} ${level}: [${meta.requestId || 'N/A'}] ${meta.endpoint || 'Request'} - ${message}\nBody: ${meta.requestBody}`;
    }
    
    if (meta.responseBody) {
      return `${timestamp} ${level}: [${meta.requestId || 'N/A'}] Response - ${message}\nBody: ${meta.responseBody}`;
    }
    
    // For request logging
    if (meta.requestId && meta.method && meta.url) {
      return `${timestamp} ${level}: [${meta.requestId}] ${meta.method} ${meta.url} - ${message}`;
    }
    
    // For response logging
    if (meta.requestId && meta.statusCode) {
      return `${timestamp} ${level}: [${meta.requestId}] Response ${meta.statusCode} - ${message}`;
    }
    
    // For session events
    if (meta.sessionId) {
      return `${timestamp} ${level}: [Session: ${meta.sessionId}] ${message}`;
    }
    
    // Regular log entry
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      // Don't truncate for development
      metaStr = Object.keys(meta).length > 0 ? 
        ` - ${JSON.stringify(meta)}` : '';
    }
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.env === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'ussd-framework' },
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transport for persistent logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

module.exports = logger;