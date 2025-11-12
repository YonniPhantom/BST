import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSelectedFile } from '../hooks/useSelectedFile'
import { API_BASE_URL } from '../shared/Api'
import { useAuth } from './AuthContext'

interface ExcelData {
  sheets: { [key: string]: any[][] }
  sheetNames: string[]
}

interface CacheStatus {
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  lastSynced: Date | null
  hasUnsavedChanges: boolean
  error: string | null
}

interface ExcelCacheContextType {
  cachedData: ExcelData | null
  cacheStatus: CacheStatus
  loadFromCache: () => Promise<void>
  saveToCache: (data: ExcelData) => void
  syncWithDrive: () => Promise<void>
  updateCellValue: (sheetName: string, rowIndex: number, colIndex: number, value: any) => void
  addRowToCache: (rowData: any[]) => void
  ensureCurrentDateRow: () => void
  isOfflineMode: boolean
}

const ExcelCacheContext = createContext<ExcelCacheContextType | undefined>(undefined)

export function ExcelCacheProvider({ children }: { children: React.ReactNode }) {
  const { selectedFile } = useSelectedFile()
  const { user } = useAuth()
  const [cachedData, setCachedData] = useState<ExcelData | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    lastSynced: null,
    hasUnsavedChanges: false,
    error: null
  })
  const [isOfflineMode, setIsOfflineMode] = useState(false)


  // Cargar datos del caché local (prioridad) o desde Drive
  const loadFromCache = useCallback(async () => {
    if (!selectedFile) return

    setCacheStatus(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Intentar cargar desde localStorage primero (PRIORIDAD)
      const cacheKey = `excel_cache_${selectedFile.id}`
      const cachedString = localStorage.getItem(cacheKey)
      
      if (cachedString) {
        console.log('📁 Cargando Excel desde caché local (offline-ready)')
        const cached = JSON.parse(cachedString)
        setCachedData(cached.data)
        setCacheStatus(prev => ({
          ...prev,
          isLoading: false,
          lastSaved: new Date(cached.timestamp),
          lastSynced: new Date(cached.lastSynced || cached.timestamp)
        }))
        
        // Si tenemos datos locales, la vista ya está lista
        // Solo intentar sincronizar en segundo plano (sin bloquear la UI)
        console.log('🔄 Sincronización en segundo plano...')
        syncWithDrive().catch(error => {
          console.warn('⚠️ Sincronización en segundo plano falló (modo offline):', error)
          setIsOfflineMode(true)
          // No mostrar error al usuario, solo log
        })
        
        return // Salir aquí, ya tenemos los datos locales
      }

      // Solo si NO hay caché local, intentar cargar desde Drive
      console.log('📥 No hay caché local, intentando cargar desde Drive...')
      await syncWithDrive()

    } catch (error) {
      console.error('❌ Error cargando datos:', error)
      setCacheStatus(prev => ({
        ...prev,
        error: 'Error cargando datos del caché'
      }))
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }))
    }
  }, [selectedFile])

  // Guardar datos en caché local
  const saveToCache = useCallback((data: ExcelData) => {
    if (!selectedFile) return

    const cacheKey = `excel_cache_${selectedFile.id}`
    const cacheData = {
      data,
      timestamp: new Date().toISOString(),
      lastSynced: cacheStatus.lastSynced?.toISOString() || new Date().toISOString()
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    setCachedData(data)
    setCacheStatus(prev => ({
      ...prev,
      lastSaved: new Date(),
      hasUnsavedChanges: true
    }))
  }, [selectedFile, cacheStatus.lastSynced])

  // Sincronizar con Google Drive (modo resiliente)
  const syncWithDrive = useCallback(async () => {
    if (!selectedFile || !user) {
      console.log('🔒 Sin archivo seleccionado o usuario, saltando sincronización')
      return
    }

    setCacheStatus(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      // Si hay cambios sin guardar, sincronizar hacia Drive
      if (cacheStatus.hasUnsavedChanges && cachedData) {
        console.log('Sincronizando cambios locales a Drive...', cachedData)
        
        const syncResponse = await fetch(`${API_BASE_URL}/api/drive/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.accessToken}`,
          },
          body: JSON.stringify({
            fileId: selectedFile.id,
            excelData: cachedData
          })
        })

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json()
          console.error('Error en respuesta de sync:', errorData)
          throw new Error(errorData.error || 'Error al sincronizar cambios con Drive')
        }

        const syncResult = await syncResponse.json()
        console.log('Sincronización exitosa:', syncResult)

        // Actualizar el caché local con timestamp de sincronización
        const cacheKey = `excel_cache_${selectedFile.id}`
        const cacheData = {
          data: cachedData, // Mantener los datos locales
          timestamp: new Date().toISOString(),
          lastSynced: new Date().toISOString()
        }

        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        
        setCacheStatus(prev => ({
          ...prev,
          lastSynced: new Date(),
          hasUnsavedChanges: false
        }))
        setIsOfflineMode(false)
      } else {
        // Si no hay cambios, solo descargar la versión más reciente de Drive
        console.log('No hay cambios locales, descargando desde Drive...')
        
        const response = await fetch(`${API_BASE_URL}/api/drive/content?fileId=${selectedFile.id}`, {
          headers: {
            'Authorization': `Bearer ${user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error('Error al obtener contenido de Drive')
        }

        const driveData = await response.json()
        
        // Actualizar caché local con datos de Drive
        const cacheKey = `excel_cache_${selectedFile.id}`
        const cacheData = {
          data: driveData,
          timestamp: new Date().toISOString(),
          lastSynced: new Date().toISOString()
        }

        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        setCachedData(driveData)
        setCacheStatus(prev => ({
          ...prev,
          lastSynced: new Date(),
          hasUnsavedChanges: false
        }))
        
        // Resetear modo offline si la sincronización fue exitosa
        setIsOfflineMode(false)
      }

    } catch (error) {
      console.warn('⚠️ Error sincronizando con Drive (modo offline):', error)
      
      // No mostrar error al usuario si estamos en modo offline
      // Solo registrar para debugging
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('token') ||
        error.message.includes('401') ||
        error.message.includes('403')
      )
      
      if (isNetworkError) {
        console.log('🔌 Modo offline detectado, continuando con datos locales')
        setIsOfflineMode(true)
        // No establecer error en el estado para no afectar la UI
      } else {
        // Solo mostrar errores que no sean de conectividad
        setCacheStatus(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error sincronizando con Google Drive'
        }))
      }
    } finally {
      setCacheStatus(prev => ({ ...prev, isSaving: false }))
    }
  }, [selectedFile, cacheStatus.hasUnsavedChanges, cachedData])

  // Auto-sync cada 5 minutos (modo resiliente)
  useEffect(() => {
    if (!selectedFile || !cacheStatus.hasUnsavedChanges) return

    console.log('📅 Configurando auto-sync para archivo:', selectedFile.name)
    const interval = setInterval(() => {
      console.log('🔄 Auto-sync ejecutándose (en segundo plano)...')
      syncWithDrive().catch((error: any) => {
        console.warn('⚠️ Auto-sync falló (continuando en modo offline):', error)
        // No hacer nada, solo log - el usuario puede seguir trabajando
      })
    }, 5 * 60 * 1000) // 5 minutos

    return () => {
      clearInterval(interval)
    }
  }, [selectedFile, cacheStatus.hasUnsavedChanges, syncWithDrive])

  // Agregar fila al caché
  const addRowToCache = useCallback((rowData: any[]) => {
    if (!cachedData) return

    const newData = { ...cachedData }
    const sheetName = newData.sheetNames[0] // Usar la primera hoja
    const sheetData = [...newData.sheets[sheetName]]
    
    // Agregar nueva fila al final
    sheetData.push(rowData)
    newData.sheets[sheetName] = sheetData

    saveToCache(newData)
  }, [cachedData, saveToCache])

  // Actualizar valor de celda específica
  const updateCellValue = useCallback((sheetName: string, rowIndex: number, colIndex: number, value: any) => {
    if (!cachedData) return

    const newData = { ...cachedData }
    const sheetData = [...newData.sheets[sheetName]]
    
    // Asegurar que la fila existe
    if (!sheetData[rowIndex]) {
      sheetData[rowIndex] = []
    }
    
    // Actualizar el valor
    sheetData[rowIndex][colIndex] = value
    newData.sheets[sheetName] = sheetData

    saveToCache(newData)
  }, [cachedData, saveToCache])

  // Función para formatear la fecha actual en español
  const formatCurrentDate = (): string => {
    const now = new Date()
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    
    const day = now.getDate()
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    
    return `${day} de ${month} del ${year}`
  }

  // Función para detectar si una fila es una fila de fecha
  const isDateRow = (row: any[]): boolean => {
    if (!row || row.length === 0) return false
    const firstCell = row[0]
    if (!firstCell || typeof firstCell !== 'string') return false
    
    // Patrones para detectar fechas en español
    const datePatterns = [
      /^\d{1,2}\s+de\s+\w+\s+del?\s+\d{4}$/i, // "13 de octubre del 2025"
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,             // "13/10/2025"
      /^\d{4}-\d{2}-\d{2}$/,                   // "2025-10-13"
      /^\w+,?\s+\d{1,2}\s+de\s+\w+\s+del?\s+\d{4}$/i // "Domingo, 13 de octubre del 2025"
    ]
    
    return datePatterns.some(pattern => pattern.test(firstCell.trim()))
  }

  // Función para asegurar que existe una fila con la fecha actual
  const ensureCurrentDateRow = useCallback(() => {
    if (!cachedData || !cachedData.sheetNames.length) return

    const sheetName = cachedData.sheetNames[0]
    const sheetData = cachedData.sheets[sheetName] || []
    const currentDateStr = formatCurrentDate()

    console.log('📅 Verificando fecha actual:', currentDateStr)

    // Verificar si ya existe una fila con la fecha actual
    const hasCurrentDate = sheetData.some(row => {
      if (isDateRow(row)) {
        const rowDateStr = row[0]?.toString().trim()
        return rowDateStr === currentDateStr
      }
      return false
    })

    if (hasCurrentDate) {
      console.log('✅ Fila de fecha actual ya existe')
      return
    }

    console.log('📝 Creando fila de fecha actual...')

    // Crear nueva fila de fecha (solo en la primera columna)
    const dateRow = [currentDateStr, '', '', '', '', '', '']

    // Crear nueva data con la fila de fecha agregada
    const newData = { ...cachedData }
    const newSheetData = [...sheetData, dateRow]
    newData.sheets[sheetName] = newSheetData

    saveToCache(newData)
    console.log('✅ Fila de fecha actual creada')
  }, [cachedData, saveToCache])

  // Cargar caché cuando cambie el archivo seleccionado
  useEffect(() => {
    if (selectedFile) {
      loadFromCache()
    } else {
      setCachedData(null)
      setCacheStatus({
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        lastSynced: null,
        hasUnsavedChanges: false,
        error: null
      })
    }
  }, [selectedFile, loadFromCache])

  return (
    <ExcelCacheContext.Provider value={{
      cachedData,
      cacheStatus,
      loadFromCache,
      saveToCache,
      syncWithDrive,
      updateCellValue,
      addRowToCache,
      ensureCurrentDateRow,
      isOfflineMode
    }}>
      {children}
    </ExcelCacheContext.Provider>
  )
}

export function useExcelCache() {
  const context = useContext(ExcelCacheContext)
  if (context === undefined) {
    throw new Error('useExcelCache must be used within an ExcelCacheProvider')
  }
  return context
}
