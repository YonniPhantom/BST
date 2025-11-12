import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface SelectedFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

interface FileContextType {
  selectedFile: SelectedFile | null
  setSelectedFile: (file: SelectedFile | null) => void
  clearSelectedFile: () => void
}

const FileContext = createContext<FileContextType | undefined>(undefined)

interface FileProviderProps {
  children: ReactNode
}

export function FileProvider({ children }: FileProviderProps) {
  const [selectedFile, setSelectedFileState] = useState<SelectedFile | null>(null)

  // Cargar archivo seleccionado del localStorage al inicializar
  useEffect(() => {
    const savedFile = localStorage.getItem('selectedExcelFile')
    if (savedFile) {
      try {
        const parsedFile = JSON.parse(savedFile)
        setSelectedFileState(parsedFile)
      } catch (error) {
        console.error('Error parsing saved file:', error)
        localStorage.removeItem('selectedExcelFile')
      }
    }
  }, [])

  // Función para establecer archivo seleccionado
  const setSelectedFile = (file: SelectedFile | null) => {
    setSelectedFileState(file)
    if (file) {
      localStorage.setItem('selectedExcelFile', JSON.stringify(file))
    } else {
      localStorage.removeItem('selectedExcelFile')
    }
  }

  // Función para limpiar selección
  const clearSelectedFile = () => {
    setSelectedFileState(null)
    localStorage.removeItem('selectedExcelFile')
  }

  const value: FileContextType = {
    selectedFile,
    setSelectedFile,
    clearSelectedFile
  }

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  )
}

// Hook personalizado para usar el contexto
export function useFile() {
  const context = useContext(FileContext)
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider')
  }
  return context
}
