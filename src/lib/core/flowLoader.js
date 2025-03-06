// src/lib/core/flowLoader.js
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');
const logger = require('../utils/logger');

class FlowLoader {
  constructor() {
    this.flows = {};
    this.flowsPath = config.flowsPath;
  }

  /**
   * Load all flow definitions from the flows directory
   * @returns {Promise<Object>} - Loaded flows
   */
  async loadAllFlows() {
    try {
      logger.info(`Loading flows from ${this.flowsPath}`);
      const files = await fs.readdir(this.flowsPath);
      
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const flowName = path.basename(file, '.json');
          await this.loadSingleFlow(flowName);  // Changed method name from loadFlow to loadSingleFlow
        }
      }

      logger.info(`Loaded ${Object.keys(this.flows).length} flows`);
      
      // Check if the active flow exists
      const activeFlow = config.ussd.activeFlow;
      logger.info(`Active flow: ${activeFlow}`);
      
      if (!this.flows[activeFlow]) {
        logger.warn(`Warning: Active flow '${activeFlow}' not found in loaded flows!`);
        logger.warn(`Available flows: ${Object.keys(this.flows).join(', ')}`);
      }
      
      return this.flows;
    } catch (error) {
      logger.error('Error loading flows:', error);
      throw error;
    }
  }

  /**
   * Load a specific flow definition
   * @param {string} flowName - Name of the flow to load
   * @returns {Promise<Object>} - Loaded flow
   */
  async loadSingleFlow(flowName) {  // Changed method name from loadFlow to loadSingleFlow
    try {
      const filePath = path.join(this.flowsPath, `${flowName}.json`);
      const content = await fs.readFile(filePath, 'utf8');
      const flowDefinition = JSON.parse(content);
      
      // Validate the flow structure
      this.validateFlow(flowDefinition, flowName);
      
      // Store the flow
      this.flows[flowName] = flowDefinition;
      logger.debug(`Loaded flow: ${flowName}`);
      
      return flowDefinition;
    } catch (error) {
      logger.error(`Error loading flow ${flowName}:`, error);
      throw error;
    }
  }

  /**
   * Perform basic validation on flow definition
   * @param {Object} flow - Flow definition
   * @param {string} flowName - Name of the flow
   * @throws {Error} - If validation fails
   */
  validateFlow(flow, flowName) {
    // Check required properties
    if (!flow.appName) {
      throw new Error(`Flow ${flowName} is missing required property: appName`);
    }
    
    if (!flow.screens || Object.keys(flow.screens).length === 0) {
      throw new Error(`Flow ${flowName} has no screens defined`);
    }
    
    // Check if welcome screen exists
    if (!flow.screens.welcome) {
      logger.warn(`Flow ${flowName} has no 'welcome' screen defined`);
    }
    
    // Basic validation for each screen
    for (const [screenId, screen] of Object.entries(flow.screens)) {
      if (!screen.type) {
        throw new Error(`Screen ${screenId} in flow ${flowName} is missing required property: type`);
      }
      
      if (!screen.text && screen.type !== 'router' && screen.type !== 'dynamic') {
        throw new Error(`Screen ${screenId} in flow ${flowName} is missing required property: text`);
      }
      
      // Type-specific validation
      switch (screen.type) {
        case 'menu':
          if (!screen.options || Object.keys(screen.options).length === 0) {
            throw new Error(`Menu screen ${screenId} in flow ${flowName} has no options defined`);
          }
          break;
        
        case 'dynamic':
          if (!screen.handler) {
            throw new Error(`Dynamic screen ${screenId} in flow ${flowName} is missing required property: handler`);
          }
          break;
          
        case 'router':
          if (!screen.routes || !Array.isArray(screen.routes) || screen.routes.length === 0) {
            throw new Error(`Router screen ${screenId} in flow ${flowName} has no routes defined`);
          }
          break;
      }
    }
  }

  /**
   * Get a flow by name
   * @param {string} flowName - Name of the flow
   * @returns {Object|null} - Flow definition or null if not found
   */
  getFlow(flowName) {
    return this.flows[flowName] || null;
  }

  /**
   * Get all loaded flows
   * @returns {Object} - All loaded flows
   */
  getAllFlows() {
    return this.flows;
  }
}

module.exports = new FlowLoader();