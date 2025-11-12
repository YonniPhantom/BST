const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Iniciar flujo OAuth
  startOAuth: (authUrl) => ipcRenderer.invoke('start-oauth', authUrl),
  
  // Cerrar la aplicación
  closeApp: () => ipcRenderer.send('close-app'),
  
  // Verificar si estamos en Electron
  isElectron: true
});
