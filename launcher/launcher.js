const { app, BrowserWindow, ipcMain, session, shell, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');
const http = require('http');

let backendProcess = null;
let mainWindow = null;
let authWindow = null;

function startBackend() {
  const isDev = !app.isPackaged;
  
  const backendPath = isDev 
    ? path.join(__dirname, '..', 'backend', 'start.js')
    : path.join(process.resourcesPath, 'backend', 'start.js');

  const backendDir = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

  console.log('Iniciando backend desde:', backendPath);
  console.log('Directorio backend:', backendDir);

  // Pasar la ruta de userData al backend para logs y DB
  const userDataPath = app.getPath('userData');
  console.log('📁 User Data Path:', userDataPath);

  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    shell: true,
    cwd: backendDir,
    env: { 
      ...process.env, 
      NODE_ENV: isDev ? 'development' : 'production',
      USER_DATA_PATH: userDataPath
    }
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar backend:', err);
  });
}

async function createWindow() {
  const BACKEND_URL = 'http://localhost:3001'; // Ajusta al puerto de tu backend

  console.log('Esperando a que el backend esté listo...');
  
  try {
    await waitOn({
      resources: [BACKEND_URL],
      timeout: 30000,
      interval: 1000
    });
    console.log('Backend listo!');
  } catch (err) {
    console.error('Error esperando al backend:', err);
  }

  const isDev = !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '..', 'frontend', 'public', 'icon.png')
    : path.join(process.resourcesPath, 'frontend', 'icon.png');

  const preloadPath = isDev
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Biblioteca Software Tec',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      // Permitir navegación a URLs externas (Google OAuth)
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Configurar CSP para permitir recursos locales y API
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* https://accounts.google.com https://www.google.com https://drive.google.com https://www.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://ssl.gstatic.com https://www.gstatic.com;"
        ]
      }
    });
  });

  const frontendPath = isDev
    ? path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    : path.join(process.resourcesPath, 'frontend', 'index.html');

  console.log('Cargando frontend desde:', frontendPath);
  console.log('isDev:', isDev);
  console.log('process.resourcesPath:', process.resourcesPath);
  
  mainWindow.loadFile(frontendPath);

  // Manejar enlaces externos (Drive, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Permitir Drive en ventana externa, pero NO OAuth
    if (url.startsWith('https://drive.google.com')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Crear menú de la aplicación
  createMenu();
}

// Función para crear el menú de la aplicación
function createMenu() {
  const isDev = !app.isPackaged;
  
  // Determinar la ruta de los manuales
  const manualesDir = isDev
    ? path.join(__dirname, 'Manuales')
    : path.join(process.resourcesPath, 'launcher', 'Manuales');
  
  const manualUsuarioPath = path.join(manualesDir, 'ManualUsuario.pdf');
  const manualTecnicoPath = path.join(manualesDir, 'ManualTecnico.pdf');

  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir carpeta de logs',
          click: async () => {
            try {
              // Obtener la ruta de logs del backend
              const response = await fetch('http://localhost:3001/api/health/logs-path');
              const data = await response.json();
              
              if (data.logsDir) {
                // Abrir la carpeta en el explorador de archivos
                shell.openPath(data.logsDir);
              }
            } catch (error) {
              console.error('Error abriendo carpeta de logs:', error);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          role: 'quit'
        }
      ]
    },
    {
      label: 'Manuales',
      submenu: [
        {
          label: 'Abrir Manual de Usuario',
          click: async () => {
            try {
              console.log('Abriendo Manual de Usuario desde:', manualUsuarioPath);
              await shell.openPath(manualUsuarioPath);
            } catch (error) {
              console.error('Error abriendo Manual de Usuario:', error);
            }
          }
        },
        {
          label: 'Abrir Manual Técnico',
          click: async () => {
            try {
              console.log('Abriendo Manual Técnico desde:', manualTecnicoPath);
              await shell.openPath(manualTecnicoPath);
            } catch (error) {
              console.error('Error abriendo Manual Técnico:', error);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Función para manejar OAuth con servidor local temporal
function createAuthWindow(authUrl) {
  return new Promise((resolve, reject) => {
    let server = null;
    let serverClosed = false;

    // Crear servidor HTTP temporal en puerto aleatorio
    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      
      console.log('Callback received:', req.url);

      // Verificar si es el callback de Google
      if (url.pathname === '/oauth/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        // Enviar respuesta HTML al navegador
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        
        if (error) {
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Error de Autenticación</title>
              <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .error { color: #d32f2f; font-size: 48px; margin-bottom: 20px; }
                h1 { color: #333; margin: 0 0 10px 0; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error">✗</div>
                <h1>Error de Autenticación</h1>
                <p>Hubo un error al autenticar. Puedes cerrar esta ventana.</p>
              </div>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
          `);
          
          if (!serverClosed) {
            serverClosed = true;
            server.close();
            reject(new Error(error));
          }
        } else if (code) {
          console.log('✓ Authorization code received:', code.substring(0, 20) + '...');
          
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Autenticación Exitosa</title>
              <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .success { color: #4caf50; font-size: 48px; margin-bottom: 20px; }
                h1 { color: #333; margin: 0 0 10px 0; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">✓</div>
                <h1>¡Autenticación Exitosa!</h1>
                <p>Puedes cerrar esta ventana y volver a la aplicación.</p>
              </div>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
            </html>
          `);
          
          if (!serverClosed) {
            serverClosed = true;
            server.close();
            console.log('✓ Resolving with code, server closed');
            resolve({ code });
          }
        } else {
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Error</title>
            </head>
            <body>
              <h1>Error: No se recibió código de autorización</h1>
              <p>Puedes cerrar esta ventana.</p>
            </body>
            </html>
          `);
          
          if (!serverClosed) {
            serverClosed = true;
            server.close();
            reject(new Error('No authorization code received'));
          }
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    // Iniciar servidor en puerto fijo 8080
    const OAUTH_PORT = 8080;
    server.listen(OAUTH_PORT, 'localhost', () => {
      console.log(`OAuth callback server listening on port ${OAUTH_PORT}`);

      // Agregar state con el redirect_uri del servidor local
      const state = Buffer.from(JSON.stringify({
        redirectUri: `http://localhost:${OAUTH_PORT}/oauth/callback`
      })).toString('base64');
      
      // Agregar state a la URL de auth
      const separator = authUrl.includes('?') ? '&' : '?';
      const modifiedAuthUrl = `${authUrl}${separator}state=${encodeURIComponent(state)}`;

      console.log('Opening browser with URL:', modifiedAuthUrl);

      // Abrir navegador del sistema
      shell.openExternal(modifiedAuthUrl);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${OAUTH_PORT} is already in use`);
        reject(new Error(`Puerto ${OAUTH_PORT} ya está en uso. Cierra otras aplicaciones e intenta de nuevo.`));
      } else {
        reject(err);
      }
    });

    // Timeout de 5 minutos
    const timeout = setTimeout(() => {
      if (!serverClosed) {
        serverClosed = true;
        server.close();
        reject(new Error('OAuth timeout - no response received'));
      }
    }, 5 * 60 * 1000);

    // Limpiar timeout cuando se resuelva
    server.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// IPC handler para iniciar OAuth
ipcMain.handle('start-oauth', async (event, authUrl) => {
  try {
    console.log('Starting OAuth with URL:', authUrl);
    const result = await createAuthWindow(authUrl);
    return { success: true, data: result };
  } catch (error) {
    console.error('OAuth error:', error);
    return { success: false, error: error.message };
  }
});

// IPC handler para cerrar la aplicación
ipcMain.on('close-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});