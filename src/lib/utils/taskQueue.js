// src/lib/utils/taskQueue.js
const logger = require('./logger');

class TaskQueue {
  constructor() {
    this.tasks = [];
    this.isProcessing = false;
    this.maxConcurrent = 5; // Maximum concurrent tasks
    this.activeCount = 0;
    this.stats = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0
    };
  }

  /**
   * Add a task to the queue
   * @param {Function} task - Task function to execute
   * @param {Object} options - Task options
   * @param {number} options.priority - Task priority (1-10, 10 is highest)
   * @param {string} options.name - Task name for logging
   * @returns {Promise<any>} - Task result promise
   */
  add(task, options = {}) {
    const taskName = options.name || `task_${this.stats.totalEnqueued + 1}`;
    const priority = options.priority || 5;
    
    this.stats.totalEnqueued++;
    
    // Create a promise for this task
    return new Promise((resolve, reject) => {
      this.tasks.push({
        execute: task,
        name: taskName,
        priority,
        startTime: null,
        resolve,
        reject
      });
      
      logger.debug(`Task "${taskName}" added to queue, priority ${priority}`);
      
      // Start processing if not already
      if (!this.isProcessing) {
        this.process();
      }
    });
  }

  /**
   * Process tasks in the queue
   */
  async process() {
    if (this.tasks.length === 0 || this.activeCount >= this.maxConcurrent) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    
    // Sort tasks by priority (highest first)
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    // Get the next task
    const task = this.tasks.shift();
    this.activeCount++;
    
    // Execute the task
    task.startTime = Date.now();
    logger.debug(`Executing task "${task.name}"`);

    try {
      const result = await task.execute();
      this.stats.totalProcessed++;
      this.stats.totalSucceeded++;
      
      const duration = Date.now() - task.startTime;
      logger.debug(`Task "${task.name}" completed in ${duration}ms`);
      
      // Resolve the task promise
      task.resolve(result);
    } catch (error) {
      this.stats.totalProcessed++;
      this.stats.totalFailed++;
      
      logger.error(`Task "${task.name}" failed:`, error);
      task.reject(error);
    } finally {
      this.activeCount--;
      
      // Continue processing remaining tasks
      setImmediate(() => this.process());
    }
    
    // Try to process another task in parallel if possible
    if (this.activeCount < this.maxConcurrent && this.tasks.length > 0) {
      setImmediate(() => this.process());
    }
  }

  /**
   * Get current queue statistics
   * @returns {Object} - Queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.tasks.length,
      activeCount: this.activeCount
    };
  }
}

module.exports = new TaskQueue();