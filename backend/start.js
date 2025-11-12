#!/usr/bin/env node

/**
 * BST Backend Startup Script
 * This script handles the startup of the Express server with proper error handling
 * and environment setup for both development and production environments.
 */

const path = require('path');
const fs = require('fs');

// Set up environment
const isDev = process.env.NODE_ENV !== 'production';
const isElectron = process.versions && process.versions.electron;

console.log('🚀 Starting BST Backend Server...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`⚡ Electron: ${isElectron ? 'Yes' : 'No'}`);

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✅ Environment variables loaded');
} else {
  console.log('⚠️  No .env file found, using system environment');
}

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

// Set default port if not specified
if (!process.env.PORT) {
  process.env.PORT = '3001';
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
try {
  require('./index.js');
} catch (error) {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
}
