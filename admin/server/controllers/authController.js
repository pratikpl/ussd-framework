// admin/server/controllers/authController.js
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// User store (in a real app, this would be in a database)
const usersFilePath = path.join(__dirname, '../data/users.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Get or create users file
async function getUsers() {
  try {
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(usersFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create default admin user if file doesn't exist
        const defaultUser = {
          username: 'admin',
          password: await bcrypt.hash('admin', 10),
          name: 'Administrator',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        
        const users = [defaultUser];
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        
        logger.info('Created default admin user');
        return users;
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error accessing users file:', error);
    throw error;
  }
}

// Save users to file
async function saveUsers(users) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    logger.error('Error saving users file:', error);
    throw error;
  }
}

// Login
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  // Validate inputs
  if (!username || !password) {
    throw new ErrorResponse('Please provide username and password', 400);
  }
  
  // Get users
  const users = await getUsers();
  
  // Find user
  const user = users.find(u => u.username === username);
  
  if (!user) {
    throw new ErrorResponse('Invalid credentials', 401);
  }
  
  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new ErrorResponse('Invalid credentials', 401);
  }
  
  // Generate token
  const token = jwt.sign(
    { id: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  
  // Remove password from user object
  const userResponse = { ...user };
  delete userResponse.password;
  
  res.status(200).json({
    success: true,
    token,
    user: userResponse
  });
});

// Get current user
exports.getMe = asyncHandler(async (req, res) => {
  // Get users
  const users = await getUsers();
  
  // Find user
  const user = users.find(u => u.username === req.user.id);
  
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }
  
  // Remove password from user object
  const userResponse = { ...user };
  delete userResponse.password;
  
  res.status(200).json({
    success: true,
    data: userResponse
  });
});

// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Validate inputs
  if (!currentPassword || !newPassword) {
    throw new ErrorResponse('Please provide current and new passwords', 400);
  }
  
  // Get users
  const users = await getUsers();
  
  // Find user
  const userIndex = users.findIndex(u => u.username === req.user.id);
  
  if (userIndex === -1) {
    throw new ErrorResponse('User not found', 404);
  }
  
  // Check current password
  const isMatch = await bcrypt.compare(currentPassword, users[userIndex].password);
  
  if (!isMatch) {
    throw new ErrorResponse('Current password is incorrect', 401);
  }
  
  // Update password
  users[userIndex].password = await bcrypt.hash(newPassword, 10);
  
  // Save users
  await saveUsers(users);
  
  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});