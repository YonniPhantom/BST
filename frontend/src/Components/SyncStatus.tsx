import { useExcelCache } from '../contexts/ExcelCacheContext'
import { Wifi, WifiOff, Cloud, RefreshCw, AlertCircle } from 'lucide-react'

export default function SyncStatus() {
  // Manejar graciosamente la ausencia del contexto
  let cacheContext
  try {
    cacheContext = useExcelCache()
  } catch (error) {
    // Si no hay ExcelCacheProvider, no mostrar nada
    return null
  }

  const { cacheStatus, syncWithDrive } = cacheContext

  if (!cacheStatus) return null

  return (
    <div className="flex items-center space-x-2 text-xs">
      {/* Estado principal - más compacto */}
      {cacheStatus.isSaving ? (
        <div className="flex items-center space-x-1 text-blue-600">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Sync...</span>
        </div>
      ) : cacheStatus.error ? (
        <div className="flex items-center space-x-1 text-red-600" title={cacheStatus.error}>
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
        </div>
      ) : cacheStatus.hasUnsavedChanges ? (
        <div className="flex items-center space-x-1 text-orange-600">
          <WifiOff className="w-3 h-3" />
          <span>Sin guardar</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-green-600">
          <Wifi className="w-3 h-3" />
          <span>OK</span>
        </div>
      )}

      {/* Botón de sincronización manual - solo icono */}
      <button
        onClick={syncWithDrive}
        disabled={cacheStatus.isSaving}
        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors rounded"
        title={`Sincronizar manualmente${cacheStatus.lastSynced ? ` - Última: ${cacheStatus.lastSynced.toLocaleTimeString()}` : ''}`}
      >
        <Cloud className="w-3 h-3" />
      </button>
    </div>
  )
}
