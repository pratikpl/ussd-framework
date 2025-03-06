// admin/server/controllers/statusController.js
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { loadFrameworkConfig } = require('../utils/frameworkConfig');
const logger = require('../utils/logger');

// Get system status
exports.getStatus = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  
  // Get system info
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown'
    },
    uptime: {
      system: os.uptime(),
      process: process.uptime()
    },
    loadAverage: os.loadavg()
  };
  
  // Get framework info
  const frameworkInfo = {
    config: {
      flowsPath: config.flowsPath,
      helpersPath: config.helpersPath,
      logsPath: config.logsPath
    }
  };
  
  // Get flow count
  try {
    const flowFiles = await fs.readdir(config.flowsPath);
    frameworkInfo.flows = {
      count: flowFiles.filter(file => file.endsWith('.json')).length
    };
  } catch (error) {
    frameworkInfo.flows = { count: 0, error: error.message };
  }
  
  // Get helper count
  try {
    async function countJsFiles(dir) {
      let count = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          count += await countJsFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          count++;
        }
      }
      
      return count;
    }
    
    frameworkInfo.helpers = {
      count: await countJsFiles(config.helpersPath)
    };
  } catch (error) {
    frameworkInfo.helpers = { count: 0, error: error.message };
  }
  
  // Get process info
  let processInfo = {};
  try {
    // Check if framework process is running
    const { stdout } = await execPromise('ps aux | grep "node.*ussd-framework" | grep -v grep');
    if (stdout) {
      processInfo.running = true;
      processInfo.processes = stdout.trim().split('\n').length;
    } else {
      processInfo.running = false;
    }
  } catch (error) {
    // Process not found or command failed
    processInfo.running = false;
    processInfo.error = error.message;
  }
  
  res.status(200).json({
    success: true,
    data: {
      system: systemInfo,
      framework: frameworkInfo,
      process: processInfo,
      timestamp: new Date().toISOString()
    }
  });
});