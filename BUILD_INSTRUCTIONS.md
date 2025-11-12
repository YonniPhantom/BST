# 🚀 Instrucciones de Construcción - BST

## Requisitos Previos
- Node.js 18 o superior
- npm
- Windows 10/11

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```powershell
# Backend
cd backend
npm install

# Frontend
cd ..\frontend
npm install

# Launcher
cd ..\launcher
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend` con:

```env
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google
JWT_SECRET=tu_secret_key_aqui
PORT=3001
```

## 🏃 Ejecutar en Modo Desarrollo

### Opción 1: Script automático (Recomendado)
```powershell
.\run-dev.ps1
```

### Opción 2: Manual

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run electron:dev
```

## 📦 Construir Instalador

### Opción 1: Script automático (Recomendado)
```powershell
.\build.ps1
```

### Opción 2: Manual

```powershell
# 1. Construir frontend
cd frontend
npm run build
npm run electron:build

# 2. Construir instalador
cd ..\launcher
npm run build:win
```

El instalador se generará en: `launcher\dist\`

## 🐛 Solución de Problemas

### Error: "mv no se reconoce como comando"
✅ **Ya corregido** - Los scripts ahora usan comandos compatibles con Windows

### Error: "Token '&&' no es válido"
✅ **Ya corregido** - Los scripts ahora usan `&&` de npm que funciona en PowerShell

### Error al sincronizar con Google Drive
✅ **Ya corregido** - Los buffers ahora se convierten a streams correctamente

### El backend no inicia
Verifica que:
1. El archivo `.env` existe y tiene las credenciales correctas
2. El puerto 3001 no está ocupado
3. Las dependencias están instaladas (`npm install` en la carpeta backend)

### El frontend no compila
Verifica que:
1. Las dependencias están instaladas (`npm install` en la carpeta frontend)
2. TypeScript está instalado correctamente
3. La carpeta `dist` tiene permisos de escritura

## 📝 Scripts Disponibles

### Frontend (`frontend/package.json`)
- `npm run dev` - Inicia Vite en modo desarrollo
- `npm run build` - Construye el frontend para producción
- `npm run electron:build` - Compila los archivos de Electron
- `npm run electron:dev` - Inicia la app en modo desarrollo
- `npm run electron:prod` - Construye y ejecuta la app en modo producción
- `npm run package` - Crea el paquete de la aplicación

### Launcher (`launcher/package.json`)
- `npm start` - Inicia Electron con el launcher
- `npm run build` - Construye el instalador
- `npm run build:win` - Construye el instalador para Windows

### Backend (`backend/package.json`)
- `npm start` - Inicia el servidor backend
- `npm run dev` - Inicia el servidor con nodemon (auto-reload)

## 🔄 Actualizar la Aplicación Instalada

Si ya tienes la app instalada y quieres probar los cambios sin reinstalar:

1. Construye el backend y frontend:
   ```powershell
   cd frontend
   npm run build
   npm run electron:build
   ```

2. Copia los archivos actualizados a la carpeta de instalación:
   - Backend: `C:\Program Files\BST\resources\backend\`
   - Frontend: `C:\Program Files\BST\resources\frontend\`

## 📚 Estructura del Proyecto

```
bstGood/
├── backend/              # Servidor Node.js + Express
├── frontend/             # React + Vite + Electron
├── launcher/             # Electron launcher y configuración de build
├── build.ps1             # Script de construcción automática
├── run-dev.ps1           # Script para ejecutar en desarrollo
├── BUILD_INSTRUCTIONS.md # Este archivo
└── LOGS_GUIDE.md         # Guía para encontrar y usar los logs
```

## 📋 Logs y Debugging

### Ver logs en producción

Los logs se guardan automáticamente en:
```
C:\Users\<TuUsuario>\AppData\Roaming\BST\logs\
```

**Acceso rápido:** Menú **Archivo** → **Abrir carpeta de logs**

### Ver logs en desarrollo

Presiona `F12` para abrir las herramientas de desarrollo y ver:
- Errores del frontend
- Peticiones HTTP
- Logs de la consola

Para más información, consulta [LOGS_GUIDE.md](LOGS_GUIDE.md)
