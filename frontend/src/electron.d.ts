// Definiciones de TypeScript para la API de Electron

interface ElectronAPI {
  startOAuth: (authUrl: string) => Promise<{
    success: boolean
    data?: {
      code?: string
      token?: string
      user?: {
        id: string
        email: string
        name: string
        picture?: string
      }
    }
    error?: string
  }>
  closeApp?: () => void
  isElectron: boolean
}

interface Window {
  electronAPI?: ElectronAPI
}
