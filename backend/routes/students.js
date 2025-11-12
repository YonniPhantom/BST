const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getDb, createDb } = require('../lib/db');
const { authenticateToken, getAuthorizedDriveClient } = require('../lib/auth');
const router = express.Router();
 
// POST /api/students/load-excel - Load Excel data to JSON
router.post('/load-excel', (req, res) => {
  console.log('=== CARGANDO EXCEL A JSON ===');
  
  try {
    // Path to Excel file
    const excelPath = path.join(__dirname, '../data/alumnos.xlsx');
    console.log('Ruta del Excel:', excelPath);
    
    // Verify file exists
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        error: 'Archivo Excel no encontrado'
      });
    }

    // Read Excel file
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return res.status(400).json({
        error: 'El archivo Excel está vacío'
      });
    }

    // Find header row
    let headerRowIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('control')) {
          headerRowIndex = i;
          headers = row.map(cell => String(cell || '').toLowerCase().trim());
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({
        error: 'No se encontraron encabezados válidos en el Excel'
      });
    }

    // Map columns
    const nombreCol = headers.findIndex(h => h.includes('nombre') || h.includes('completo'));
    const matriculaCol = headers.findIndex(h => h.includes('control') || h.includes('matricula') || h.includes('num'));
    const carreraCol = headers.findIndex(h => h.includes('carrera'));

    console.log('Headers encontrados:', headers);
    console.log('Columnas mapeadas:', { nombreCol, matriculaCol, carreraCol });

    if (nombreCol === -1 || matriculaCol === -1) {
      return res.status(400).json({
        error: 'No se encontraron columnas de nombre o matrícula'
      });
    }

    // Convert rows to structured objects
    const students = [];
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !Array.isArray(row)) continue;

      const nombre = String(row[nombreCol] || '').trim();
      const matricula = String(row[matriculaCol] || '').trim();
      const carrera = String(row[carreraCol] || '').trim();

      // Only add if has at least name or matricula
      if (nombre || matricula) {
        students.push({
          matricula,
          nombre,
          carrera,
          rowIndex: i // Save original index for future updates
        });
      }
    }

    console.log(`Excel cargado: ${students.length} estudiantes encontrados`);

    res.json({
      success: true,
      data: {
        students,
        headers: {
          original: jsonData[headerRowIndex],
          mapped: { nombreCol, matriculaCol, carreraCol }
        },
        totalRows: jsonData.length,
        studentsCount: students.length
      }
    });

  } catch (error) {
    console.error('Error cargando Excel:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/students/search - Search students
router.get('/search', (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
      return res.json({ students: [] });
    }

    // Path to Excel file
    const excelPath = path.join(__dirname, '../data/alumnos.xlsx');
    
    // Verify file exists
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        error: 'Archivo Excel no encontrado'
      });
    }

    // Verify read permissions
    try {
      fs.accessSync(excelPath, fs.constants.R_OK);
    } catch (accessError) {
      return res.status(403).json({
        error: 'No se puede acceder al archivo Excel'
      });
    }

    // Verify file is not empty
    const stats = fs.statSync(excelPath);
    if (stats.size === 0) {
      return res.status(400).json({
        error: 'El archivo Excel está vacío'
      });
    }

    // Read Excel file with multiple attempts
    let workbook = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Intento ${attempts + 1} de leer el archivo Excel para búsqueda...`);
        
        // Read file as buffer first
        const fileBuffer = fs.readFileSync(excelPath);
        
        // Create workbook from buffer
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        break;
        
      } catch (readError) {
        attempts++;
        console.error(`Error en intento ${attempts}:`, readError);
        
        if (attempts >= maxAttempts) {
          console.error('Error leyendo archivo Excel después de', maxAttempts, 'intentos:', readError);
          return res.status(500).json({
            error: 'Error al leer el archivo Excel. Asegúrate de que no esté abierto en otra aplicación.',
            details: readError.message
          });
        }
        
        // Wait a bit before next attempt
        setTimeout(() => {}, 100);
      }
    }
    
    // Verify workbook was created correctly
    if (!workbook) {
      return res.status(500).json({
        error: 'No se pudo crear el workbook del archivo Excel'
      });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return res.json({ students: [] });
    }

    // Find header row
    let headerRowIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('matricula') || rowStr.includes('control')) {
          headerRowIndex = i;
          headers = row.map(cell => String(cell || '').toLowerCase().trim());
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({
        error: 'No se encontraron encabezados válidos en el Excel'
      });
    }

    // Map columns with exact Excel names
    const nombreCol = headers.findIndex(h => 
      h.includes('nombre') || h.includes('completo')
    );
    const matriculaCol = headers.findIndex(h => 
      h.includes('control') || h.includes('matricula') || h.includes('num')
    );
    const carreraCol = headers.findIndex(h => h.includes('carrera'));
    
    console.log('Headers encontrados:', headers);
    console.log('Columnas mapeadas:', { nombreCol, matriculaCol, carreraCol });

    if (nombreCol === -1 && matriculaCol === -1) {
      return res.status(400).json({
        error: 'No se encontraron columnas de nombre o matrícula'
      });
    }

    // Search students matching the query
    const queryLower = query.toLowerCase().trim();
    const matchingStudents = [];

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !Array.isArray(row)) continue;

      const nombre = String(row[nombreCol] || '').trim();
      const matricula = String(row[matriculaCol] || '').trim();
      const carrera = String(row[carreraCol] || '').trim();

      // Search matches in name or matricula
      const nombreMatch = nombre.toLowerCase().includes(queryLower);
      const matriculaMatch = matricula.toLowerCase().includes(queryLower);

      if ((nombreMatch || matriculaMatch) && (nombre || matricula)) {
        matchingStudents.push({
          nombre,
          matricula,
          carrera,
          // Calculate relevance to sort results
          relevance: nombreMatch ? 
            (nombre.toLowerCase().startsWith(queryLower) ? 3 : 2) :
            (matricula.toLowerCase().startsWith(queryLower) ? 1 : 0.5)
        });
      }
    }

    // Sort by relevance and limit results
    const sortedStudents = matchingStudents
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)
      .map(({ relevance, ...student }) => student);

    res.json({ students: sortedStudents });

  } catch (error) {
    console.error('Error en búsqueda de estudiantes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/students/register - Register student
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { fileId, matricula, nombre, carrera } = req.body;

    if (!fileId || !matricula || !nombre || !carrera) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Get authorized Drive client
    const drive = getAuthorizedDriveClient(req.user.accessToken);

    // Download current file
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    // Convert to workbook
    const workbook = XLSX.read(response.data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    
    if (!workbook.Sheets[sheetName]) {
      return res.status(404).json({ error: "Hoja no encontrada" });
    }

    // Get current data
    let jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
      header: 1,
      defval: ''
    });

    // Detect header row
    let headerRowIndex = 0;
    let headerRow = [];
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i] || [];
      const rowText = row.map(cell => 
        cell ? cell.toString().trim().toUpperCase() : ''
      ).join(' ');
      
      const hasNombre = rowText.includes('NOMBRE');
      const hasControl = rowText.includes('CONTROL') || rowText.includes('NUM');
      const hasCarrera = rowText.includes('CARRERA');
      
      const matchCount = [hasNombre, hasControl, hasCarrera].filter(Boolean).length;
      
      if (matchCount >= 2) {
        headerRowIndex = i;
        headerRow = row;
        break;
      }
    }

    // Map columns based on headers
    const columnMapping = {};
    
    headerRow.forEach((header, index) => {
      const headerText = header ? header.toString().trim().toUpperCase() : '';
      
      if (headerText.includes('CONTROL') || (headerText.includes('NUM') && headerText.includes('DE'))) {
        columnMapping['matricula'] = index;
      } else if (headerText.includes('NOMBRE') && !headerText.includes('NUM')) {
        columnMapping['nombre'] = index;
      } else if (headerText.includes('CARRERA')) {
        columnMapping['carrera'] = index;
      } else if (headerText.includes('HORA')) {
        columnMapping['hora_entrada'] = index;
      }
    });

    // Verify we have necessary columns
    if (!columnMapping['matricula'] || !columnMapping['nombre'] || !columnMapping['carrera']) {
      return res.status(400).json({ 
        error: "No se encontraron las columnas necesarias en el Excel",
        headers: headerRow
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

    // Create new data row
    const newRowIndex = lastRowIndex + 1;
    const newRow = [];
    
    // Ensure array has enough rows
    while (jsonData.length <= newRowIndex) {
      jsonData.push([]);
    }

    // Fill new row with student data
    const maxColumns = Math.max(...jsonData.map(row => row.length));
    for (let col = 0; col < maxColumns; col++) {
      newRow[col] = '';
    }

    // Assign values to corresponding columns
    newRow[columnMapping['matricula']] = matricula;
    newRow[columnMapping['nombre']] = nombre;
    newRow[columnMapping['carrera']] = carrera;
    
    // Add current entry time if column exists
    if (columnMapping['hora_entrada'] !== undefined) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // Convert to Excel decimal format
      const [hours, minutes] = timeString.split(':').map(Number);
      const timeDecimal = (hours + minutes / 60) / 24;
      newRow[columnMapping['hora_entrada']] = timeDecimal;
    }

    // Assign new row
    jsonData[newRowIndex] = newRow;

    // Convert back to worksheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
    
    // Apply time format to time columns
    if (columnMapping['hora_entrada'] !== undefined) {
      const cellAddress = XLSX.utils.encode_cell({ r: newRowIndex, c: columnMapping['hora_entrada'] });
      
      if (newWorksheet[cellAddress]) {
        newWorksheet[cellAddress].z = 'h:mm';
        newWorksheet[cellAddress].t = 'n';
      }
    }
    
    workbook.Sheets[sheetName] = newWorksheet;

    // Convert to buffer
    const newBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    // Upload updated file
    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Buffer.from(newBuffer)
    };

    await drive.files.update({
      fileId: fileId,
      media: media
    });

    // Save to SQLite database as well
    try {
      console.log('=== GUARDANDO EN BASE DE DATOS ===');
      let db = getDb();
      if (!db) {
        console.log('Creando nueva base de datos...');
        db = createDb();
      }

      const horaEntrada = new Date().toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const fechaRegistro = new Date().toISOString().split('T')[0];

      console.log('Datos a guardar:', {
        matricula,
        nombre,
        carrera,
        horaEntrada,
        fechaRegistro,
        fileId
      });

      const insertStmt = db.prepare(`
        INSERT INTO student_registrations 
        (matricula, nombre, carrera, hora_entrada, fecha_registro, tipo_registro, file_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(matricula, nombre, carrera, horaEntrada, fechaRegistro, 'Manual', fileId);
      console.log('Registro guardado en BD con ID:', result.lastInsertRowid);
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      // Don't fail the request if database save fails, Excel update was successful
    }

    res.json({ 
      success: true, 
      message: "Estudiante registrado correctamente",
      student: {
        matricula,
        nombre,
        carrera,
        horaEntrada: new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      },
      rowIndex: newRowIndex,
      registeredAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al registrar estudiante:', error);
    res.status(500).json({
      error: "Error al registrar el estudiante en el archivo Excel",
      message: error.message
    });
  }
});

// GET /api/students/history - Get registration history with filters and pagination
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(404).json({
        error: "Database not found",
        message: "Database needs to be initialized"
      });
    }

    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      dateFrom = '', 
      dateTo = '', 
      tipoRegistro = '' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir query dinámicamente basado en filtros
    let whereConditions = [];
    let params = [];
    
    // Filtro de búsqueda (nombre, matrícula o carrera)
    if (search) {
      whereConditions.push('(nombre LIKE ? OR matricula LIKE ? OR carrera LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Filtro de fecha desde
    if (dateFrom) {
      whereConditions.push('fecha_registro >= ?');
      params.push(dateFrom);
    }
    
    // Filtro de fecha hasta
    if (dateTo) {
      whereConditions.push('fecha_registro <= ?');
      params.push(dateTo);
    }
    
    // Filtro de tipo de registro
    if (tipoRegistro) {
      whereConditions.push('tipo_registro = ?');
      params.push(tipoRegistro);
    }
    
    // Construir WHERE clause
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    console.log(`📅 Obteniendo historial de registros - Página: ${page}, Filtros:`, { search, dateFrom, dateTo, tipoRegistro });
    
    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total FROM student_registrations ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.get(...params);
    
    // Obtener registros paginados
    const query = `
      SELECT * FROM student_registrations 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const stmt = db.prepare(query);
    const registrations = stmt.all(...params, parseInt(limit), offset);
    
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      registrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error getting registration history:', error);
    res.status(500).json({
      error: 'Error retrieving registration history',
      message: error.message
    });
  }
});

// GET /api/students/today-registrations - Get today's registrations
router.get('/today-registrations', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(404).json({
        error: "Database not found",
        message: "Database needs to be initialized"
      });
    }

    const today = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
      SELECT * FROM student_registrations 
      WHERE fecha_registro = ?
      ORDER BY created_at DESC
    `);
    
    const registrations = stmt.all(today);

    res.json({
      success: true,
      date: today,
      registrations,
      count: registrations.length
    });

  } catch (error) {
    console.error('Error getting today registrations:', error);
    res.status(500).json({
      error: 'Error retrieving today registrations',
      message: error.message
    });
  }
});

// GET /api/students/test - Test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Students routes working correctly',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/students/search',
      'GET /api/students/history', 
      'GET /api/students/today-registrations',
      'GET /api/students/test',
      'POST /api/students/load-excel',
      'POST /api/students/register',
      'POST /api/students/sync-to-excel',
      'POST /api/students/save-registration'
    ]
  });
});

// POST /api/students/sync-to-excel - Sync students data to Excel file
router.post('/sync-to-excel', (req, res) => {
  console.log('=== SINCRONIZANDO ESTUDIANTES AL EXCEL ===');
  console.log('📥 Request body:', req.body);
  
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({
        error: 'Se requiere un array de estudiantes'
      });
    }

    // Path to Excel file
    const excelPath = path.join(__dirname, '../data/alumnos.xlsx');
    console.log('📁 Ruta del Excel:', excelPath);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        error: 'Archivo Excel no encontrado',
        path: excelPath
      });
    }

    // Leer el archivo Excel existente
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    // Preparar los datos para el Excel
    // Estructura: [NOMBRE, NUM CONTROL, PRESTAMO, CARRERA, CORREO, TELEFONO, HORA]
    const headers = ['NOMBRE', 'NUM DE CONTROL', 'PRÉSTAMO', 'CARRERA', 'CORREO', 'TELÉFONO', 'HORA DE ENTRADA'];
    const excelData = [headers];
    
    // Agregar cada estudiante
    students.forEach(student => {
      const row = [
        student.nombre || '',
        student.matricula || '',
        student.prestamo || '',
        student.carrera || '',
        student.correo || '',
        student.telefono || '',
        student.horaEntrada || new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      ];
      excelData.push(row);
    });

    // Crear nueva worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    // Reemplazar la hoja en el workbook
    workbook.Sheets[sheetName] = worksheet;
    
    // Crear backup del archivo original
    const backupPath = `${excelPath}.backup-${Date.now()}`;
    fs.copyFileSync(excelPath, backupPath);
    console.log('💾 Backup creado:', backupPath);
    
    // Escribir el archivo actualizado
    XLSX.writeFile(workbook, excelPath);
    
    console.log('✅ Excel actualizado exitosamente');
    console.log(`📊 ${students.length} estudiantes sincronizados`);
    
    res.json({
      success: true,
      message: 'Estudiantes sincronizados exitosamente',
      studentsCount: students.length,
      backupPath: backupPath,
      excelPath: excelPath
    });

  } catch (error) {
    console.error('❌ Error sincronizando estudiantes al Excel:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/students/save-registration - Save student registration to database
router.post('/save-registration', (req, res) => {
  console.log('💾 Guardando registro en base de datos...');
  console.log('📥 Datos recibidos:', req.body);
  
  try {
    const { matricula, nombre, carrera, hora_entrada, fecha_registro, tipo_registro, file_id } = req.body;
    
    // Validar campos requeridos
    if (!matricula || !nombre || !carrera || !hora_entrada || !fecha_registro) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        required: ['matricula', 'nombre', 'carrera', 'hora_entrada', 'fecha_registro']
      });
    }

    // Obtener o crear la base de datos
    let db = getDb();
    if (!db) {
      console.log('📊 Base de datos no existe, creándola...');
      db = createDb();
    }

    // Preparar la consulta de inserción
    const insertStmt = db.prepare(`
      INSERT INTO student_registrations 
      (matricula, nombre, carrera, hora_entrada, fecha_registro, tipo_registro, file_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Ejecutar la inserción
    const result = insertStmt.run(
      matricula.trim(),
      nombre.trim(), 
      carrera.trim(),
      hora_entrada,
      fecha_registro,
      tipo_registro || 'Manual',
      file_id || null
    );

    console.log('✅ Registro guardado en BD con ID:', result.lastInsertRowid);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Registro guardado exitosamente en la base de datos',
      data: {
        matricula,
        nombre,
        carrera,
        hora_entrada,
        fecha_registro,
        tipo_registro: tipo_registro || 'Manual',
        file_id
      }
    });

  } catch (error) {
    console.error('❌ Error guardando registro en BD:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;
