import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import isDev from 'electron-is-dev';
import * as path from 'path';

async function createWindow() {
    const win = new BrowserWindow({
        width: 1300,
        height: 900,
        title: 'Biblioteca Software Tec',
        icon: path.join(__dirname, isDev ? '../../public/icon.png' : '../../dist/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (isDev) {
        // Try different ports that Vite might use
        const tryPorts = [5173, 5174, 5175, 5176];
        let loaded = false;
        
        for (const port of tryPorts) {
            try {
                await win.loadURL(`http://localhost:${port}`);
                console.log(`Loaded Vite dev server on port ${port}`);
                loaded = true;
                break;
            } catch (error) {
                console.log(`Port ${port} not available, trying next...`);
            }
        }
        
        if (!loaded) {
            console.error('Could not connect to Vite dev server on any port');
            win.loadURL('http://localhost:5173'); // Fallback
        }
        
        win.webContents.openDevTools(); // Útil para desarrollo
    } else {
        // Ajustar ruta según la estructura de compilación
        win.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    // Configurar menú después de que la ventana esté lista
    win.webContents.once('did-finish-load', () => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Close',
                        click: () => {
                            win.close();
                        }
                    }
                ]
            }
        ]);
        Menu.setApplicationMenu(menu);
    });
}

ipcMain.on('app-close', () => {
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// ¡CRÍTICO! - Inicializar la aplicación cuando esté lista
app.whenReady().then(() => {
    createWindow();
});