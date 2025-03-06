// admin/server/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import routes
const flowRoutes = require('./routes/flowRoutes');
const helperRoutes = require('./routes/helperRoutes');
const logRoutes = require('./routes/logRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const statusRoutes = require('./routes/statusRoutes');

// Setup logger
const logger = require('./utils/logger');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, 'logs');
  fs.mkdir(logsDir, { recursive: true }).catch(console.error);
  
  // Log to file in production
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
  }));
}

// Routes
app.use('/api/flows', flowRoutes);
app.use('/api/helpers', helperRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/status', statusRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to USSD Framework Admin API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});