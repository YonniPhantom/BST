# Instalación Limpia - BST (Biblioteca Software Tec)

## ¿Qué significa "Instalación Limpia"?

La aplicación ahora está configurada para **NO guardar ningún dato persistente** que sobreviva a la desinstalación. Esto significa:

- ✅ **Base de datos SQLite**: Se guarda en `%APPDATA%/BST` y se borra al desinstalar
- ✅ **Tokens de autenticación**: Se limpian automáticamente al expirar o cerrar sesión
- ✅ **Archivo Excel de alumnos**: NO se incluye en el instalador, debe cargarse manualmente
- ✅ **localStorage**: Se limpia completamente al cerrar sesión o si el token expira

## Configuración Inicial Después de Instalar

Después de instalar la aplicación por primera vez, debes realizar estos pasos:

### 1. Iniciar Sesión con Google

Al abrir la aplicación, inicia sesión con tu cuenta de Google que tiene acceso a Google Drive.

### 2. Crear la Base de Datos

La base de datos se crea automáticamente cuando:
- Haces el primer registro de un estudiante
- O puedes crearla manualmente llamando al endpoint: `POST http://localhost:3001/api/health`

**Verificar estado de la base de datos:**
```bash
GET http://localhost:3001/api/health
```

**Crear base de datos manualmente:**
```bash
POST http://localhost:3001/api/health
```

### 3. Cargar el Archivo Excel de Alumnos

Tienes dos opciones para cargar el archivo Excel:

#### Opción A: Subir archivo Excel mediante API
```bash
POST http://localhost:3001/api/health/upload-excel
Content-Type: multipart/form-data

# Enviar archivo con el campo 'excel'
```

#### Opción B: Colocar archivo manualmente
1. Coloca el archivo `alumnos.xlsx` en la carpeta `backend/data/`
2. El archivo debe tener las siguientes columnas:
   - **NUM CONTROL** o **MATRICULA**
   - **NOMBRE COMPLETO** o **NOMBRE**
   - **CARRERA**

**Verificar que el Excel se cargó correctamente:**
```bash
GET http://localhost:3001/api/health/check-excel
```

**Cargar datos del Excel a memoria:**
```bash
POST http://localhost:3001/api/students/load-excel
```

## Endpoints Importantes

### Base de Datos

- `GET /api/health` - Verificar estado de la base de datos
- `POST /api/health` - Crear/inicializar base de datos
- `GET /api/health/test` - Verificar que el servidor funciona

### Archivo Excel

- `GET /api/health/check-excel` - Verificar que el archivo Excel existe y es válido
- `POST /api/health/upload-excel` - Subir archivo Excel de alumnos
- `GET /api/health/backups` - Listar backups del archivo Excel
- `POST /api/students/load-excel` - Cargar datos del Excel a memoria

### Estudiantes

- `GET /api/students/search?q=<query>` - Buscar estudiantes
- `POST /api/students/register` - Registrar entrada de estudiante
- `GET /api/students/history` - Ver historial de registros
- `GET /api/students/today-registrations` - Ver registros de hoy

## Ubicación de los Datos

### En Desarrollo
- **Base de datos**: `backend/data/dev.db`
- **Archivo Excel**: `backend/data/alumnos.xlsx`

### En Producción (Aplicación Empaquetada)
- **Base de datos**: `%APPDATA%/BST/app.db` (se borra al desinstalar)
- **Archivo Excel**: Debe cargarse manualmente, no se incluye en el instalador
- **localStorage**: `%APPDATA%/BST/Local Storage` (se borra al desinstalar)

## Flujo de Trabajo Recomendado

1. **Primera instalación**:
   - Instalar la aplicación
   - Iniciar sesión con Google
   - Crear base de datos (automático al primer registro)
   - Cargar archivo Excel de alumnos

2. **Uso diario**:
   - Abrir la aplicación (sesión persiste por 30 días)
   - Registrar estudiantes
   - Ver historial

3. **Desinstalación**:
   - Desinstalar la aplicación
   - Todos los datos se borran automáticamente
   - En la próxima instalación, empezar desde cero

## Notas Importantes

- ⚠️ **Los tokens de Google expiran después de 30 días**. Después de ese tiempo, deberás iniciar sesión nuevamente.
- ⚠️ **El archivo Excel NO se incluye en el instalador** por razones de seguridad y privacidad.
- ⚠️ **La base de datos se borra al desinstalar** para garantizar una instalación limpia.
- ✅ **Los backups del Excel se crean automáticamente** cada vez que subes un nuevo archivo.

## Solución de Problemas

### La sesión persiste después de desinstalar
Esto ya no debería ocurrir. Si ocurre:
1. Elimina manualmente la carpeta `%APPDATA%/BST`
2. Reinstala la aplicación

### No puedo buscar estudiantes
1. Verifica que el archivo Excel esté cargado: `GET /api/health/check-excel`
2. Si no está, cárgalo usando `POST /api/health/upload-excel`

### La base de datos no existe
1. Verifica el estado: `GET /api/health`
2. Créala manualmente: `POST /api/health`
3. O simplemente registra un estudiante y se creará automáticamente
