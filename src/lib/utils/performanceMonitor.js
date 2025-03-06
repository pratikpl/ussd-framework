// src/lib/utils/performanceMonitor.js
const logger = require('./logger');
const taskQueue = require('./taskQueue');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // Request metrics
      requests: {
        total: 0,
        success: 0,
        failure: 0,
        byType: {
          start: 0,
          response: 0,
          end: 0
        }
      },
      
      // Response time metrics
      responseTimes: {
        values: [],
        sum: 0,
        count: 0,
        min: Infinity,
        max: 0
      },
      
      // API call metrics
      apiCalls: {
        total: 0,
        success: 0,
        failure: 0,
        byEndpoint: {}
      },
      
      // API response time metrics
      apiResponseTimes: {
        values: [],
        sum: 0,
        count: 0
      },
      
      // Session metrics
      sessions: {
        created: 0,
        ended: 0,
        timedOut: 0,
        active: 0
      },
      
      // Error metrics
      errors: {
        total: 0,
        byType: {}
      },
      
      // System metrics
      system: {
        memoryUsage: [],
        cpuUsage: []
      }
    };
    
    // Start periodic metrics collection
    this.startPeriodicCollection();
    
    // Log summary periodically
    this.summaryInterval = setInterval(() => {
      taskQueue.add(() => this.logSummary(), {
        name: 'performance_summary',
        priority: 2
      });
    }, 60000); // Every minute
  }

  /**
   * Start collecting system metrics periodically
   */
  startPeriodicCollection() {
    this.metricsInterval = setInterval(() => {
      taskQueue.add(() => this.collectSystemMetrics(), {
        name: 'collect_system_metrics',
        priority: 1
      });
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Collect memory usage
    const memoryUsage = process.memoryUsage();
    this.metrics.system.memoryUsage.push({
      timestamp: Date.now(),
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    });
    
    // Keep only the last 60 samples (10 minutes at 10s intervals)
    if (this.metrics.system.memoryUsage.length > 60) {
      this.metrics.system.memoryUsage.shift();
    }
    
    // TODO: Collect CPU usage if needed
  }

  /**
   * Record a USSD request
   * @param {string} type - Request type (start, response, end)
   * @param {boolean} success - Whether the request was successful
   * @param {number} responseTime - Response time in milliseconds
   */
  recordRequest(type, success, responseTime) {
    // Update request counts
    this.metrics.requests.total++;
    this.metrics.requests.byType[type] = (this.metrics.requests.byType[type] || 0) + 1;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failure++;
    }
    
    // Update response time metrics
    if (responseTime > 0) {
      // Keep only last 1000 values for memory efficiency
      if (this.metrics.responseTimes.values.length >= 1000) {
        const removedValue = this.metrics.responseTimes.values.shift();
        this.metrics.responseTimes.sum -= removedValue;
        this.metrics.responseTimes.count--;
      }
      
      this.metrics.responseTimes.values.push(responseTime);
      this.metrics.responseTimes.sum += responseTime;
      this.metrics.responseTimes.count++;
      
      // Update min/max
      if (responseTime < this.metrics.responseTimes.min) {
        this.metrics.responseTimes.min = responseTime;
      }
      if (responseTime > this.metrics.responseTimes.max) {
        this.metrics.responseTimes.max = responseTime;
      }
    }
  }

  /**
   * Record an API call
   * @param {string} endpoint - API endpoint
   * @param {boolean} success - Whether the call was successful
   * @param {number} responseTime - Response time in milliseconds
   */
  recordApiCall(endpoint, success, responseTime) {
    // Update API call counts
    this.metrics.apiCalls.total++;
    
    if (!this.metrics.apiCalls.byEndpoint[endpoint]) {
      this.metrics.apiCalls.byEndpoint[endpoint] = {
        total: 0,
        success: 0,
        failure: 0
      };
    }
    
    this.metrics.apiCalls.byEndpoint[endpoint].total++;
    
    if (success) {
      this.metrics.apiCalls.success++;
      this.metrics.apiCalls.byEndpoint[endpoint].success++;
    } else {
      this.metrics.apiCalls.failure++;
      this.metrics.apiCalls.byEndpoint[endpoint].failure++;
    }
    
    // Update API response time metrics
    if (responseTime > 0) {
      // Keep only last 1000 values
      if (this.metrics.apiResponseTimes.values.length >= 1000) {
        const removedValue = this.metrics.apiResponseTimes.values.shift();
        this.metrics.apiResponseTimes.sum -= removedValue;
        this.metrics.apiResponseTimes.count--;
      }
      
      this.metrics.apiResponseTimes.values.push(responseTime);
      this.metrics.apiResponseTimes.sum += responseTime;
      this.metrics.apiResponseTimes.count++;
    }
  }

  /**
   * Record session creation
   */
  recordSessionCreated() {
    this.metrics.sessions.created++;
    this.metrics.sessions.active++;
  }

  /**
   * Record session end
   * @param {string} reason - Reason for session end
   */
  recordSessionEnded(reason) {
    this.metrics.sessions.ended++;
    this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - 1);
    
    if (reason === 'timeout') {
      this.metrics.sessions.timedOut++;
    }
  }

  /**
   * Record an error
   * @param {string} type - Error type
   */
  recordError(type) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[type] = (this.metrics.errors.byType[type] || 0) + 1;
  }

  /**
   * Get average response time
   * @returns {number} - Average response time in milliseconds
   */
  getAverageResponseTime() {
    return this.metrics.responseTimes.count > 0 
      ? this.metrics.responseTimes.sum / this.metrics.responseTimes.count 
      : 0;
  }

  /**
   * Get average API response time
   * @returns {number} - Average API response time in milliseconds
   */
  getAverageApiResponseTime() {
    return this.metrics.apiResponseTimes.count > 0 
      ? this.metrics.apiResponseTimes.sum / this.metrics.apiResponseTimes.count 
      : 0;
  }

  /**
   * Get request success rate
   * @returns {number} - Success rate as a percentage
   */
  getRequestSuccessRate() {
    return this.metrics.requests.total > 0 
      ? (this.metrics.requests.success / this.metrics.requests.total * 100) 
      : 100;
  }

  /**
   * Get API call success rate
   * @returns {number} - Success rate as a percentage
   */
  getApiSuccessRate() {
    return this.metrics.apiCalls.total > 0 
      ? (this.metrics.apiCalls.success / this.metrics.apiCalls.total * 100) 
      : 100;
  }

  /**
   * Log performance summary
   */
  logSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        failure: this.metrics.requests.failure,
        successRate: `${this.getRequestSuccessRate().toFixed(2)}%`,
        byType: this.metrics.requests.byType
      },
      responseTime: {
        average: `${this.getAverageResponseTime().toFixed(2)}ms`,
        min: `${this.metrics.responseTimes.min === Infinity ? 0 : this.metrics.responseTimes.min.toFixed(2)}ms`,
        max: `${this.metrics.responseTimes.max.toFixed(2)}ms`
      },
      apiCalls: {
        total: this.metrics.apiCalls.total,
        success: this.metrics.apiCalls.success,
        failure: this.metrics.apiCalls.failure,
        successRate: `${this.getApiSuccessRate().toFixed(2)}%`,
        averageResponseTime: `${this.getAverageApiResponseTime().toFixed(2)}ms`
      },
      sessions: {
        created: this.metrics.sessions.created,
        ended: this.metrics.sessions.ended,
        timedOut: this.metrics.sessions.timedOut,
        active: this.metrics.sessions.active
      },
      errors: {
        total: this.metrics.errors.total
      },
      memory: {
        rss: this.formatBytes(process.memoryUsage().rss),
        heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
        heapTotal: this.formatBytes(process.memoryUsage().heapTotal)
      },
      taskQueue: taskQueue.getStats()
    };
    
    logger.info('Performance Summary', summary);
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
    }
  }
}

module.exports = new PerformanceMonitor();