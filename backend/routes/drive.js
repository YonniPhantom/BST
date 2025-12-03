const express = require('express');
const XLSX = require('xlsx');
const { authenticateToken, getAuthorizedDriveClient } = require('../lib/auth');
const router = express.Router();

// GET /api/drive/list - List Excel files from Google Drive
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const tokenPreview = req.user.accessToken ? req.user.accessToken.substring(0, 20) : 'undefined';
    console.log('🔍 Intentando acceder a Drive con accessToken:', tokenPreview + '...');
    const drive = getAuthorizedDriveClient(req.user.accessToken);

    const response = await drive.files.list({
      q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false",
      fields: 'files(id, name, modifiedTime, size, webViewLink)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink
      }))
    });

  } catch (error) {
    console.error('Error listing Drive files:', error);

    if (error.code === 401) {
      return res.status(401).json({
        error: 'Authentication expired. Please refresh the page and sign in again.'
      });
    }

    res.status(500).json({
      error: 'Failed to list Drive files',
      message: error.message
    });
  }
});

// GET /api/drive/content - Get Excel file content from Google Drive
router.get('/content', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({
        error: 'File ID is required'
      });
    }

    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, modifiedTime'
    });

    // Download file content
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    // Parse Excel content
    const workbook = XLSX.read(response.data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find headers
    let headerRowIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('control') || rowStr.includes('matricula')) {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
    }

    // Extract student data
    const students = [];
    if (headerRowIndex !== -1) {
      const indexCol = headers.findIndex(h =>
        h && (h.toString().trim() === '#' || h.toString().toLowerCase().includes('no.'))
      );
      const nombreCol = headers.findIndex(h =>
        h && h.toString().toLowerCase().includes('nombre')
      );
      const matriculaCol = headers.findIndex(h => {
        if (!h) return false;
        const headerText = h.toString().toLowerCase();
        return headerText.includes('control') ||
          headerText.includes('matricula') ||
          (headerText.includes('número') && headerText.includes('control')) ||
          (headerText.includes('numero') && headerText.includes('control'));
      });
      const carreraCol = headers.findIndex(h =>
        h && h.toString().toLowerCase().includes('carrera')
      );
      const horaCol = headers.findIndex(h =>
        h && (h.toString().toLowerCase().includes('hora') || h.toString().toLowerCase().includes('entrada'))
      );

      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row)) continue;

        const nombre = String(row[nombreCol] || '').trim();
        const matricula = String(row[matriculaCol] || '').trim();
        const carrera = String(row[carreraCol] || '').trim();

        if (nombre || matricula) {
          students.push({
            nombre,
            matricula,
            carrera,
            nombre,
            matricula,
            carrera,
            horaEntrada: horaCol !== -1 ? row[horaCol] : '',
            rowIndex: i
          });
        }
      }
    }

    // Preparar datos en el formato que espera el frontend
    const excelData = {
      sheets: {
        [sheetName]: jsonData
      },
      sheetNames: [sheetName]
    };

    res.json({
      success: true,
      file: {
        id: fileMetadata.data.id,
        name: fileMetadata.data.name,
        size: fileMetadata.data.size,
        modifiedTime: fileMetadata.data.modifiedTime
      },
      // Estructura para compatibilidad con el frontend
      sheets: excelData.sheets,
      sheetNames: excelData.sheetNames,
      // Información adicional para debugging
      metadata: {
        headers: headers,
        headerRowIndex: headerRowIndex,
        totalRows: jsonData.length,
        studentsCount: students.length
      }
    });

  } catch (error) {
    console.error('Error getting Drive file content:', error);

    if (error.code === 401) {
      return res.status(401).json({
        error: 'Authentication expired. Please refresh the page and sign in again.'
      });
    }

    if (error.code === 404) {
      return res.status(404).json({
        error: 'File not found or access denied'
      });
    }

    res.status(500).json({
      error: 'Failed to get file content',
      message: error.message
    });
  }
});

// POST /api/drive/sync - Sync local Excel with Google Drive
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { fileId, excelData, direction = 'upload' } = req.body;

    if (!fileId) {
      return res.status(400).json({
        error: 'File ID is required'
      });
    }

    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Si se envían datos del Excel, procesarlos y subirlos a Drive
    if (excelData && excelData.sheets && excelData.sheetNames) {
      console.log('📤 Subiendo datos modificados a Google Drive...');
      console.log('📊 Datos recibidos:', {
        sheetNames: excelData.sheetNames,
        sheetsCount: Object.keys(excelData.sheets).length
      });

      // Crear un nuevo workbook con los datos modificados
      const workbook = XLSX.utils.book_new();

      // Procesar cada hoja
      excelData.sheetNames.forEach(sheetName => {
        const sheetData = excelData.sheets[sheetName];
        console.log(`📋 Procesando hoja "${sheetName}" con ${sheetData.length} filas`);

        // Crear worksheet desde los datos
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Convertir workbook a buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Subir el archivo actualizado a Google Drive
      const updateResponse = await drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: buffer
        }
      });

      console.log('✅ Archivo actualizado en Google Drive:', updateResponse.data);

      return res.json({
        success: true,
        message: 'Excel data uploaded to Google Drive successfully',
        fileId: fileId,
        updatedAt: new Date().toISOString()
      });
    }

    // Código original para sincronización con archivo local
    const fs = require('fs');
    const path = require('path');
    const localPath = path.join(__dirname, '../data/alumnos.xlsx');

    if (direction === 'download') {
      // Download from Google Drive to local
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });

      // Ensure data directory exists
      const dataDir = path.dirname(localPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create backup if file exists
      if (fs.existsSync(localPath)) {
        const backupPath = `${localPath}.backup-${Date.now()}`;
        fs.copyFileSync(localPath, backupPath);
      }

      // Write new file
      fs.writeFileSync(localPath, Buffer.from(response.data));

      res.json({
        success: true,
        message: 'File downloaded from Google Drive successfully',
        direction: 'download',
        localPath: localPath
      });

    } else if (direction === 'upload') {
      // Upload from local to Google Drive
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({
          error: 'Local Excel file not found'
        });
      }

      const fileBuffer = fs.readFileSync(localPath);

      const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: fileBuffer
      };

      await drive.files.update({
        fileId: fileId,
        media: media
      });

      res.json({
        success: true,
        message: 'File uploaded to Google Drive successfully',
        direction: 'upload',
        fileId: fileId
      });

    } else {
      return res.status(400).json({
        error: 'Invalid direction. Use "download" or "upload"'
      });
    }

  } catch (error) {
    console.error('❌ Error syncing with Drive:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error message:', error.message);

    // 401: Token expirado
    if (error.code === 401 || error.status === 401) {
      return res.status(401).json({
        error: 'Authentication expired. Please sign in again.',
        code: 'AUTH_EXPIRED'
      });
    }

    // 403: Sin permisos (puede ser archivo de otra cuenta o permisos insuficientes)
    if (error.code === 403 || error.status === 403) {
      console.error('⚠️ Error 403 - Access denied. Details:', error.errors);
      return res.status(403).json({
        error: 'Access denied. You may not have permission to edit this file.',
        code: 'ACCESS_DENIED',
        details: error.message
      });
    }

    // 404: Archivo no encontrado
    if (error.code === 404 || error.status === 404) {
      return res.status(404).json({
        error: 'File not found in Google Drive.',
        code: 'FILE_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to sync with Google Drive',
      message: error.message
    });
  }
});

// POST /api/drive/add-row - Add row to Google Drive Excel file
router.post('/add-row', authenticateToken, async (req, res) => {
  try {
    const { fileId, studentData } = req.body;

    if (!fileId || !studentData) {
      return res.status(400).json({
        error: 'File ID and student data are required'
      });
    }

    const { matricula, nombre, carrera } = studentData;

    if (!matricula || !nombre || !carrera) {
      return res.status(400).json({
        error: 'Student matricula, nombre, and carrera are required'
      });
    }

    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Download current file
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    // Parse Excel
    const workbook = XLSX.read(response.data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    let jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: ''
    });

    // Find header row and column mapping (same logic as in students/register)
    let headerRowIndex = 0;
    let headerRow = [];

    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i] || [];
      const rowText = row.map(cell =>
        cell ? cell.toString().trim().toUpperCase() : ''
      ).join(' ');

      const hasNombre = rowText.includes('NOMBRE');
      const hasControl = rowText.includes('CONTROL') || rowText.includes('MATRICULA');
      const hasCarrera = rowText.includes('CARRERA');
      const hasHora = rowText.includes('HORA') || rowText.includes('ENTRADA');

      const matchCount = [hasNombre, hasControl, hasCarrera, hasHora].filter(Boolean).length;

      console.log(`Row ${i}: ${rowText}`);
      console.log(`Matches: Nombre=${hasNombre}, Control=${hasControl}, Carrera=${hasCarrera}, Hora=${hasHora}`);

      if (matchCount >= 2) {
        headerRowIndex = i;
        headerRow = row;
        console.log('Header row found at index ' + i);
        break;
      }
    }

    // Map columns
    const columnMapping = {};
    headerRow.forEach((header, index) => {
      const headerText = header ? header.toString().trim().toUpperCase() : '';

      if (headerText === '#' || headerText.includes('NO.')) {
        columnMapping['index'] = index;
      } else if (headerText.includes('CONTROL') || headerText.includes('MATRICULA') || (headerText.includes('NUMERO') && headerText.includes('CONTROL'))) {
        columnMapping['matricula'] = index;
      } else if (headerText.includes('NOMBRE')) {
        columnMapping['nombre'] = index;
      } else if (headerText.includes('CARRERA')) {
        columnMapping['carrera'] = index;
      } else if (headerText.includes('HORA') || headerText.includes('ENTRADA')) {
        columnMapping['hora_entrada'] = index;
      }
    });

    console.log('Column Mapping:', columnMapping);

    if (!columnMapping['matricula'] || !columnMapping['nombre'] || !columnMapping['carrera']) {
      return res.status(400).json({
        error: 'Required columns not found in Excel file'
      });
    }

    // Find last row with data
    let lastRowIndex = headerRowIndex;
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
      if (hasData) {
        lastRowIndex = i;
      }
    }

    // Add new row
    const newRowIndex = lastRowIndex + 1;
    const newRow = [];

    while (jsonData.length <= newRowIndex) {
      jsonData.push([]);
    }

    const maxColumns = Math.max(...jsonData.map(row => row.length));
    for (let col = 0; col < maxColumns; col++) {
      newRow[col] = '';
    }

    if (columnMapping['index'] !== undefined) {
      // Calculate max index from existing data
      let maxIndex = 0;
      for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row) continue;
        const val = row[columnMapping['index']];
        if (val && !isNaN(val)) {
          maxIndex = Math.max(maxIndex, parseInt(val));
        }
      }
      newRow[columnMapping['index']] = maxIndex + 1;
    }

    // Ensure we are writing to the correct indices
    if (columnMapping['matricula'] !== undefined) newRow[columnMapping['matricula']] = matricula;
    if (columnMapping['nombre'] !== undefined) newRow[columnMapping['nombre']] = nombre;
    if (columnMapping['carrera'] !== undefined) newRow[columnMapping['carrera']] = carrera;

    if (columnMapping['hora_entrada'] !== undefined) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const [hours, minutes] = timeString.split(':').map(Number);
      const timeDecimal = (hours + minutes / 60) / 24;
      newRow[columnMapping['hora_entrada']] = timeDecimal;
    }

    jsonData[newRowIndex] = newRow;

    // Convert back to Excel
    const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);

    if (columnMapping['hora_entrada'] !== undefined) {
      const cellAddress = XLSX.utils.encode_cell({ r: newRowIndex, c: columnMapping['hora_entrada'] });
      if (newWorksheet[cellAddress]) {
        newWorksheet[cellAddress].z = 'h:mm';
        newWorksheet[cellAddress].t = 'n';
      }
    }

    workbook.Sheets[sheetName] = newWorksheet;

    // Upload updated file
    const newBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Buffer.from(newBuffer)
    };

    await drive.files.update({
      fileId: fileId,
      media: media
    });

    res.json({
      success: true,
      message: 'Row added to Google Drive Excel file successfully',
      rowIndex: newRowIndex,
      student: {
        matricula,
        nombre,
        carrera
      }
    });

  } catch (error) {
    console.error('Error adding row to Drive file:', error);

    if (error.code === 401) {
      return res.status(401).json({
        error: 'Authentication expired. Please refresh the page and sign in again.'
      });
    }

    res.status(500).json({
      error: 'Failed to add row to Google Drive file',
      message: error.message
    });
  }
});

// POST /api/drive/update - Update Google Drive Excel file
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { fileId, data } = req.body;

    if (!fileId || !data) {
      return res.status(400).json({
        error: 'File ID and data are required'
      });
    }

    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Convert data to Excel format
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Buffer.from(buffer)
    };

    await drive.files.update({
      fileId: fileId,
      media: media
    });

    res.json({
      success: true,
      message: 'Google Drive file updated successfully',
      fileId: fileId
    });

  } catch (error) {
    console.error('Error updating Drive file:', error);

    if (error.code === 401) {
      return res.status(401).json({
        error: 'Authentication expired. Please refresh the page and sign in again.'
      });
    }

    res.status(500).json({
      error: 'Failed to update Google Drive file',
      message: error.message
    });
  }
});

// POST /api/drive/validate - Validate Google Drive Excel file format
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        isValid: false,
        errors: ['File ID is required'],
        warnings: []
      });
    }

    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, modifiedTime'
    });

    const file = fileMetadata.data;

    // Check if it's an Excel file
    if (file.mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return res.json({
        isValid: false,
        errors: ['El archivo no es un archivo Excel válido (.xlsx)'],
        warnings: []
      });
    }

    // Download and parse the Excel file to validate structure
    const fileResponse = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    // Parse Excel content
    const workbook = XLSX.read(fileResponse.data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row and validate required columns
    let headerRowIndex = -1;
    let headers = [];
    let errors = [];
    let warnings = [];

    // Look for header row in first 5 rows
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('control') || rowStr.includes('matricula')) {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      errors.push('No se encontró una fila de encabezados válida. Debe contener columnas como "#", "Nombre", "Número Control", "Carrera" y "Hora Entrada"');
    } else {
      console.log('📋 Encabezados encontrados:', headers);
      console.log('📍 Fila de encabezados:', headerRowIndex);

      // Validate required columns based on user request: #, Nombre, Número Control, Carrera, Hora Entrada

      // 1. # (Index column)
      const indexCol = headers.findIndex(h =>
        h && (h.toString().trim() === '#' || h.toString().toLowerCase().includes('no.'))
      );

      // 2. Nombre
      const nombreCol = headers.findIndex(h =>
        h && h.toString().toLowerCase().includes('nombre')
      );

      // 3. Número Control
      const matriculaCol = headers.findIndex(h => {
        if (!h) return false;
        const headerText = h.toString().toLowerCase();
        return headerText.includes('control') ||
          headerText.includes('matricula') ||
          (headerText.includes('número') && headerText.includes('control')) ||
          (headerText.includes('numero') && headerText.includes('control'));
      });

      // 4. Carrera
      const carreraCol = headers.findIndex(h =>
        h && h.toString().toLowerCase().includes('carrera')
      );

      // 5. Hora Entrada
      const horaCol = headers.findIndex(h =>
        h && (h.toString().toLowerCase().includes('hora') || h.toString().toLowerCase().includes('entrada'))
      );

      console.log('🔍 Columnas detectadas:');
      console.log('  - #:', indexCol !== -1 ? `Columna ${indexCol} (${headers[indexCol]})` : 'NO ENCONTRADA');
      console.log('  - NOMBRE:', nombreCol !== -1 ? `Columna ${nombreCol} (${headers[nombreCol]})` : 'NO ENCONTRADA');
      console.log('  - NUMERO CONTROL:', matriculaCol !== -1 ? `Columna ${matriculaCol} (${headers[matriculaCol]})` : 'NO ENCONTRADA');
      console.log('  - CARRERA:', carreraCol !== -1 ? `Columna ${carreraCol} (${headers[carreraCol]})` : 'NO ENCONTRADA');
      console.log('  - HORA ENTRADA:', horaCol !== -1 ? `Columna ${horaCol} (${headers[horaCol]})` : 'NO ENCONTRADA');

      // Check required columns
      if (indexCol === -1) {
        errors.push('Falta la columna "#"');
      }
      if (nombreCol === -1) {
        errors.push('Falta la columna "Nombre"');
      }
      if (matriculaCol === -1) {
        errors.push('Falta la columna "Número Control"');
      }
      if (carreraCol === -1) {
        errors.push('Falta la columna "Carrera"');
      }
      if (horaCol === -1) {
        errors.push('Falta la columna "Hora Entrada"');
      }

      // Check if there's data after headers
      const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
        row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      if (dataRows.length === 0) {
        warnings.push('El archivo no contiene datos de estudiantes');
      } else if (dataRows.length < 5) {
        warnings.push(`El archivo solo contiene ${dataRows.length} estudiante(s)`);
      }
    }

    const isValid = errors.length === 0;

    res.json({
      isValid: isValid,
      errors: errors,
      warnings: warnings,
      file: {
        id: file.id,
        name: file.name,
        size: file.size,
        modifiedTime: file.modifiedTime,
        headerRowIndex: headerRowIndex,
        totalRows: jsonData.length,
        dataRows: headerRowIndex !== -1 ? jsonData.length - headerRowIndex - 1 : 0
      }
    });

  } catch (error) {
    console.error('Error validating Drive file format:', error);

    if (error.code === 401) {
      return res.status(401).json({
        isValid: false,
        errors: ['Token de autenticación expirado. Por favor, actualiza la página e inicia sesión nuevamente.'],
        warnings: []
      });
    }

    if (error.code === 404) {
      return res.status(404).json({
        isValid: false,
        errors: ['Archivo no encontrado o acceso denegado'],
        warnings: []
      });
    }

    res.status(500).json({
      isValid: false,
      errors: ['Error interno del servidor al validar el archivo'],
      warnings: []
    });
  }
});

module.exports = router;
