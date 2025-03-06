// src/routes/status.js
const express = require('express');
const router = express.Router();
const os = require('os');
const config = require('../../config');
const flowLoader = require('../lib/core/flowLoader');
const helperRegistry = require('../lib/core/helperRegistry');
const sessionManager = require('../lib/core/sessionManager');
const performanceMonitor = require('../lib/utils/performanceMonitor');
const taskQueue = require('../lib/utils/taskQueue');
const logger = require('../lib/utils/logger');
const { version } = require('../../package.json');

// Basic status endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'USSD Framework running',
    version,
    uptime: Math.floor(process.uptime())
  });
});

// Detailed status endpoint
router.get('/detailed', async (req, res) => {
  try {
    // Get Redis status
    let redisStatus = { connected: false };
    try {
      if (sessionManager.redis) {
        // For memory store, just check if it exists
        if (sessionManager.redis.constructor.name === 'MemorySessionStore') {
          redisStatus = { connected: true, type: 'memory' };
        } else {
          // For real Redis, ping to check connection
          const pingResult = await sessionManager.redis.ping();
          redisStatus = { 
            connected: pingResult === 'PONG',
            type: 'redis'
          };
        }
      }
    } catch (error) {
      redisStatus = { 
        connected: false, 
        error: error.message
      };
    }
    
    // Get session count
    let sessionCount = 0;
    try {
      // This would need to be implemented in the session manager
      // For now, use the performance monitor's count
      sessionCount = performanceMonitor.metrics.sessions.active;
    } catch (error) {
      logger.error('Error getting session count:', error);
    }
    
    // Gather system info
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        process: process.memoryUsage()
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      }
    };
    
    // Build response
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
      environment: config.env,
      
      // Application info
      app: {
        activeFlow: config.ussd.activeFlow,
        flows: Object.keys(flowLoader.getAllFlows()),
        helperCount: helperRegistry.helpers.size,
        sessionTimeout: config.ussd.sessionTimeout,
        maxMenuLength: config.ussd.maxMenuLength
      },
      
      // Session info
      sessions: {
        active: sessionCount,
        created: performanceMonitor.metrics.sessions.created,
        ended: performanceMonitor.metrics.sessions.ended
      },
      
      // Performance metrics
      performance: {
        requests: {
          total: performanceMonitor.metrics.requests.total,
          success: performanceMonitor.metrics.requests.success,
          failure: performanceMonitor.metrics.requests.failure,
          successRate: `${performanceMonitor.getRequestSuccessRate().toFixed(2)}%`
        },
        responseTime: {
          average: `${performanceMonitor.getAverageResponseTime().toFixed(2)}ms`,
          min: `${performanceMonitor.metrics.responseTimes.min === Infinity ? 0 : performanceMonitor.metrics.responseTimes.min.toFixed(2)}ms`,
          max: `${performanceMonitor.metrics.responseTimes.max.toFixed(2)}ms`
        },
        taskQueue: taskQueue.getStats()
      },
      
      // System info
      system: systemInfo,
      
      // Dependencies
      dependencies: {
        redis: redisStatus
      }
    };
    
    res.status(200).json(status);
  } catch (error) {
    logger.error('Error generating status response:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating status',
      error: error.message
    });
  }
});

module.exports = router;