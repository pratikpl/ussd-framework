// admin/server/controllers/logController.js
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const { createReadStream } = require('fs');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { loadFrameworkConfig } = require('../utils/frameworkConfig');

// Get all logs (paginated)
exports.getLogs = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  
  // Get query parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const level = req.query.level; // error, info, etc.
  const search = req.query.search;
  const sessionId = req.query.sessionId;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  
  // Get log files
  const ussdLogPath = path.join(config.logsPath, 'ussd.log');
  
  try {
    // Check if log file exists
    try {
      await fs.access(ussdLogPath);
    } catch (error) {
      throw new ErrorResponse('Log file not found', 404);
    }
    
    // Read and filter logs
    const logs = [];
    
    // Create read stream in reverse (newest first)
    const fileStream = createReadStream(ussdLogPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    // Process each line
    let totalLines = 0;
    let matchingLines = 0;
    
    for await (const line of rl) {
      totalLines++;
      
      // Try to parse JSON
      let logEntry;
      try {
        // Basic parsing - assumes format like: 2023-01-01 12:00:00 [INFO]: Message {"json": "here"}
        const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        const levelMatch = line.match(/\[([A-Z]+)\]:/);
        
        if (timestampMatch && levelMatch) {
          const timestamp = timestampMatch[1];
          const logLevel = levelMatch[1].toLowerCase();
          
          // Extract message and metadata
          const afterLevel = line.split(`[${levelMatch[1]}]:`)[1].trim();
          let message = afterLevel;
          let metadata = {};
          
          // Try to extract JSON metadata if present
          const jsonMatch = afterLevel.match(/{.*}/);
          if (jsonMatch) {
            message = afterLevel.substring(0, jsonMatch.index).trim();
            try {
              metadata = JSON.parse(jsonMatch[0]);
            } catch (e) {
              // Not valid JSON, use the whole string as message
              message = afterLevel;
            }
          }
          
          logEntry = {
            timestamp,
            level: logLevel,
            message,
            metadata
          };
        } else {
          // Couldn't parse, use the whole line as message
          logEntry = {
            timestamp: new Date().toISOString(),
            level: 'unknown',
            message: line,
            metadata: {}
          };
        }
      } catch (error) {
        // Parsing failed, use the whole line
        logEntry = {
          timestamp: new Date().toISOString(),
          level: 'unknown',
          message: line,
          metadata: {}
        };
      }
      
      // Apply filters
      const logDate = new Date(logEntry.timestamp);
      
      // Level filter
      if (level && logEntry.level !== level) {
        continue;
      }
      
      // Date range filter
      if (startDate && logDate < startDate) {
        continue;
      }
      
      if (endDate && logDate > endDate) {
        continue;
      }
      
      // Search text filter
      if (search && !line.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }
      
      // Session ID filter
      if (sessionId && 
          !(logEntry.metadata.sessionId === sessionId || 
            line.includes(sessionId))) {
        continue;
      }
      
      matchingLines++;
      
      // Apply pagination (skip entries before the requested page)
      if (matchingLines > (page - 1) * limit && matchingLines <= page * limit) {
        logs.push(logEntry);
      }
      
      // Stop if we have enough entries for this page
      if (matchingLines > page * limit) {
        break;
      }
    }
    
    // Calculate pagination info
    const pagination = {
      page,
      limit,
      totalMatching: matchingLines,
      totalPages: Math.ceil(matchingLines / limit)
    };
    
    res.status(200).json({
      success: true,
      count: logs.length,
      pagination,
      data: logs.reverse() // Reverse to get chronological order
    });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error('Error reading logs:', error);
      throw new ErrorResponse('Error reading logs', 500);
    }
  }
});

// Get logs for a specific session
exports.getSessionLogs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  
  // Reuse the getLogs function with sessionId filter
  req.query.sessionId = sessionId;
  req.query.limit = 1000; // Higher limit for session logs
  
  return exports.getLogs(req, res);
});