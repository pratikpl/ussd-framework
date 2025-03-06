// admin/server/controllers/helperController.js
const path = require('path');
const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { loadFrameworkConfig } = require('../utils/frameworkConfig');

// Get all helper functions
exports.getHelpers = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  
  // Function to recursively list all .js files in a directory
  async function listJsFiles(dir, baseDir = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseDir, entry.name);
      
      if (entry.isDirectory()) {
        files = files.concat(await listJsFiles(fullPath, relativePath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const stats = await fs.stat(fullPath);
        
        // Extract description from file (simple approach)
        const content = await fs.readFile(fullPath, 'utf8');
        const lines = content.split('\n');
        let description = 'No description';
        
        // Look for a comment that might be a description
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('/*')) {
            description = line.replace(/^\/\/\s*|^\/\*\s*|\s*\*\/$/g, '');
            break;
          }
        }
        
        files.push({
          name: entry.name.replace('.js', ''),
          path: relativePath.replace('.js', ''),
          fullPath: path.relative(config.helpersPath, fullPath),
          description,
          updatedAt: stats.mtime
        });
      }
    }
    
    return files;
  }
  
  try {
    const helpers = await listJsFiles(config.helpersPath);
    
    res.status(200).json({
      success: true,
      count: helpers.length,
      data: helpers
    });
  } catch (error) {
    logger.error('Error listing helper functions:', error);
    throw new ErrorResponse('Error listing helper functions', 500);
  }
});

// Get a single helper function
exports.getHelper = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const helperPath = req.params.path;
  const filePath = path.join(config.helpersPath, `${helperPath}.js`);
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    res.status(200).json({
      success: true,
      data: {
        name: path.basename(helperPath),
        path: helperPath,
        content
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ErrorResponse(`Helper function ${helperPath} not found`, 404);
    } else {
      logger.error(`Error reading helper function ${helperPath}:`, error);
      throw new ErrorResponse('Error reading helper function', 500);
    }
  }
});

// Create a helper function
exports.createHelper = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const helperPath = req.params.path;
  const { content } = req.body;
  
  if (!content) {
    throw new ErrorResponse('Helper function content is required', 400);
  }
  
  const filePath = path.join(config.helpersPath, `${helperPath}.js`);
  
  try {
    // Check if helper already exists
    try {
      await fs.access(filePath);
      throw new ErrorResponse(`Helper function ${helperPath} already exists`, 400);
    } catch (error) {
      // File doesn't exist, we can proceed
      if (error instanceof ErrorResponse) {
        throw error;
      }
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the helper function to file
    await fs.writeFile(filePath, content);
    
    res.status(201).json({
      success: true,
      data: {
        name: path.basename(helperPath),
        path: helperPath,
        content
      }
    });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error creating helper function ${helperPath}:`, error);
      throw new ErrorResponse('Error creating helper function', 500);
    }
  }
});

// Update a helper function
exports.updateHelper = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const helperPath = req.params.path;
  const { content } = req.body;
  
  if (!content) {
    throw new ErrorResponse('Helper function content is required', 400);
  }
  
  const filePath = path.join(config.helpersPath, `${helperPath}.js`);
  
  try {
    // Check if helper exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new ErrorResponse(`Helper function ${helperPath} not found`, 404);
    }
    
    // Write the helper function to file
    await fs.writeFile(filePath, content);
    
    res.status(200).json({
      success: true,
      data: {
        name: path.basename(helperPath),
        path: helperPath,
        content
      }
    });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error updating helper function ${helperPath}:`, error);
      throw new ErrorResponse('Error updating helper function', 500);
    }
  }
});

// Delete a helper function
exports.deleteHelper = asyncHandler(async (req, res) => {
  const config = await loadFrameworkConfig();
  const helperPath = req.params.path;
  const filePath = path.join(config.helpersPath, `${helperPath}.js`);
  
  try {
    // Check if helper exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new ErrorResponse(`Helper function ${helperPath} not found`, 404);
    }
    
    // Delete the helper function
    await fs.unlink(filePath);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    } else {
      logger.error(`Error deleting helper function ${helperPath}:`, error);
      throw new ErrorResponse('Error deleting helper function', 500);
    }
  }
});