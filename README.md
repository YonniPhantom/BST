# 📚 Biblioteca Software Tec (BST)

Sistema de gestión de biblioteca para el Tecnológico, desarrollado como aplicación de escritorio con Electron, React y Node.js.

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Build y Distribución](#-build-y-distribución)
- [Autenticación OAuth](#-autenticación-oauth)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Troubleshooting](#-troubleshooting)
- [Contribuir](#-contribuir)

---

## 🎯 Descripción

BST es una aplicación de escritorio para Windows que permite gestionar el préstamo de software a estudiantes del Tecnológico. La aplicación se integra con Google Drive para almacenar archivos y utiliza una base de datos SQLite local para el registro de transacciones.

### Funcionalidades Principales

- ✅ Autenticación con Google OAuth 2.0
- ✅ Gestión de estudiantes desde archivo Excel
- ✅ Registro de préstamos de software
- ✅ Integración con Google Drive
- ✅ Detección de dispositivos USB
- ✅ Interfaz moderna y responsive
- ✅ Base de datos local SQLite

---

## ✨ Características

### Autenticación
- Login con cuenta de Google
- Permisos de Google Drive
- Sesión persistente con JWT
- Refresh tokens automático

### Gestión de Estudiantes
- Importación desde Excel
- Búsqueda rápida por matrícula
- Validación de datos
- Historial de préstamos

### Préstamos de Software
- Registro de préstamos
- Control de devoluciones
- Historial completo
- Reportes y estadísticas

### Integración con Drive
- Subida de archivos
- Descarga de software
- Gestión de carpetas
- Sincronización automática

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│         Electron (Launcher)             │
│  ┌───────────────────────────────────┐  │
│  │     Frontend (React + Vite)       │  │
│  │  - UI/UX                          │  │
│  │  - Estado global (Context API)   │  │
│  │  - Routing (React Router)        │  │
│  └───────────────────────────────────┘  │
│                   ↕                      │
│  ┌───────────────────────────────────┐  │
│  │     Backend (Express.js)          │  │
│  │  - API REST                       │  │
│  │  - Autenticación OAuth            │  │
│  │  - Base de datos SQLite           │  │
│  │  - Integración Google Drive       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Componentes

1. **Launcher (Electron)**
   - Empaqueta frontend y backend
   - Gestiona ventanas nativas
   - Maneja OAuth con servidor local
   - IPC para comunicación segura

2. **Frontend (React)**
   - SPA con React Router
   - TailwindCSS para estilos
   - Context API para estado
   - Axios para peticiones HTTP

3. **Backend (Express)**
   - API RESTful
   - SQLite para persistencia
   - Google APIs para Drive
   - JWT para autenticación

---

## 📦 Requisitos Previos

### Software Necesario

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**
- **Windows 10/11** (para desarrollo en Windows)

### Cuentas y Credenciales

- Cuenta de Google Cloud Console
- Credenciales OAuth 2.0 configuradas
- Google Drive API habilitada

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd bstGood
```

### 2. Instalar Dependencias

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

#### Launcher
```bash
cd ../launcher
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend`:

```env
# Puerto del servidor
PORT=3001

# JWT Secret (genera uno seguro)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui

# Google OAuth Credentials
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# Entorno
NODE_ENV=development
```

---

## ⚙️ Configuración

### Configurar Google Cloud Console

#### 1. Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Google Drive API
   - Google OAuth2 API

#### 2. Crear Credenciales OAuth 2.0

1. Ve a **APIs y servicios** → **Credenciales**
2. Clic en **Crear credenciales** → **ID de cliente de OAuth 2.0**
3. Tipo de aplicación: **Aplicación de escritorio**
4. Nombre: `BST Desktop App`

#### 3. Configurar URIs de Redirección

Agrega las siguientes URIs autorizadas:

```
http://localhost:3001/api/auth/callback/google
```

#### 4. Descargar Credenciales

1. Descarga el archivo JSON de credenciales
2. Copia `client_id` y `client_secret` al archivo `.env`

### Configurar Base de Datos

La base de datos SQLite se crea automáticamente en la primera ejecución:

```
data/
  └── bst.db
```

### Configurar Archivo Excel de Alumnos

Coloca el archivo Excel en:

```
data/
  └── alumnos.xlsx
```

Formato requerido:

| Matrícula | Nombre | Apellido | Carrera | Semestre |
|-----------|--------|----------|---------|----------|
| A01234567 | Juan   | Pérez    | ISC     | 5        |

---

## 💻 Desarrollo

### Modo Desarrollo

#### Opción 1: Ejecutar Todo Junto (Recomendado)

```bash
# Desde la raíz del proyecto
cd launcher
npm start
```

Esto iniciará:
- Backend en `http://localhost:3001`
- Frontend en `http://localhost:5173`
- Aplicación Electron

#### Opción 2: Ejecutar por Separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Electron:**
```bash
cd launcher
npm start
```

### Scripts Disponibles

#### Backend
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con nodemon
npm test           # Ejecutar tests
```

#### Frontend
```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run preview    # Preview del build
npm run lint       # Linter
```

#### Launcher
```bash
npm start          # Ejecutar en desarrollo
npm run build:win  # Build para Windows
npm run build:mac  # Build para macOS
npm run build:linux # Build para Linux
```

---

## 📦 Build y Distribución

### Build Completo

#### 1. Build del Frontend

```bash
cd frontend
npm run build
```

Esto genera la carpeta `frontend/dist/` con los archivos estáticos.

#### 2. Build del Launcher (Aplicación Completa)

```bash
cd launcher
npm run build:win
```

Esto genera:
- `launcher/dist/BST Setup 1.0.0.exe` - Instalador
- `launcher/dist/BST 1.0.0.exe` - Versión portable
- `launcher/dist/win-unpacked/` - Versión desempaquetada

### Distribución

Los archivos generados están listos para distribuir:

**Instalador (Recomendado):**
```
launcher/dist/BST Setup 1.0.0.exe
```

**Portable:**
```
launcher/dist/BST 1.0.0.exe
```

### Script de Build Automatizado

Usa el script PowerShell incluido:

```powershell
.\rebuild.ps1
```

Este script:
1. Limpia builds anteriores
2. Construye el frontend
3. Construye el launcher
4. Muestra la ubicación de los archivos

---

## 🔐 Autenticación OAuth

### Flujo de Autenticación

```
1. Usuario → Clic en "Iniciar sesión con Google"
2. Launcher → Crea servidor HTTP local (localhost:8080)
3. Launcher → Abre navegador con URL de Google OAuth
4. Usuario → Completa autenticación en Google
5. Google → Redirige a backend (localhost:3001/api/auth/callback/google)
6. Backend → Detecta Electron y redirige a servidor local (localhost:8080)
7. Servidor local → Captura código de autorización
8. Frontend → Intercambia código por tokens (POST /api/auth/exchange-code)
9. Backend → Obtiene tokens de Google y genera JWT
10. Frontend → Guarda JWT y datos de usuario
11. Usuario → Autenticado ✓
```

### Componentes del Sistema OAuth

#### 1. Servidor Local (launcher.js)

```javascript
// Crea servidor HTTP temporal en puerto 8080
const server = http.createServer((req, res) => {
  // Captura el código de autorización
  const code = url.searchParams.get('code');
  // Muestra página de éxito
  // Cierra servidor y resuelve promesa
});
```

#### 2. Preload Script (preload.js)

```javascript
// Expone API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  startOAuth: (authUrl) => ipcRenderer.invoke('start-oauth', authUrl),
  closeApp: () => ipcRenderer.send('close-app'),
  isElectron: true
});
```

#### 3. Backend (routes/auth.js)

**GET /api/auth/google/url**
- Genera URL de autenticación de Google
- Incluye scopes necesarios

**GET /api/auth/callback/google**
- Recibe redirección de Google
- Detecta si viene de Electron (state parameter)
- Redirige al servidor local de Electron

**POST /api/auth/exchange-code**
- Recibe código de autorización
- Intercambia código por tokens con Google
- Obtiene información del usuario
- Genera JWT
- Devuelve token y datos de usuario

#### 4. Frontend (AuthContext.tsx)

```javascript
const signIn = async () => {
  // 1. Obtener URL de auth del backend
  const { authUrl } = await fetch('/api/auth/google/url');
  
  // 2. Iniciar flujo OAuth en Electron
  const result = await window.electronAPI.startOAuth(authUrl);
  
  // 3. Intercambiar código por tokens
  const { token, user } = await fetch('/api/auth/exchange-code', {
    method: 'POST',
    body: JSON.stringify({ code: result.data.code })
  });
  
  // 4. Guardar usuario
  setUser(user);
  localStorage.setItem('auth_user', JSON.stringify(user));
};
```

### Seguridad

- ✅ Servidor local solo acepta conexiones de localhost
- ✅ Servidor se cierra automáticamente después del callback
- ✅ Timeout de 5 minutos para evitar servidores colgados
- ✅ JWT con expiración
- ✅ Refresh tokens para renovar sesión
- ✅ Context isolation en Electron
- ✅ No se exponen credenciales al frontend

---

## 📁 Estructura del Proyecto

```
bstGood/
├── backend/                    # Servidor Express
│   ├── lib/                   # Librerías y utilidades
│   │   └── auth.js           # Funciones de autenticación
│   ├── routes/               # Rutas de la API
│   │   ├── auth.js          # Rutas de autenticación
│   │   ├── health.js        # Health checks
│   │   ├── students.js      # Gestión de estudiantes
│   │   ├── drive.js         # Integración con Drive
│   │   └── usb-devices.js   # Detección de USB
│   ├── index.js             # Punto de entrada
│   ├── start.js             # Script de inicio
│   ├── package.json
│   └── .env                 # Variables de entorno (no versionado)
│
├── frontend/                  # Aplicación React
│   ├── public/               # Archivos estáticos
│   │   └── icon.png         # Icono de la app
│   ├── src/
│   │   ├── api/             # Clientes de API
│   │   │   └── auth.ts      # API de autenticación
│   │   ├── components/      # Componentes React
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── contexts/        # Context API
│   │   │   └── AuthContext.tsx
│   │   ├── Pages/           # Páginas/Vistas
│   │   │   ├── Home.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── ...
│   │   ├── App.tsx          # Componente principal
│   │   ├── main.tsx         # Punto de entrada
│   │   ├── electron.d.ts    # Tipos de Electron
│   │   └── index.css        # Estilos globales
│   ├── dist/                # Build de producción
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── launcher/                  # Aplicación Electron
│   ├── dist/                 # Builds generados
│   │   ├── win-unpacked/    # Versión desempaquetada
│   │   ├── BST Setup.exe    # Instalador
│   │   └── BST.exe          # Portable
│   ├── launcher.js          # Main process
│   ├── preload.js           # Preload script
│   └── package.json
│
├── data/                      # Datos de la aplicación
│   ├── bst.db               # Base de datos SQLite
│   └── alumnos.xlsx         # Archivo de estudiantes
│
├── docs/                      # Documentación
│   ├── OAUTH_FIX.md
│   ├── OAUTH_NUEVO_METODO.md
│   └── CAMBIOS_OAUTH.md
│
├── rebuild.ps1               # Script de build
└── README.md                 # Este archivo
```

---

## 🛠️ Tecnologías Utilizadas

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Build tool |
| React Router | 6.x | Enrutamiento |
| TailwindCSS | 3.x | Estilos |
| Axios | 1.x | HTTP client |
| SweetAlert2 | 11.x | Modales |
| Lucide React | - | Iconos |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18.x | Runtime |
| Express | 4.x | Framework web |
| SQLite3 | 5.x | Base de datos |
| Google APIs | - | Integración Drive |
| JWT | 9.x | Autenticación |
| CORS | 2.x | Cross-origin |
| dotenv | 16.x | Variables de entorno |

### Electron

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Electron | 28.x | Framework desktop |
| Electron Builder | 24.x | Empaquetado |
| wait-on | 7.x | Esperar servicios |

---

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Error: "Endpoint not found" al hacer login

**Causa:** El backend no tiene el endpoint POST registrado.

**Solución:**
```bash
# Reconstruir completamente
cd frontend
npm run build

cd ../launcher
npm run build:win
```

#### 2. Error: "redirect_uri_mismatch"

**Causa:** La URI de redirección no está configurada en Google Cloud Console.

**Solución:**
1. Ve a Google Cloud Console
2. Agrega `http://localhost:3001/api/auth/callback/google`
3. Guarda los cambios
4. Espera 5 minutos para que se propague

#### 3. La ventana OAuth se cierra inmediatamente

**Causa:** Problema con el servidor local de OAuth.

**Solución:**
- Verifica que el puerto 8080 no esté en uso
- Revisa los logs en la consola (F12)
- Asegúrate de tener la última versión del código

#### 4. Error: "EADDRINUSE" (Puerto en uso)

**Causa:** El puerto 8080 o 3001 ya está en uso.

**Solución:**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# O reinicia la aplicación
```

#### 5. Base de datos no se crea

**Causa:** Permisos insuficientes o carpeta `data/` no existe.

**Solución:**
```bash
# Crear carpeta manualmente
mkdir data

# Ejecutar la app, se creará automáticamente
```

#### 6. Excel no se lee correctamente

**Causa:** Formato incorrecto del archivo Excel.

**Solución:**
- Verifica que tenga las columnas: Matrícula, Nombre, Apellido, Carrera, Semestre
- Guarda como `.xlsx` (no `.xls`)
- Coloca en `data/alumnos.xlsx`

#### 7. Error al construir el launcher

**Causa:** Aplicación BST.exe está corriendo.

**Solución:**
```bash
# Cerrar todas las instancias
taskkill /F /IM BST.exe

# Luego reconstruir
npm run build:win
```

### Logs y Debugging

#### Ver logs en producción

Los logs del backend se guardan automáticamente en:
```
C:\Users\<TuUsuario>\AppData\Roaming\BST\logs\
```

**Acceso rápido desde la app:**
1. Abre BST
2. Menú **Archivo** → **Abrir carpeta de logs**

**Scripts de utilidad:**
```powershell
# Abrir carpeta de logs
.\open-logs.ps1

# Ver logs en tiempo real (como tail -f)
.\watch-logs.ps1
```

#### Ver logs del frontend

```
Presiona F12 → Console
```

#### Ver logs en desarrollo

```bash
cd launcher
npm start
# Los logs aparecen en la terminal
```

#### Tipos de logs generados

- `backend-YYYY-MM-DD....log` - Todos los logs del backend
- `backend-error-YYYY-MM-DD....log` - Solo errores críticos

Para más información, consulta [LOGS_GUIDE.md](LOGS_GUIDE.md)

---

## 🤝 Contribuir

### Proceso de Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código

#### JavaScript/TypeScript
- Usar ESLint
- Prettier para formateo
- Nombres descriptivos
- Comentarios en funciones complejas

#### Git Commits
```
feat: Agregar nueva funcionalidad
fix: Corregir bug
docs: Actualizar documentación
style: Cambios de formato
refactor: Refactorización de código
test: Agregar tests
chore: Tareas de mantenimiento
```

### Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## 📄 Licencia

Este proyecto es privado y propiedad del Tecnológico.

---

## 👥 Autores

- **YonniPhantom** - Desarrollo principal

---

## 📞 Soporte

Para soporte o preguntas:
- Abre un issue en el repositorio
- Contacta al equipo de desarrollo

---

## 🗺️ Roadmap

### Versión 1.1
- [ ] Reportes en PDF
- [ ] Dashboard con estadísticas
- [ ] Notificaciones por email
- [ ] Modo offline

### Versión 1.2
- [ ] Multi-usuario
- [ ] Roles y permisos
- [ ] Historial de cambios
- [ ] Backup automático

### Versión 2.0
- [ ] Versión web
- [ ] App móvil
- [ ] Integración con sistemas del Tec
- [ ] API pública

---

## 📚 Recursos Adicionales

### Documentación
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

### Tutoriales
- `docs/OAUTH_NUEVO_METODO.md` - Guía detallada del sistema OAuth
- `docs/OAUTH_FIX.md` - Solución de problemas OAuth
- `docs/CAMBIOS_OAUTH.md` - Changelog del sistema OAuth

---

## ⚡ Quick Start

```bash
# 1. Clonar e instalar
git clone <repo>
cd bstGood
npm run install-all  # Si existe el script

# 2. Configurar .env
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# 3. Ejecutar en desarrollo
cd launcher
npm start

# 4. Build para producción
.\rebuild.ps1
```

---

**¡Gracias por usar BST! 📚✨**
