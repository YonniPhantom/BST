export interface IElectronAPI {
    closeApp(): void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}