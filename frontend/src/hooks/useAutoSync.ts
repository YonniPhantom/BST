import { useEffect, useRef } from 'react'
import { useExcelCache } from '../contexts/ExcelCacheContext'
import { useSelectedFile } from '../hooks/useSelectedFile'

export function useAutoSync(intervalMinutes: number = 5) {
  // Manejar graciosamente la ausencia del contexto
  let cacheContext
  try {
    cacheContext = useExcelCache()
  } catch (error) {
    // Si no hay ExcelCacheProvider, retornar valores por defecto
    return {
      isAutoSyncActive: false,
      forcSync: () => {},
      nextSyncIn: 0
    }
  }

  const { syncWithDrive, cacheStatus } = cacheContext
  const { hasSelectedFile } = useSelectedFile()
  const intervalRef = useRef<any | null>(null)

  useEffect(() => {
    // Solo configurar auto-sync si hay archivo seleccionado
    if (!hasSelectedFile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Configurar intervalo de auto-sync
    intervalRef.current = setInterval(() => {
      // Solo sincronizar si hay cambios sin guardar y no se está guardando actualmente
      if (cacheStatus.hasUnsavedChanges && !cacheStatus.isSaving) {
        console.log('Auto-sync: Sincronizando cambios automáticamente...')
        syncWithDrive()
      }
    }, intervalMinutes * 60 * 1000) // Convertir minutos a milisegundos

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [hasSelectedFile, cacheStatus.hasUnsavedChanges, cacheStatus.isSaving, syncWithDrive, intervalMinutes])

  // Función para forzar sincronización manual
  const forcSync = () => {
    if (!cacheStatus.isSaving) {
      syncWithDrive()
    }
  }

  return {
    isAutoSyncActive: !!intervalRef.current,
    forcSync,
    nextSyncIn: intervalMinutes * 60 // segundos hasta próxima sync
  }
}
