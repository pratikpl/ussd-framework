// admin/server/controllers/flowController.js
const path = require('path');
const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { loadFrameworkConfig } = require('../utils/frameworkConfig');

// Get all flows
exports.getFlows = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  
  // Read the flows directory
  const files = await fs.readdir(config.flowsPath);
  
  // Filter for JSON files and extract flow info
  const flows = await Promise.all(
    files
      .filter(file => file.endsWith('.json'))
      .map(async file => {
        const filePath = path.join(config.flowsPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const flowName = path.basename(file, '.json');
        
        try {
          const flowData = JSON.parse(content);
          return {
            name: flowName,
            appName: flowData.appName || flowName,
            shortCode: flowData.shortCode || 'Unknown',
            version: flowData.version || '1.0.0',
            screens: flowData.screens ? Object.keys(flowData.screens).length : 0,
            updatedAt: (await fs.stat(filePath)).mtime
          };
        } catch (error) {
          logger.error(`Error parsing flow ${flowName}:`, error);
          return {
            name: flowName,
            appName: flowName,
            shortCode: 'Error',
            version: 'Error',
            screens: 0,
            error: 'Invalid JSON',
            updatedAt: (await fs.stat(filePath)).mtime
          };
        }
      })
  );
  
  res.status(200).json({ success: true, count: flows.length, data: flows });
});

// Get single flow
exports.getFlow = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const flowName = req.params.id;
  const filePath = path.join(config.flowsPath, `${flowName}.json`);
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const flowData = JSON.parse(content);
    
    res.status(200).json({ success: true, data: flowData });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ErrorResponse(`Flow with name ${flowName} not found`, 404);
    } else {
      logger.error(`Error reading flow ${flowName}:`, error);
      throw new ErrorResponse('Error reading flow', 500);
    }
  }
});

// Create new flow
exports.createFlow = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const flowName = req.params.id;
  const filePath = path.join(config.flowsPath, `${flowName}.json`);
  
  try {
    // Check if flow already exists
    try {
      await fs.access(filePath);
      throw new ErrorResponse(`Flow with name ${flowName} already exists`, 400);
    } catch (error) {
      // File doesn't exist, we can proceed
      if (error instanceof ErrorResponse) {
        throw error;
      }
    }
    
    // Validate the flow structure (simplified for now)
    const flowData = req.body;
    
    if (!flowData.appName) {
      throw new ErrorResponse('Flow must have an appName', 400);
    }
    
    if (!flowData.screens || !flowData.screens.welcome) {
      throw new ErrorResponse('Flow must have at least a welcome screen', 400);
    }
    
    // Write the flow to file
    await fs.writeFile(filePath, JSON.stringify(flowData, null, 2));
    
    res.status(201).json({ success: true, data: flowData });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error creating flow ${flowName}:`, error);
      throw new ErrorResponse('Error creating flow', 500);
    }
  }
});

// Update flow
exports.updateFlow = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const flowName = req.params.id;
  const filePath = path.join(config.flowsPath, `${flowName}.json`);
  
  try {
    // Check if flow exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new ErrorResponse(`Flow with name ${flowName} not found`, 404);
    }
    
    // Validate the flow structure (simplified for now)
    const flowData = req.body;
    
    if (!flowData.appName) {
      throw new ErrorResponse('Flow must have an appName', 400);
    }
    
    if (!flowData.screens || !flowData.screens.welcome) {
      throw new ErrorResponse('Flow must have at least a welcome screen', 400);
    }
    
    // Write the flow to file
    await fs.writeFile(filePath, JSON.stringify(flowData, null, 2));
    
    res.status(200).json({ success: true, data: flowData });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error updating flow ${flowName}:`, error);
      throw new ErrorResponse('Error updating flow', 500);
    }
  }
});

// Delete flow
exports.deleteFlow = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const flowName = req.params.id;
  const filePath = path.join(config.flowsPath, `${flowName}.json`);
  
  try {
    // Check if flow exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new ErrorResponse(`Flow with name ${flowName} not found`, 404);
    }
    
    // Delete the flow file
    await fs.unlink(filePath);
    
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error deleting flow ${flowName}:`, error);
      throw new ErrorResponse('Error deleting flow', 500);
    }
  }
});