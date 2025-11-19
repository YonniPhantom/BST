// Logger para el frontend que envía logs al backend
import { API_BASE_URL } from '../shared/Api'

// Tipos de log
type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG'

// Función para enviar log al backend
async function sendLogToBackend(level: LogLevel, message: string, ...args: any[]) {
  try {
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    
    const logMessage = `[FRONTEND] ${message} ${formattedArgs}`
    
    // Enviar al backend de forma asíncrona sin esperar respuesta
    fetch(`${API_BASE_URL}/api/logs/frontend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level,
        message: logMessage,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Ignorar errores de logging para no romper la aplicación
    })
  } catch (error) {
    // Ignorar errores de logging
  }
}

// Guardar referencias originales
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
}

// Sobrescribir console.log
console.log = function(...args: any[]) {
  originalConsole.log.apply(console, args)
  sendLogToBackend('INFO', '', ...args)
}

// Sobrescribir console.error
console.error = function(...args: any[]) {
  originalConsole.error.apply(console, args)
  sendLogToBackend('ERROR', '', ...args)
}

// Sobrescribir console.warn
console.warn = function(...args: any[]) {
  originalConsole.warn.apply(console, args)
  sendLogToBackend('WARN', '', ...args)
}

// Sobrescribir console.info
console.info = function(...args: any[]) {
  originalConsole.info.apply(console, args)
  sendLogToBackend('INFO', '', ...args)
}

// Sobrescribir console.debug
console.debug = function(...args: any[]) {
  originalConsole.debug.apply(console, args)
  sendLogToBackend('DEBUG', '', ...args)
}

// Capturar errores no manejados
window.addEventListener('error', (event) => {
  sendLogToBackend('ERROR', 'Unhandled error:', event.error?.message || event.message, event.error?.stack)
})

// Capturar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  sendLogToBackend('ERROR', 'Unhandled promise rejection:', event.reason)
})

console.log('📝 Frontend logger initialized')

export {}
