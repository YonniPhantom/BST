# Instalación Limpia y Sistema de Logs - BST

## Instalación Limpia

### ¿Qué NO se incluye en el instalador?

La aplicación empaquetada **NO incluye**:
- ❌ Base de datos SQLite (`backend/data/app.db`)
- ❌ Archivo Excel de alumnos (`backend/data/alumnos.xlsx`)
- ❌ Carpeta `backend/data/` completa

### ¿Qué SÍ persiste después de instalar?

- ✅ **Sesión de usuario**: Los tokens de Google OAuth persisten por 30 días
- ✅ **localStorage**: Datos de sesión se mantienen en `%APPDATA%/BST`
- ✅ **Logs**: Se guardan en `%APPDATA%/BST/logs`

### Configuración Inicial

Después de instalar la aplicación:

#### 1. Iniciar Sesión
- Abre la aplicación
- Haz clic en "Iniciar sesión con Google"
- Autoriza el acceso a Google Drive
- La sesión permanecerá activa por 30 días

#### 2. Crear Base de Datos
La base de datos se crea automáticamente cuando:
- Registras el primer estudiante
- O manualmente: `POST http://localhost:3001/api/health`

**Verificar estado:**
```bash
GET http://localhost:3001/api/health
```

**Respuesta si NO existe:**
```json
{
  "error": "Database not found or not initialized",
  "message": "Would you like to create the database?",
  "action": "Use POST request to create database"
}
```

**Crear manualmente:**
```bash
POST http://localhost:3001/api/health
```

#### 3. Cargar Archivo Excel

**Opción A: Subir mediante API**
```bash
POST http://localhost:3001/api/health/upload-excel
Content-Type: multipart/form-data

# Campo: 'excel'
# Archivo: alumnos.xlsx
```

**Opción B: Colocar manualmente**
1. Coloca `alumnos.xlsx` en `backend/data/`
2. El archivo debe tener estas columnas:
   - NUM CONTROL o MATRICULA
   - NOMBRE COMPLETO o NOMBRE
   - CARRERA

**Verificar Excel:**
```bash
GET http://localhost:3001/api/health/check-excel
```

**Cargar datos a memoria:**
```bash
POST http://localhost:3001/api/students/load-excel
```

---

## Sistema de Logs

### Ubicación de Logs

**En Producción (App empaquetada):**
- Logs del backend: `%APPDATA%/BST/logs/backend-YYYY-MM-DD.log`
- Logs del frontend: Se envían al backend y se guardan en el mismo archivo

**En Desarrollo:**
- Logs del backend: `backend/logs/backend-YYYY-MM-DD.log`
- Logs del frontend: Se envían al backend

### Acceder a los Logs

#### Desde la Aplicación
1. Abre la aplicación BST
2. Ve al menú **Archivo → Abrir carpeta de logs**
3. Se abrirá el explorador de archivos en la carpeta de logs

#### Manualmente
1. Presiona `Win + R`
2. Escribe: `%APPDATA%\BST\logs`
3. Presiona Enter

#### Mediante API
```bash
GET http://localhost:3001/api/health/logs-path
```

**Respuesta:**
```json
{
  "logsDir": "C:\\Users\\Usuario\\AppData\\Roaming\\BST\\logs",
  "message": "Logs directory path"
}
```

### Formato de Logs

Cada línea de log tiene el formato:
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] mensaje
```

**Ejemplo:**
```
[2025-11-12 07:30:15] [INFO] 🚀 Starting BST Backend Server...
[2025-11-12 07:30:15] [INFO] 📍 Environment: production
[2025-11-12 07:30:16] [INFO] BST Backend server running on port 3001
[2025-11-12 07:30:20] [INFO] [FRONTEND] 📝 Frontend logger initialized
[2025-11-12 07:30:25] [ERROR] [FRONTEND] Error loading students: Network error
```

### Niveles de Log

- **INFO**: Información general
- **WARN**: Advertencias
- **ERROR**: Errores
- **DEBUG**: Información de depuración

### Rotación de Logs

- Los logs se crean por día: `backend-YYYY-MM-DD.log`
- Cada día se crea un nuevo archivo
- Los logs antiguos NO se borran automáticamente
- Puedes eliminar logs antiguos manualmente desde la carpeta

### Logs Capturados

**Backend:**
- Todos los `console.log()`, `console.error()`, `console.warn()`, etc.
- Errores no manejados
- Información de inicio del servidor
- Peticiones HTTP (si se configuran)

**Frontend:**
- Todos los `console.log()`, `console.error()`, `console.warn()`, etc.
- Errores no manejados (`window.onerror`)
- Promesas rechazadas no manejadas (`unhandledrejection`)
- Errores de React (si se configuran)

---

## Endpoints Importantes

### Base de Datos
- `GET /api/health` - Verificar estado de la base de datos
- `POST /api/health` - Crear/inicializar base de datos

### Excel
- `GET /api/health/check-excel` - Verificar archivo Excel
- `POST /api/health/upload-excel` - Subir archivo Excel
- `GET /api/health/backups` - Listar backups del Excel
- `POST /api/students/load-excel` - Cargar datos del Excel

### Logs
- `GET /api/health/logs-path` - Obtener ruta de la carpeta de logs
- `POST /api/logs/frontend` - Enviar logs del frontend (uso interno)

### Estudiantes
- `GET /api/students/search?q=<query>` - Buscar estudiantes
- `POST /api/students/register` - Registrar entrada de estudiante
- `GET /api/students/history` - Ver historial de registros
- `GET /api/students/today-registrations` - Ver registros de hoy

---

## Solución de Problemas

### No puedo ver los logs
1. Verifica que la aplicación esté corriendo
2. Ve a **Archivo → Abrir carpeta de logs**
3. Si la carpeta no existe, cierra y vuelve a abrir la aplicación

### Los logs no se están guardando
1. Verifica que tengas permisos de escritura en `%APPDATA%`
2. Revisa la consola de Electron para errores
3. Reinicia la aplicación

### La base de datos no existe después de instalar
Esto es **normal**. La base de datos NO se incluye en el instalador.
1. Verifica: `GET /api/health`
2. Crea: `POST /api/health`
3. O registra un estudiante y se creará automáticamente

### El archivo Excel no existe
Esto es **normal**. El archivo Excel NO se incluye en el instalador.
1. Sube el archivo: `POST /api/health/upload-excel`
2. O colócalo manualmente en `backend/data/alumnos.xlsx`

### La sesión persiste después de desinstalar
Esto es **intencional**. La sesión persiste por 30 días para comodidad del usuario.

Si quieres borrar la sesión:
1. Cierra sesión desde la aplicación
2. O elimina manualmente: `%APPDATA%\BST`

---

## Estructura de Archivos en Producción

```
%APPDATA%/BST/
├── logs/
│   ├── backend-2025-11-12.log
│   ├── backend-2025-11-13.log
│   └── ...
├── Local Storage/
│   └── (datos de sesión)
└── (otros archivos de Electron)

backend/data/  (NO incluido en instalador)
├── app.db  (se crea al usar la app)
└── alumnos.xlsx  (debe cargarse manualmente)
```

---

## Notas Importantes

- ⚠️ **Los logs pueden contener información sensible**. No los compartas públicamente.
- ⚠️ **Los logs crecen con el tiempo**. Elimina logs antiguos periódicamente.
- ✅ **La sesión persiste por 30 días** para evitar iniciar sesión constantemente.
- ✅ **La base de datos y Excel NO se incluyen** para garantizar instalación limpia.
- ✅ **Los logs se guardan automáticamente** sin necesidad de configuración.
