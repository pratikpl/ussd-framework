// src/lib/core/sessionManager.js
const Redis = require('ioredis');
const config = require('../../../config');
const logger = require('../utils/logger');
const analyticsTracker = require('../utils/analyticsTracker');

class SessionManager {
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    // Define session TTL (time to live)
    this.sessionTTL = config.ussd.sessionTimeout;
  }

  /**
   * Create a new session or update existing one
   * @param {string} sessionId - USSD session ID
   * @param {Object} data - Session data
   * @returns {Promise<Object>} - Created/updated session
   */
  async createSession(sessionId, data) {
    try {
      const sessionData = {
        id: sessionId,
        startTime: Date.now(),
        lastInteractionTime: Date.now(),
        currentScreen: data.initialScreen || 'welcome',
        navHistory: [data.initialScreen || 'welcome'],
        variables: {
          msisdn: data.msisdn,
          sessionId: sessionId,
          shortCode: data.shortCode,
          ...data.variables
        }
      };

      // Store session in Redis
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(sessionData)
      );
      analyticsTracker.trackSessionStart(sessionId, data.msisdn, data.shortCode);
      return sessionData;
    } catch (error) {
      logger.error(`Error creating session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session by ID
   * @param {string} sessionId - USSD session ID
   * @returns {Promise<Object|null>} - Session data or null if not found
   */
  async getSession(sessionId) {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      logger.error(`Error getting session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
 * Update session data
 * @param {string} sessionId - USSD session ID
 * @param {Object} updates - Data to update
 * @returns {Promise<Object>} - Updated session
 */
  async updateSession(sessionId, updates) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Create a deep copy of the current variables to avoid reference issues
      const currentVariables = JSON.parse(JSON.stringify(session.variables || {}));

      // Create a deep copy of the updates to avoid reference issues
      const updateVariables = JSON.parse(JSON.stringify(updates.variables || {}));

      // Update session data
      const updatedSession = {
        ...session,
        ...updates,
        lastInteractionTime: Date.now(),
        variables: {
          ...currentVariables,
          ...updateVariables
        }
      };

      // Update current screen if provided
      if (updates.currentScreen) {
        updatedSession.currentScreen = updates.currentScreen;
        updatedSession.navHistory.push(updates.currentScreen);
      }

      // Log the updated session variables
      logger.debug(`Session ${sessionId} updated with variables:`, {
        beforeUpdate: Object.keys(currentVariables),
        newVariables: Object.keys(updateVariables),
        afterUpdate: Object.keys(updatedSession.variables)
      });

      // Store updated session
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(updatedSession)
      );

      return updatedSession;
    } catch (error) {
      logger.error(`Error updating session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - USSD session ID
   * @returns {Promise<boolean>} - True if deleted, false otherwise
   */
  async deleteSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        const duration = Date.now() - session.startTime;
        analyticsTracker.trackSessionEnd(sessionId, 'user_ended', duration);
      }
      const result = await this.redis.del(`session:${sessionId}`);
      return result === 1;
    } catch (error) {
      logger.error(`Error deleting session ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = new SessionManager();