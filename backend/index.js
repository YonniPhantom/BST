const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const studentsRoutes = require('./routes/students');
const driveRoutes = require('./routes/drive');
const usbDevicesRoutes = require('./routes/usb-devices');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (for serving Excel files if needed)
app.use('/data', express.static(path.join(__dirname, '../data')));

// Routes
console.log('📍 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('  ✓ /api/auth');
app.use('/api/health', healthRoutes);
console.log('  ✓ /api/health');
app.use('/api/students', studentsRoutes);
console.log('  ✓ /api/students');
app.use('/api/drive', driveRoutes);
console.log('  ✓ /api/drive');
app.use('/api', usbDevicesRoutes);
console.log('  ✓ /api (USB devices)');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BST Backend API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/api/health',
      students: '/api/students',
      drive: '/api/drive',
      usbDevices: '/api/check-usb-devices'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`BST Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
