const fs = require('fs');
const path = require('path');

// Determinar la carpeta de logs
// En Electron, usar userData/logs
// En desarrollo, usar backend/logs
let logsDir;

if (process.env.USER_DATA_PATH) {
  // En Electron
  logsDir = path.join(process.env.USER_DATA_PATH, 'logs');
} else {
  // En desarrollo
  logsDir = path.join(__dirname, '../logs');
}

// Crear carpeta de logs si no existe
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Función para formatear fecha
function formatDate() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

// Función para obtener el nombre del archivo de log del día
function getLogFileName() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir, `backend-${dateStr}.log`);
}

// Función para escribir en el archivo de log
function writeToFile(level, message, ...args) {
  try {
    const logFile = getLogFileName();
    const timestamp = formatDate();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    const logMessage = `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`;
    
    fs.appendFileSync(logFile, logMessage, 'utf8');
  } catch (error) {
    // Si falla el logging, no queremos romper la aplicación
    console.error('Error writing to log file:', error);
  }
}

// Sobrescribir console.log, console.error, etc.
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

console.log = function(...args) {
  originalConsole.log.apply(console, args);
  writeToFile('INFO', '', ...args);
};

console.error = function(...args) {
  originalConsole.error.apply(console, args);
  writeToFile('ERROR', '', ...args);
};

console.warn = function(...args) {
  originalConsole.warn.apply(console, args);
  writeToFile('WARN', '', ...args);
};

console.info = function(...args) {
  originalConsole.info.apply(console, args);
  writeToFile('INFO', '', ...args);
};

console.debug = function(...args) {
  originalConsole.debug.apply(console, args);
  writeToFile('DEBUG', '', ...args);
};

// Exportar información sobre los logs
module.exports = {
  logsDir,
  getLogFileName,
  writeToFile
};

console.log('📝 Logger initialized. Logs directory:', logsDir);
