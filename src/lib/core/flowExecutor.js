// src/lib/core/flowExecutor.js
const sessionManager = require('./sessionManager');
const flowLoader = require('./flowLoader');
const helperRegistry = require('./helperRegistry');
const logger = require('../utils/logger');
const analyticsTracker = require('../utils/analyticsTracker');

class FlowExecutor {
  /**
   * Process a USSD request and generate a response
   * @param {string} flowName - Name of the flow to execute
   * @param {string} sessionId - USSD session ID
   * @param {Object} requestData - USSD request data
   * @returns {Promise<Object>} - USSD response
   */
  async processRequest(flowName, sessionId, requestData) {
    try {
      // Get flow definition
      const flow = flowLoader.getFlow(flowName);
      if (!flow) {
        logger.error(`Flow not found: ${flowName}`);
        return { shouldClose: true, ussdMenu: 'Service unavailable', responseExitCode: 500, responseMessage: 'Flow not found' };
      }

      // Get or create session
      let session = await sessionManager.getSession(sessionId);

      if (!session) {
        // New session - initialize
        session = await sessionManager.createSession(sessionId, {
          msisdn: requestData.msisdn,
          shortCode: requestData.shortCode,
          initialScreen: 'welcome',
          variables: {
            networkName: requestData.networkName,
            countryName: requestData.countryName
          }
        });

        // Handle start request
        return this.renderScreen(flow, 'welcome', session);
      } else {
        // Existing session - process input
        const currentScreen = session.currentScreen;
        const screen = flow.screens[currentScreen];

        if (!screen) {
          logger.error(`Screen not found: ${currentScreen} in flow ${flowName}`);
          return { shouldClose: true, ussdMenu: 'Service unavailable', responseExitCode: 500, responseMessage: 'Screen not found' };
        }

        // Process user input and determine next screen
        const nextScreenId = await this.processInput(flow, screen, requestData.input, session);

        // Render the next screen
        return this.renderScreen(flow, nextScreenId, session);
      }
    } catch (error) {
      logger.error(`Error processing USSD request:`, error);
      return { shouldClose: true, ussdMenu: 'Service error. Please try again later.', responseExitCode: 500, responseMessage: error.message };
    }
  }

  /**
   * Process user input and determine next screen
   * @param {Object} flow - Flow definition
   * @param {Object} screen - Current screen definition
   * @param {string} input - User input
   * @param {Object} session - Session data
   * @returns {Promise<string>} - Next screen ID
   */
  async processInput(flow, screen, input, session) {
    try {
      logger.debug(`Processing input "${input}" for screen "${session.currentScreen}"`);
      analyticsTracker.trackUserInput(session.id, session.currentScreen, input);
      // First, store the input if needed
      if (screen.store) {
        logger.debug(`Storing input in variable: ${typeof screen.store === 'string' ? screen.store : JSON.stringify(screen.store)}`);

        if (typeof screen.store === 'string') {
          // Simple string variable storage
          await sessionManager.updateSession(session.id, {
            variables: { [screen.store]: input }
          });
          logger.debug(`Stored "${input}" in session variable "${screen.store}"`);
        } else if (typeof screen.store === 'object') {
          // Multiple variables
          await sessionManager.updateSession(session.id, {
            variables: screen.store
          });
          logger.debug(`Stored multiple variables: ${JSON.stringify(screen.store)}`);
        }

        // IMPORTANT: Get the fresh session data after update
        session = await sessionManager.getSession(session.id);
      }

      // Process input based on screen type
      switch (screen.type) {
        case 'menu':
          // Process menu selection
          if (screen.options && screen.options[input]) {
            return this.resolveNextScreen(screen.options[input].next, session);
          } else if (screen.default) {
            return this.resolveNextScreen(screen.default.next, session);
          } else {
            // Invalid input, stay on current screen
            return session.currentScreen;
          }

        case 'input':
          // Process input and move to next screen
          if (screen.validator) {
            const validatorName = screen.validator;
            logger.debug(`Looking for validator: ${validatorName}`);

            const validator = helperRegistry.getHelper(validatorName);
            if (validator && typeof validator === 'function') {
              logger.debug(`Running validator: ${validatorName}`);
              const isValid = await validator(input, session.variables);
              logger.debug(`Validation result: ${isValid}`);

              if (!isValid) {
                // Invalid input, stay on current screen
                logger.debug(`Input "${input}" failed validation with "${validatorName}"`);
                return session.currentScreen;
              }
            } else {
              logger.warn(`Validator not found or not a function: ${validatorName}`);
            }
          }

          return this.resolveNextScreen(screen.next, session);

        case 'dynamic':
          // Dynamic screens handle input in their handler
          const handler = helperRegistry.getHelper(screen.handler);
          if (!handler || typeof handler !== 'function') {
            logger.error(`Handler not found for dynamic screen: ${session.currentScreen}`);
            return 'welcome'; // Fallback to welcome screen
          }

          const result = await handler(session, { input });

          if (result && result.next) {
            return this.resolveNextScreen(result.next, session);
          } else if (screen.next) {
            return this.resolveNextScreen(screen.next, session);
          } else {
            return 'welcome'; // Fallback to welcome screen
          }

        case 'router':
          // Router evaluates conditions to determine next screen
          if (Array.isArray(screen.routes)) {
            for (const route of screen.routes) {
              if (route.condition) {
                // Evaluate condition
                const conditionResult = this.evaluateCondition(route.condition, session, input);
                if (conditionResult) {
                  return this.resolveNextScreen(route.next, session);
                }
              }
            }
          }

          // Default route if no conditions match
          if (screen.default) {
            return this.resolveNextScreen(screen.default, session);
          } else {
            return 'welcome'; // Fallback to welcome screen
          }

        default:
          // For unhandled screen types
          if (screen.next) {
            return this.resolveNextScreen(screen.next, session);
          } else {
            return 'welcome'; // Fallback to welcome screen
          }
      }
    } catch (error) {
      logger.error(`Error processing input:`, error);
      return 'welcome'; // Fallback to welcome screen
    }
  }

  /**
   * Render a screen and prepare response
   * @param {Object} flow - Flow definition
   * @param {string} screenId - Screen ID to render
   * @param {Object} session - Session data
   * @returns {Promise<Object>} - USSD response
   */
  async renderScreen(flow, screenId, session) {
    try {
      // Log the screen being rendered
      logger.debug(`Rendering screen: ${screenId}`, {
        sessionId: session.id
      });
      
      // Update current screen in session
      await sessionManager.updateSession(session.id, {
        currentScreen: screenId
      });
      
      // IMPORTANT: Get fresh session data
      session = await sessionManager.getSession(session.id);
      
      const screen = flow.screens[screenId];
      if (!screen) {
        logger.error(`Screen not found: ${screenId}`);
        return { 
          shouldClose: true, 
          ussdMenu: 'Screen not found', 
          responseExitCode: 500, 
          responseMessage: 'Screen not found' 
        };
      }
      
      // Log the screen definition
      logger.debug(`Screen definition for ${screenId}:`, {
        screenType: screen.type,
        screenText: screen.text
      });

      // Render based on screen type
      switch (screen.type) {
        case 'dynamic':
          // Execute handler to generate dynamic content
          const handler = helperRegistry.getHelper(screen.handler);
          if (!handler || typeof handler !== 'function') {
            logger.error(`Handler not found for dynamic screen: ${screenId}`);
            return {
              shouldClose: true,
              ussdMenu: 'Service unavailable',
              responseExitCode: 500,
              responseMessage: 'Handler not found'
            };
          }

          const result = await handler(session, { screen, flow });

          // Handler can return complete response or just the text
          if (result.ussdMenu || result.shouldClose !== undefined) {
            return {
              shouldClose: result.shouldClose || false,
              ussdMenu: result.ussdMenu || 'Service unavailable',
              responseExitCode: 200,
              responseMessage: ''
            };
          } else {
            // If handler returns simple text or object with text
            const text = result.text || result || 'Service unavailable';
            return {
              shouldClose: screen.shouldClose || result.shouldClose || false,
              ussdMenu: text,
              responseExitCode: 200,
              responseMessage: ''
            };
          }

        case 'notification':
          // Notifications always close the session
          return {
            shouldClose: true,
            ussdMenu: this.replaceVariables(screen.text, session),
            responseExitCode: 200,
            responseMessage: ''
          };

        default:
          // Standard screen rendering with variable replacement
          const menuText = this.replaceVariables(screen.text, session);
          logger.debug(`Rendered menu text for ${screenId}:`, {
            originalText: screen.text,
            renderedText: menuText
          });
          analyticsTracker.trackScreenView(session.id, screenId, session.navHistory.length);
          return {
            shouldClose: screen.shouldClose || false,
            ussdMenu: menuText,
            responseExitCode: 200,
            responseMessage: ''
          };
      }
    } catch (error) {
      logger.error(`Error rendering screen ${screenId}:`, error);
      return {
        shouldClose: true,
        ussdMenu: 'Service error. Please try again later.',
        responseExitCode: 500,
        responseMessage: error.message
      };
    }
  }

  /**
   * Resolve dynamic next screen reference
   * @param {string} nextRef - Next screen reference (may contain expressions)
   * @param {Object} session - Session data
   * @returns {string} - Resolved screen ID
   */
  resolveNextScreen(nextRef, session) {
    if (!nextRef) return 'welcome';

    if (typeof nextRef === 'string' && nextRef.startsWith('${') && nextRef.endsWith('}')) {
      // This is a dynamic reference, evaluate it
      const expression = nextRef.substring(2, nextRef.length - 1);
      try {
        // Create evaluation context with session variables
        const context = {
          session: session.variables
        };

        // Simple evaluation (note: in production, use a safer evaluation method)
        const result = new Function('context', `with(context) { return ${expression}; }`)(context);
        return result || 'welcome';
      } catch (error) {
        logger.error(`Error evaluating dynamic next screen: ${expression}`, error);
        return 'welcome';
      }
    } else {
      // Static reference
      return nextRef;
    }
  }

  /**
   * Evaluate a condition expression
   * @param {string} condition - Condition to evaluate
   * @param {Object} session - Session data
   * @param {string} input - User input
   * @returns {boolean} - Condition result
   */
  evaluateCondition(condition, session, input) {
    try {
      if (typeof condition === 'string') {
        // Create evaluation context
        const context = {
          session: session.variables,
          input
        };

        // Simple evaluation (note: in production, use a safer evaluation method)
        return new Function('context', `with(context) { return ${condition}; }`)(context);
      } else if (typeof condition === 'function') {
        return condition(session, input);
      }

      return false;
    } catch (error) {
      logger.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  /**
  * Replace variables in text
  * @param {string} text - Text with variable placeholders
  * @param {Object} session - Session data
  * @returns {string} - Text with variables replaced
  */
  replaceVariables(text, session) {
    if (!text) return '';

    // Make sure we have the variables
    const variables = session.variables || {};

    logger.debug(`Variables available for replacement:`, {
      variableNames: Object.keys(variables)
    });

    // Simple variable replacement using regex
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();

      // Check if variable exists
      if (trimmedName in variables) {
        const value = variables[trimmedName];
        logger.debug(`Replaced {{${trimmedName}}} with "${value}"`);
        return value;
      }

      logger.warn(`Variable not found: ${trimmedName}`);
      return match; // Return the original placeholder if variable not found
    });
  }
}

module.exports = new FlowExecutor();