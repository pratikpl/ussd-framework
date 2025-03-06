// src/lib/utils/analyticsTracker.js
const logger = require('./logger');
const taskQueue = require('./taskQueue');

class AnalyticsTracker {
  constructor() {
    this.eventTypes = {
      SESSION_START: 'session_start',
      SESSION_END: 'session_end',
      SCREEN_VIEW: 'screen_view',
      USER_INPUT: 'user_input',
      ERROR: 'error',
      API_CALL: 'api_call'
    };
    
    // In a production system, you might want to batch events
    // and send them periodically to an analytics service
    this.eventBatch = [];
    this.flushInterval = 60000; // 1 minute
    
    // Set up periodic flush
    setInterval(() => this.flushEvents(), this.flushInterval);
  }
  
  /**
   * Track an analytics event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  track(eventType, data) {
    if (!this.eventTypes[eventType]) {
      logger.warn(`Unknown analytics event type: ${eventType}`);
      return;
    }
    
    const event = {
      type: this.eventTypes[eventType],
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Add to batch
    this.eventBatch.push(event);
    
    // Log event immediately
    logger.debug('Analytics event tracked', { eventType, ...data });
    
    // Flush immediately if batch gets too large
    if (this.eventBatch.length >= 100) {
      taskQueue.add(() => this.flushEvents(), {
        name: 'flush_analytics_events',
        priority: 3
      });
    }
  }
  
  /**
   * Flush events batch
   */
  async flushEvents() {
    if (this.eventBatch.length === 0) {
      return;
    }
    
    // Get a copy of the current batch
    const events = [...this.eventBatch];
    
    // Clear the batch
    this.eventBatch = [];
    
    logger.info(`Flushing ${events.length} analytics events`);
    
    // In a real implementation, you would send these to an analytics service
    // For now, just log them to the console
    try {
      // Here you would typically send the events to your analytics service
      // await analyticsService.sendEvents(events);
      
      // For now, just summarize
      const summary = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {});
      
      logger.info('Analytics events flushed', { count: events.length, summary });
    } catch (error) {
      logger.error('Failed to flush analytics events', error);
      
      // Put events back in the batch to retry later
      this.eventBatch = [...events, ...this.eventBatch];
    }
  }
  
  /**
   * Track session start
   * @param {string} sessionId - USSD session ID
   * @param {string} msisdn - Mobile number
   * @param {string} shortCode - USSD short code
   */
  trackSessionStart(sessionId, msisdn, shortCode) {
    this.track('SESSION_START', {
      sessionId,
      msisdn,
      shortCode
    });
  }
  
  /**
   * Track session end
   * @param {string} sessionId - USSD session ID
   * @param {string} reason - Reason for session end
   * @param {number} duration - Session duration in ms
   */
  trackSessionEnd(sessionId, reason, duration) {
    this.track('SESSION_END', {
      sessionId,
      reason,
      duration
    });
  }
  
  /**
   * Track screen view
   * @param {string} sessionId - USSD session ID
   * @param {string} screenId - Screen ID
   * @param {number} screenNumber - Position in journey
   */
  trackScreenView(sessionId, screenId, screenNumber) {
    this.track('SCREEN_VIEW', {
      sessionId,
      screenId,
      screenNumber
    });
  }
  
  /**
   * Track user input
   * @param {string} sessionId - USSD session ID
   * @param {string} screenId - Current screen ID
   * @param {string} input - User input
   */
  trackUserInput(sessionId, screenId, input) {
    this.track('USER_INPUT', {
      sessionId,
      screenId,
      input
    });
  }
  
  /**
   * Track error
   * @param {string} sessionId - USSD session ID
   * @param {string} errorType - Error type
   * @param {string} errorMessage - Error message
   */
  trackError(sessionId, errorType, errorMessage) {
    this.track('ERROR', {
      sessionId,
      errorType,
      errorMessage
    });
  }
  
  /**
   * Track API call
   * @param {string} sessionId - USSD session ID
   * @param {string} endpoint - API endpoint
   * @param {boolean} success - Whether the call was successful
   * @param {number} duration - Call duration in ms
   */
  trackApiCall(sessionId, endpoint, success, duration) {
    this.track('API_CALL', {
      sessionId,
      endpoint,
      success,
      duration
    });
  }
}

module.exports = new AnalyticsTracker();