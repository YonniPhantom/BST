const express = require('express');
const { getDb, createDb } = require('../lib/db');
const { logsDir } = require('../lib/logger');
const router = express.Router();

// GET /api/health - Check database connection
router.get('/', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(404).json({
        error: "Database not found or not initialized",
        message: "Would you like to create the database?",
        action: "Use POST request to create database"
      });
    }

    res.json({
      message: "Database connection successful",
      status: "healthy"
    });
  } catch (error) {
    console.error("Error connecting to database:", error);
    res.status(500).json({
      error: "Database connection failed",
      message: error.message
    });
  }
});

// POST /api/health - Create database
router.post('/', (req, res) => {
  try {
    console.log("Creating database...");
    const database = createDb();

    if (!database) {
      return res.status(500).json({
        error: "Failed to create database connection"
      });
    }

    res.json({
      message: "Database created and initialized successfully",
      status: "created"
    });
  } catch (error) {
    console.error("Error creating database:", error);
    res.status(500).json({
      error: `Database creation failed: ${error.message}`
    });
  }
});

// GET /api/health/test - Simple test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Health endpoint working correctly',
    timestamp: new Date().toISOString(),
    server: 'BST Backend'
  });
});

// GET /api/health/logs-path - Get logs directory path
router.get('/logs-path', (req, res) => {
  res.json({
    logsDir: logsDir,
    message: 'Logs directory path'
  });
});

// GET /api/health/check-excel - Check Excel file status and format
router.get('/check-excel', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const XLSX = require('xlsx');

  try {
    const excelPath = path.join(__dirname, '../data/alumnos.xlsx');
    console.log('🔍 Verificando Excel en ruta:', excelPath);
    console.log('📁 Archivo existe:', fs.existsSync(excelPath));

    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        error: "Excel file not found",
        message: "No se encontró el archivo Excel de alumnos",
        path: excelPath,
        exists: false
      });
    }

    // Validate Excel format
    try {
      console.log('📖 Leyendo archivo Excel...');
      const workbook = XLSX.readFile(excelPath);
      console.log('📊 Hojas encontradas:', workbook.SheetNames);

      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      console.log('📄 Procesando hoja:', firstSheet);

      // Check if worksheet has data
      if (!worksheet['!ref']) {
        return res.status(400).json({
          error: "Invalid Excel format",
          message: "El archivo Excel está vacío o no tiene datos válidos",
          exists: true,
          valid: false
        });
      }

      // Extract headers from first row
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const headers = [];

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        const value = (cell && cell.v) ? cell.v.toString().trim() : "";
        headers.push(value);
      }

      console.log('📋 Headers encontrados en Excel:', headers);

      // Expected headers (flexible matching)
      const expectedHeaders = ["NUM CONTROL", "NOMBRE COMPLETO", "CARRERA"];
      const normalizedHeaders = headers.map(h => h.toUpperCase().trim());
      const normalizedExpected = expectedHeaders.map(h => h.toUpperCase());

      console.log('🔍 Headers normalizados encontrados:', normalizedHeaders);
      console.log('🎯 Headers esperados:', normalizedExpected);

      // Buscar coincidencias flexibles
      const headerMatches = {};
      normalizedExpected.forEach(expected => {
        const match = normalizedHeaders.find(header => {
          // Coincidencia exacta
          if (header === expected) return true;

          // Coincidencias parciales comunes
          if (expected === 'NUM CONTROL' && (header.includes('CONTROL') || header.includes('MATRICULA'))) return true;
          if (expected === 'NOMBRE COMPLETO' && header.includes('NOMBRE')) return true;
          if (expected === 'CARRERA' && header.includes('CARRERA')) return true;

          return false;
        });

        if (match) {
          headerMatches[expected] = match;
        }
      });

      const missingHeaders = normalizedExpected.filter(h => !headerMatches[h]);

      console.log('✅ Headers coincidentes:', headerMatches);
      console.log('❌ Headers faltantes:', missingHeaders);

      if (missingHeaders.length > 0) {
        // En lugar de fallar, intentar continuar con advertencia
        console.log('⚠️ Algunos headers no coinciden exactamente, pero continuando...');

        return res.status(200).json({
          message: "Excel file found with warnings",
          path: excelPath,
          exists: true,
          valid: true,
          warnings: `Algunas columnas no coinciden exactamente: ${missingHeaders.join(", ")}`,
          size: require('fs').statSync(excelPath).size,
          lastModified: require('fs').statSync(excelPath).mtime,
          headers: headers,
          headerMatches: headerMatches
        });
      }

      const stats = fs.statSync(excelPath);
      res.json({
        message: "Excel file found and valid",
        path: excelPath,
        exists: true,
        valid: true,
        size: stats.size,
        lastModified: stats.mtime,
        headers: headers
      });

    } catch (excelError) {
      console.error("❌ Error validating Excel format:", excelError);
      return res.status(400).json({
        error: "Invalid Excel file",
        message: "El archivo Excel parece estar dañado o no se puede leer",
        details: excelError.message,
        exists: true,
        valid: false
      });
    }

  } catch (error) {
    console.error("Error checking Excel file:", error);
    res.status(500).json({
      error: "Failed to check Excel file",
      message: error.message
    });
  }
});

// POST /api/health/upload-excel - Upload Excel file
router.post('/upload-excel', (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  // Configure multer for file upload
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../data');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Create backup of existing file
      const targetPath = path.join(__dirname, '../data/alumnos.xlsx');
      if (fs.existsSync(targetPath)) {
        const backupPath = path.join(__dirname, `../data/alumnos.xlsx.backup-${Date.now()}`);
        fs.copyFileSync(targetPath, backupPath);
      }
      cb(null, 'alumnos.xlsx');
    }
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx) are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  upload.single('excel')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: "File upload failed",
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }

    res.json({
      message: "Excel file uploaded successfully",
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    });
  });
});

// GET /api/health/backups - List Excel backup files
router.get('/backups', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const dataDir = path.join(__dirname, '../data');
    console.log('📁 Buscando backups en:', dataDir);

    if (!fs.existsSync(dataDir)) {
      return res.json({
        backups: [],
        message: 'No backup directory found'
      });
    }

    // Leer archivos del directorio
    const files = fs.readdirSync(dataDir);
    console.log('📂 Archivos encontrados:', files);

    // Filtrar solo archivos de backup (que contengan .backup-)
    const backupFiles = files.filter(file =>
      file.includes('.backup-') && file.startsWith('alumnos.xlsx')
    );
    console.log('🔍 Archivos de backup filtrados:', backupFiles);

    // Obtener información detallada de cada backup
    const backups = backupFiles.map(filename => {
      const filePath = path.join(dataDir, filename);
      const stats = fs.statSync(filePath);

      // Extraer timestamp del nombre del archivo
      const timestampMatch = filename.match(/\.backup-(\d+)/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : null;
      const createdDate = timestamp ? new Date(timestamp) : stats.birthtime;

      return {
        filename,
        path: filePath,
        size: stats.size,
        created: createdDate.toISOString(),
        createdFormatted: createdDate.toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        sizeFormatted: formatFileSize(stats.size)
      };
    });

    // Ordenar por fecha de creación (más reciente primero)
    backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    console.log(`📋 Encontrados ${backups.length} backups`);

    res.json({
      backups,
      count: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0)
    });

  } catch (error) {
    console.error('❌ Error listando backups:', error);
    res.status(500).json({
      error: 'Error listing backup files',
      message: error.message
    });
  }
});

// DELETE /api/health/backups/:filename - Delete a specific backup file
router.delete('/backups/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const { filename } = req.params;

    // Validar que el archivo sea realmente un backup
    if (!filename.includes('.backup-') || !filename.endsWith('.xlsx')) {
      return res.status(400).json({
        error: 'Invalid backup filename',
        message: 'Solo se pueden eliminar archivos de backup'
      });
    }

    const filePath = path.join(__dirname, '../data', filename);
    console.log('🗑️ Eliminando backup:', filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Backup file not found',
        message: 'El archivo de backup no existe'
      });
    }

    // Eliminar el archivo
    fs.unlinkSync(filePath);

    console.log('✅ Backup eliminado exitosamente:', filename);

    res.json({
      success: true,
      message: 'Backup eliminado exitosamente',
      filename: filename
    });

  } catch (error) {
    console.error('❌ Error eliminando backup:', error);
    res.status(500).json({
      error: 'Error deleting backup file',
      message: error.message
    });
  }
});

// DELETE /api/health/backups - Delete all backup files
router.delete('/backups', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const dataDir = path.join(__dirname, '../data');
    console.log('🗑️ Eliminando todos los backups en:', dataDir);

    if (!fs.existsSync(dataDir)) {
      return res.json({
        success: true,
        message: 'No backup directory found',
        deletedCount: 0
      });
    }

    // Leer archivos del directorio
    const files = fs.readdirSync(dataDir);

    // Filtrar solo archivos de backup
    const backupFiles = files.filter(file =>
      file.includes('.backup-') && file.endsWith('.xlsx')
    );

    let deletedCount = 0;
    const errors = [];

    // Eliminar cada backup
    backupFiles.forEach(filename => {
      try {
        const filePath = path.join(dataDir, filename);
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log('✅ Eliminado:', filename);
      } catch (error) {
        console.error('❌ Error eliminando:', filename, error);
        errors.push({ filename, error: error.message });
      }
    });

    console.log(`🗑️ Eliminados ${deletedCount} backups`);

    res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} archivos de backup`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error eliminando backups:', error);
    res.status(500).json({
      error: 'Error deleting backup files',
      message: error.message
    });
  }
});

// Función helper para formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// POST /api/health/cleanup-backups - Clean old backups manually
router.post('/cleanup-backups', (req, res) => {
  const { cleanOldBackups } = require('../lib/utils');
  const path = require('path');

  try {
    const excelPath = path.join(__dirname, '../data/alumnos.xlsx');
    console.log('🧹 Iniciando limpieza manual de backups...');

    cleanOldBackups(excelPath);

    res.json({
      success: true,
      message: 'Limpieza de backups completada. Se mantuvieron solo los 5 más recientes.'
    });

  } catch (error) {
    console.error('❌ Error en limpieza manual de backups:', error);
    res.status(500).json({
      error: 'Error cleaning backups',
      message: error.message
    });
  }
});

// POST /api/health/restore-backup - Restore Excel from a backup file
router.post('/restore-backup', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { createBackup } = require('../lib/utils');

  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: 'Filename is required',
        message: 'Debe especificar el nombre del archivo de backup'
      });
    }

    const dataDir = path.join(__dirname, '../data');
    const backupPath = path.join(dataDir, filename);
    const excelPath = path.join(dataDir, 'alumnos.xlsx');

    console.log('🔄 Iniciando restauración de backup...');
    console.log('📁 Backup a restaurar:', backupPath);
    console.log('🎯 Archivo destino:', excelPath);

    // Verificar que el backup existe
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        error: 'Backup file not found',
        message: `El archivo de backup "${filename}" no existe`
      });
    }

    // Crear backup del archivo actual antes de restaurar
    console.log('💾 Creando backup del estado actual antes de restaurar...');
    const currentBackup = createBackup(excelPath);

    if (!currentBackup) {
      console.warn('⚠️ No se pudo crear backup del estado actual, continuando...');
    } else {
      console.log('✅ Backup del estado actual creado:', currentBackup);
    }

    // Restaurar el backup
    console.log('🔄 Restaurando backup...');
    fs.copyFileSync(backupPath, excelPath);

    // Obtener información del backup restaurado
    const stats = fs.statSync(backupPath);
    const timestampMatch = filename.match(/\.backup-(\d+)/);
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : null;
    const backupDate = timestamp ? new Date(timestamp) : stats.birthtime;

    console.log('✅ Backup restaurado exitosamente');

    res.json({
      success: true,
      message: `Excel restaurado desde el backup "${filename}"`,
      restoredFrom: {
        filename,
        date: backupDate.toISOString(),
        size: stats.size
      },
      currentBackup: currentBackup ? path.basename(currentBackup) : null
    });

  } catch (error) {
    console.error('❌ Error restaurando backup:', error);
    res.status(500).json({
      error: 'Error restoring backup',
      message: error.message
    });
  }
});

module.exports = router;
