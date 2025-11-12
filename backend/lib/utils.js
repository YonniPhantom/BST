/**
 * Utility functions for the BST Backend
 */

const fs = require('fs');
const path = require('path');

/**
 * Ensure a directory exists, create it if it doesn't
 * @param {string} dirPath - Path to directory
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Create a backup of a file with timestamp
 * @param {string} filePath - Path to file to backup
 * @returns {string|null} - Path to backup file or null if original doesn't exist
 */
function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup-${timestamp}`;
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Limpiar backups antiguos automáticamente (mantener solo los 5 más recientes)
    cleanOldBackups(filePath);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    return null;
  }
}

/**
 * Clean old backup files (keep only last 5)
 * @param {string} baseFilePath - Base file path to clean backups for
 */
function cleanOldBackups(baseFilePath) {
  try {
    const dir = path.dirname(baseFilePath);
    const baseName = path.basename(baseFilePath);
    
    const files = fs.readdirSync(dir)
      .filter(file => file.startsWith(`${baseName}.backup-`))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        time: fs.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    // Keep only the 5 most recent backups
    const filesToDelete = files.slice(5);
    
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to delete backup ${file.name}:`, error);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to clean old backups:', error);
  }
}

/**
 * Validate Excel file structure
 * @param {string} filePath - Path to Excel file
 * @returns {Object} - Validation result
 */
function validateExcelFile(filePath) {
  const XLSX = require('xlsx');
  
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    // Try to read the Excel file
    const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { valid: false, error: 'No sheets found in Excel file' };
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return { valid: false, error: 'Excel sheet is empty' };
    }
    
    // Look for expected headers
    let hasValidHeaders = false;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('control') || rowStr.includes('matricula')) {
          hasValidHeaders = true;
          break;
        }
      }
    }
    
    if (!hasValidHeaders) {
      return { 
        valid: false, 
        error: 'No valid headers found (expected: nombre, control/matricula, carrera)' 
      };
    }
    
    return { 
      valid: true, 
      sheets: workbook.SheetNames.length,
      rows: jsonData.length,
      size: stats.size
    };
    
  } catch (error) {
    return { 
      valid: false, 
      error: `Failed to validate Excel file: ${error.message}` 
    };
  }
}

/**
 * Format response for API endpoints
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @returns {Object} - Formatted response
 */
function formatResponse(success, data = null, message = null) {
  const response = { success };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * Format error response for API endpoints
 * @param {string} error - Error message
 * @param {*} details - Additional error details
 * @returns {Object} - Formatted error response
 */
function formatError(error, details = null) {
  const response = { error };
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Log request information
 * @param {Object} req - Express request object
 * @param {string} action - Action being performed
 */
function logRequest(req, action) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - ${action} (IP: ${ip})`);
}

/**
 * Sanitize filename for safe file operations
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Check if running in Electron environment
 * @returns {boolean} - True if running in Electron
 */
function isElectron() {
  return process.versions && process.versions.electron;
}

/**
 * Get application data directory
 * @returns {string} - Path to data directory
 */
function getDataDirectory() {
  const baseDir = isElectron() 
    ? path.join(process.resourcesPath, 'data')
    : path.join(__dirname, '../data');
    
  ensureDirectoryExists(baseDir);
  return baseDir;
}

module.exports = {
  ensureDirectoryExists,
  createBackup,
  cleanOldBackups,
  validateExcelFile,
  formatResponse,
  formatError,
  logRequest,
  sanitizeFilename,
  isElectron,
  getDataDirectory
};
