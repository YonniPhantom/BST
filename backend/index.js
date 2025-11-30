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
const logsRoutes = require('./routes/logs');

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

// Serve frontend static files at /app
app.use('/app', express.static(path.join(__dirname, '../frontend/dist')));

// Redirect root to /app
app.get('/', (req, res) => {
  res.redirect('/app');
});

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
app.use('/api/logs', logsRoutes);
console.log('  ✓ /api/logs');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Catch-all handler for SPA (serve index.html)
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`BST Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
