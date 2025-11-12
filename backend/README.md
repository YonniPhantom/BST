# BST Backend - Express Server

Este es el backend de Express para la aplicación BST (Biblioteca Software Tec), migrado desde las rutas API de Next.js.

## Características

- **Autenticación Google OAuth 2.0** con JWT
- **API de Google Drive** para manejo de archivos Excel
- **Base de datos SQLite** para registros locales
- **Manejo de archivos Excel** con XLSX
- **CORS configurado** para frontend
- **Middleware de autenticación** JWT

## Estructura del Proyecto

```
backend/
├── index.js              # Servidor principal Express
├── package.json          # Dependencias del backend
├── .env.example          # Variables de entorno de ejemplo
├── lib/
│   ├── db.js             # Utilidades de base de datos SQLite
│   └── auth.js           # Autenticación y JWT
└── routes/
    ├── auth.js           # Rutas de autenticación OAuth
    ├── health.js         # Rutas de salud y estado
    ├── students.js       # Rutas de estudiantes
    └── drive.js          # Rutas de Google Drive
```

## Instalación

1. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` con tus credenciales:
   ```env
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=tu_google_client_id
   GOOGLE_CLIENT_SECRET=tu_google_client_secret
   JWT_SECRET=tu_jwt_secret_seguro
   DB_PATH=../data/app.db
   ```

3. **Iniciar el servidor:**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm start
   ```

## Endpoints API

### Autenticación (`/api/auth`)
- `GET /signin` - Obtener URL de autenticación Google
- `POST /callback/google` - Callback de OAuth Google
- `POST /refresh` - Refrescar token JWT
- `GET /session` - Obtener información de sesión
- `POST /signout` - Cerrar sesión
- `GET /providers` - Obtener proveedores disponibles

### Salud (`/api/health`)
- `GET /` - Verificar estado de la base de datos
- `POST /` - Crear/inicializar base de datos
- `GET /check-excel` - Verificar archivo Excel local
- `POST /upload-excel` - Subir archivo Excel

### Estudiantes (`/api/students`)
- `POST /load-excel` - Cargar datos del Excel a JSON
- `GET /search?q=query` - Buscar estudiantes
- `POST /register` - Registrar estudiante (requiere auth)
- `GET /history` - Historial de registros
- `GET /today-registrations` - Registros de hoy

### Google Drive (`/api/drive`)
- `GET /list` - Listar archivos Excel en Drive (requiere auth)
- `GET /content?fileId=id` - Obtener contenido de archivo (requiere auth)
- `POST /sync` - Sincronizar con Drive (requiere auth)
- `POST /add-row` - Agregar fila a Excel en Drive (requiere auth)
- `POST /update` - Actualizar archivo en Drive (requiere auth)
- `POST /validate` - Validar acceso a archivo (requiere auth)

## Autenticación

El backend usa JWT para autenticación. Para endpoints protegidos, incluye el token en el header:

```javascript
Authorization: Bearer <jwt_token>
```

## Flujo de Autenticación

1. **Frontend** llama a `GET /api/auth/signin`
2. **Backend** devuelve URL de Google OAuth
3. **Usuario** se autentica en Google
4. **Frontend** envía código a `POST /api/auth/callback/google`
5. **Backend** intercambia código por tokens y devuelve JWT
6. **Frontend** usa JWT para llamadas autenticadas

## Base de Datos

El backend usa SQLite con las siguientes tablas:

### `users`
- `id` - ID único
- `username` - Nombre de usuario
- `password` - Contraseña

### `student_registrations`
- `id` - ID único
- `matricula` - Matrícula del estudiante
- `nombre` - Nombre completo
- `carrera` - Carrera
- `hora_entrada` - Hora de entrada
- `fecha_registro` - Fecha de registro
- `tipo_registro` - Tipo (Manual/Automático)
- `file_id` - ID del archivo de Google Drive
- `created_at` - Timestamp de creación

## Integración con Electron

Para usar este backend en una aplicación Electron empaquetada:

1. **Incluir en el build de Electron:**
   ```json
   {
     "files": [
       "backend/**/*",
       "data/**/*"
     ]
   }
   ```

2. **Iniciar servidor en main.ts:**
   ```typescript
   const { spawn } = require('child_process');
   const path = require('path');
   
   // Iniciar servidor backend
   const serverPath = path.join(__dirname, '../backend/index.js');
   const serverProcess = spawn('node', [serverPath], {
     cwd: path.dirname(serverPath)
   });
   ```

## Desarrollo

### Estructura de Respuestas

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "data": {},
  "message": "Mensaje descriptivo"
}
```

Para errores:
```json
{
  "error": "Descripción del error",
  "message": "Detalles adicionales"
}
```

### Logging

El servidor incluye logging detallado para debugging:
- Operaciones de base de datos
- Llamadas a Google Drive API
- Errores de autenticación
- Procesamiento de archivos Excel

## Troubleshooting

### Error: "Database not found"
```bash
# Crear base de datos
curl -X POST http://localhost:3001/api/health
```

### Error: "Authentication expired"
```bash
# Refrescar token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "tu_jwt_token"}'
```

### Error: "Excel file not found"
- Verificar que existe `../data/alumnos.xlsx`
- Usar endpoint `/api/health/upload-excel` para subir archivo

## Licencia

Este proyecto es parte del sistema BST desarrollado por YonniPhantom.
