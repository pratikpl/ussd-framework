// src/lib/core/helperRegistry.js
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');
const logger = require('../utils/logger');

class HelperRegistry {
  constructor() {
    this.helpers = new Map();
    this.helpersPath = config.helpersPath;
  }

  /**
   * Load all helper functions from the helpers directory
   * @returns {Promise<Map>} - Loaded helpers
   */
  async loadAllHelpers() {
    try {
      logger.info(`Loading helpers from ${this.helpersPath}`);
      await this._scanDirectory(this.helpersPath);
      logger.info(`Loaded ${this.helpers.size} helper functions`);
      return this.helpers;
    } catch (error) {
      logger.error('Error loading helpers:', error);
      throw error;
    }
  }

  /**
   * Recursively scan directory for helper functions
   * @param {string} dir - Directory to scan
   * @returns {Promise<void>}
   * @private
   */
  async _scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this._scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const helperName = path.basename(entry.name, '.js');
          
          // Get namespace based on directory structure
          const relativePath = path.relative(this.helpersPath, dir);
          const namespace = relativePath ? 
            relativePath.replace(/\\/g, '/') : '';
          
          // Register helper with namespace
          const fullName = namespace ? 
            `${namespace}/${helperName}` : helperName;
          
          try {
            const helperFn = require(fullPath);
            this.helpers.set(fullName, helperFn);
            logger.debug(`Loaded helper: ${fullName}`);
          } catch (err) {
            logger.error(`Error loading helper ${fullName}:`, err);
          }
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${dir}:`, error);
      throw error;
    }
  }

  /**
   * Get a helper function by name
   * @param {string} name - Helper function name (with namespace)
   * @returns {Function|null} - Helper function or null if not found
   */
  getHelper(name) {
    if (!this.helpers.has(name)) {
      logger.warn(`Helper function not found: ${name}`);
      return null;
    }
    return this.helpers.get(name);
  }

  /**
   * Reload a specific helper function
   * @param {string} filePath - Path to helper file
   * @returns {Promise<boolean>} - True if reloaded, false otherwise
   */
  reloadHelper(filePath) {
    try {
      // Clear require cache
      delete require.cache[require.resolve(filePath)];
      
      // Reload the helper
      const helperName = path.basename(filePath, '.js');
      const relativePath = path.relative(this.helpersPath, path.dirname(filePath));
      const namespace = relativePath ? relativePath.replace(/\\/g, '/') : '';
      const fullName = namespace ? `${namespace}/${helperName}` : helperName;
      
      // Update in registry
      const helperFn = require(filePath);
      this.helpers.set(fullName, helperFn);
      logger.info(`Reloaded helper: ${fullName}`);
      
      return true;
    } catch (error) {
      logger.error(`Error reloading helper ${filePath}:`, error);
      return false;
    }
  }
}

module.exports = new HelperRegistry();