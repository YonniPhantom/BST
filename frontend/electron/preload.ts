import { contextBridge, ipcRenderer } from "electron";
import type { IElectronAPI } from "../types/electron";

const electronAPI: IElectronAPI = {
    closeApp: () => ipcRenderer.send("close-app")
}

contextBridge.exposeInMainWorld("electronAPI", electronAPI);