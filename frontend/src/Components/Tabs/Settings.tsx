import { useState, useEffect } from 'react'
import Drive from '../Drive'
import { useSelectedFile } from '../../hooks/useSelectedFile'
import { useExcelCache } from '../../contexts/ExcelCacheContext'
import { Trash2, AlertTriangle, CheckCircle, RefreshCw, Archive, Calendar, HardDrive, Clock, RotateCcw } from 'lucide-react'
import { API_BASE_URL } from '../../shared/Api'

export default function Settings() {
    const { selectedFile, hasSelectedFile } = useSelectedFile()
    const { cachedData, saveToCache, cacheStatus } = useExcelCache()
    const [isCleaningRows, setIsCleaningRows] = useState(false)
    const [cleanupResult, setCleanupResult] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null)
    
    // Estado para backups
    const [backups, setBackups] = useState<any[]>([])
    const [isLoadingBackups, setIsLoadingBackups] = useState(false)
    const [isDeletingBackup, setIsDeletingBackup] = useState<string | null>(null)
    const [isCleaningBackups, setIsCleaningBackups] = useState(false)
    const [isRestoringBackup, setIsRestoringBackup] = useState<string | null>(null)
    const [backupResult, setBackupResult] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null)
    
    // Estado para conversión de horas
    const [isConvertingTimes, setIsConvertingTimes] = useState(false)
    const [timeConversionResult, setTimeConversionResult] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null)

    const cleanEmptyRows = async () => {
        if (!cachedData || !selectedFile || !cachedData.sheetNames) return

        setIsCleaningRows(true)
        setCleanupResult(null)

        try {
            let totalRowsRemoved = 0
            const newData = { ...cachedData }

            // Procesar cada hoja
            cachedData.sheetNames.forEach(sheetName => {
                const originalData = cachedData.sheets[sheetName] || []
                 
                // Filtrar filas que no estén completamente vacías
                const cleanedData = originalData.filter((row: any[], index: number) => {
                    // Mantener la primera fila (headers) siempre
                    if (index === 0) return true
                    
                    // Una fila se considera vacía si todos sus valores son null, undefined, o string vacío
                    const isEmpty = !row || row.every(cell => 
                        cell === null || 
                        cell === undefined || 
                        (typeof cell === 'string' && cell.trim() === '') ||
                        cell === ''
                    )
                    
                    if (isEmpty) {
                        totalRowsRemoved++
                        return false
                    }
                    return true
                })

                newData.sheets[sheetName] = cleanedData
            })

            if (totalRowsRemoved === 0) {
                setCleanupResult({
                    type: 'info',
                    message: 'No se encontraron filas vacías para eliminar.'
                })
            } else {
                // Guardar en caché local
                saveToCache(newData)
                
                setCleanupResult({
                    type: 'success',
                    message: `Se eliminaron ${totalRowsRemoved} filas vacías. Los cambios se sincronizarán automáticamente.`
                })
            }

        } catch (error) {
            console.error('Error limpiando filas vacías:', error)
            setCleanupResult({
                type: 'error',
                message: 'Error al eliminar filas vacías. Inténtalo de nuevo.'
            })
        } finally {
            setIsCleaningRows(false)
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setCleanupResult(null)
            }, 5000)
        }
    }

    // Función para convertir horas decimales a formato HH:MM
    const convertDecimalTimes = async () => {
        if (!cachedData || !selectedFile || !cachedData.sheetNames) return

        setIsConvertingTimes(true)
        setTimeConversionResult(null)

        try {
            let totalCellsConverted = 0
            const newData = { ...cachedData }

            // Función helper para convertir decimal a hora
            const decimalToTime = (decimal: number): string => {
                // Excel almacena las horas como fracciones de día
                // 1 día = 24 horas, entonces 1 hora = 1/24 = 0.041666...
                const totalMinutes = Math.round(decimal * 24 * 60)
                const hours = Math.floor(totalMinutes / 60)
                const minutes = totalMinutes % 60
                
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
            }

            // Función para detectar si un valor es un decimal de tiempo
            const isTimeDecimal = (value: any): boolean => {
                if (typeof value !== 'number') return false
                // Verificar si es un decimal entre 0 y 1 (típico de horas en Excel)
                // También incluir valores mayores a 1 para horas que excedan 24h
                return value > 0 && value < 2 && value.toString().includes('.')
            }

            // Procesar cada hoja
            cachedData.sheetNames?.forEach(sheetName => {
                const sheetData = cachedData.sheets?.[sheetName]
                if (!sheetData || sheetData.length === 0) return

                // Convertir CUALQUIER decimal que pueda ser una hora en TODA la hoja
                const convertedData = sheetData.map((row: any[], rowIndex: number) => {
                    if (rowIndex === 0) return row // Mantener headers

                    return row.map((cell: any, colIndex: number) => {
                        // Convertir cualquier decimal que parezca ser una hora
                        if (isTimeDecimal(cell)) {
                            totalCellsConverted++
                            console.log(`🕐 Convirtiendo ${cell} → ${decimalToTime(cell)} en columna ${colIndex}`)
                            return decimalToTime(cell)
                        }
                        return cell
                    })
                })

                newData.sheets[sheetName] = convertedData
            })

            if (totalCellsConverted === 0) {
                setTimeConversionResult({
                    type: 'info',
                    message: 'No se encontraron horas en formato decimal para convertir.'
                })
            } else {
                // Guardar en caché local
                saveToCache(newData)
                
                setTimeConversionResult({
                    type: 'success',
                    message: `Se convirtieron ${totalCellsConverted} celdas de formato decimal a hora (HH:MM). Los cambios se sincronizarán automáticamente.`
                })
            }

        } catch (error) {
            console.error('Error convirtiendo horas:', error)
            setTimeConversionResult({
                type: 'error',
                message: 'Error al convertir las horas. Inténtalo de nuevo.'
            })
        } finally {
            setIsConvertingTimes(false)
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setTimeConversionResult(null)
            }, 5000)
        }
    }

    // Función para limpiar backups automáticamente (mantener solo los 5 más recientes)
    const cleanOldBackups = async () => {
        setIsCleaningBackups(true)
        setBackupResult(null)
        
        try {
            console.log('🧹 Iniciando limpieza automática de backups...')
            
            const response = await fetch(`${API_BASE_URL}/api/health/cleanup-backups`, {
                method: 'POST'
            })
            
            if (response.ok) {
                const data = await response.json()
                console.log('✅ Limpieza completada:', data)
                
                // Recargar la lista de backups
                await loadBackups()
                
                setBackupResult({
                    type: 'success',
                    message: data.message || 'Limpieza de backups completada. Se mantuvieron solo los 5 más recientes.'
                })
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error en la limpieza de backups')
            }
        } catch (error) {
            console.error('Error limpiando backups:', error)
            setBackupResult({
                type: 'error',
                message: `Error al limpiar backups: ${error instanceof Error ? error.message : 'Error desconocido'}`
            })
        } finally {
            setIsCleaningBackups(false)
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setBackupResult(null)
            }, 5000)
        }
    }

    // Función para restaurar un backup
    const restoreBackup = async (filename: string) => {
        if (!filename) {
            console.error('No se especificó el nombre del archivo')
            return
        }
        
        // Confirmación del usuario
        const confirmed = window.confirm(
            `¿Estás seguro de que quieres restaurar el backup "${filename}"?\n\n` +
            `⚠️ ADVERTENCIA: Esta acción:\n` +
            `• Reemplazará el Excel actual con el backup seleccionado\n` +
            `• Creará un backup automático del estado actual antes de restaurar\n` +
            `• No se puede deshacer fácilmente\n\n` +
            `¿Continuar con la restauración?`
        )
        
        if (!confirmed) return
        
        setIsRestoringBackup(filename)
        setBackupResult(null)
        
        try {
            console.log('🔄 Iniciando restauración de backup:', filename)
            
            const response = await fetch(`${API_BASE_URL}/api/health/restore-backup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            })
            
            if (response.ok) {
                const data = await response.json()
                console.log('✅ Backup restaurado exitosamente:', data)
                
                // Recargar la lista de backups para mostrar el nuevo backup creado
                await loadBackups()
                
                setBackupResult({
                    type: 'success',
                    message: `✅ Excel restaurado exitosamente desde "${filename}". ${data.currentBackup ? `Se creó un backup del estado anterior: "${data.currentBackup}"` : ''}`
                })
                
                // Limpiar caché local para forzar recarga
                if (typeof window !== 'undefined' && window.localStorage) {
                    const keys = Object.keys(localStorage).filter(key => key.startsWith('excel_cache_'))
                    keys.forEach(key => localStorage.removeItem(key))
                    console.log('🧹 Caché local limpiado para forzar recarga')
                }
                
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al restaurar backup')
            }
        } catch (error) {
            console.error('Error restaurando backup:', error)
            setBackupResult({
                type: 'error',
                message: `Error al restaurar el backup: ${error instanceof Error ? error.message : 'Error desconocido'}`
            })
        } finally {
            setIsRestoringBackup(null)
            
            // Limpiar mensaje después de 10 segundos (más tiempo para restauración)
            setTimeout(() => {
                setBackupResult(null)
            }, 10000)
        }
    }

    // Función para cargar la lista de backups
    const loadBackups = async () => {
        setIsLoadingBackups(true)
        setBackupResult(null)
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/health/backups`)
            
            if (response.ok) {
                const data = await response.json()
                setBackups(data.backups || [])
                
                if (data.backups.length === 0) {
                    setBackupResult({
                        type: 'info',
                        message: 'No se encontraron archivos de backup.'
                    })
                }
            } else {
                throw new Error('Error al cargar backups')
            }
        } catch (error) {
            console.error('Error cargando backups:', error)
            setBackupResult({
                type: 'error',
                message: 'Error al cargar la lista de backups.'
            })
        } finally {
            setIsLoadingBackups(false)
        }
    }

    // Función para eliminar un backup específico
    const deleteBackup = async (filename: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el backup "${filename}"?`)) {
            return
        }
        
        setIsDeletingBackup(filename)
        setBackupResult(null)
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/health/backups/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                // Recargar la lista de backups
                await loadBackups()
                setBackupResult({
                    type: 'success',
                    message: `Backup "${filename}" eliminado exitosamente.`
                })
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al eliminar backup')
            }
        } catch (error) {
            console.error('Error eliminando backup:', error)
            setBackupResult({
                type: 'error',
                message: `Error al eliminar el backup: ${error instanceof Error ? error.message : 'Error desconocido'}`
            })
        } finally {
            setIsDeletingBackup(null)
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setBackupResult(null)
            }, 5000)
        }
    }

    // Función para eliminar todos los backups
    const deleteAllBackups = async () => {
        if (!confirm(`¿Estás seguro de que quieres eliminar TODOS los backups? Esta acción no se puede deshacer.`)) {
            return
        }
        
        setIsLoadingBackups(true)
        setBackupResult(null)
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/health/backups`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                const data = await response.json()
                setBackups([])
                setBackupResult({
                    type: 'success',
                    message: data.message || 'Todos los backups han sido eliminados.'
                })
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al eliminar backups')
            }
        } catch (error) {
            console.error('Error eliminando todos los backups:', error)
            setBackupResult({
                type: 'error',
                message: `Error al eliminar los backups: ${error instanceof Error ? error.message : 'Error desconocido'}`
            })
        } finally {
            setIsLoadingBackups(false)
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                setBackupResult(null)
            }, 5000)
        }
    }

    // Cargar backups al montar el componente
    useEffect(() => {
        loadBackups()
    }, [])

    return (
        <div className="space-y-4 pb-20">
            {/* Sección de Google Drive */}
            <Drive />
            
            {/* Sección de Herramientas de Excel */}
            {hasSelectedFile && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="border-b border-gray-200 pb-4 mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            <span>Herramientas de Excel</span>
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                            Herramientas para optimizar y limpiar tu archivo Excel
                        </p>
                    </div>

                    {/* Mensaje de resultado */}
                    {cleanupResult && (
                        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
                            cleanupResult.type === 'success' 
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : cleanupResult.type === 'error'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                            {cleanupResult.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {cleanupResult.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                            {cleanupResult.type === 'info' && <AlertTriangle className="w-5 h-5" />}
                            <span>{cleanupResult.message}</span>
                        </div>
                    )}

                    {/* Mensaje de resultado para conversión de horas */}
                    {timeConversionResult && (
                        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
                            timeConversionResult.type === 'success' 
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : timeConversionResult.type === 'error'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                            {timeConversionResult.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {timeConversionResult.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                            {timeConversionResult.type === 'info' && <Clock className="w-5 h-5" />}
                            <span>{timeConversionResult.message}</span>
                        </div>
                    )}

                    {/* Herramienta de limpieza de filas vacías */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800 mb-1">
                                    Eliminar Filas Vacías
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Elimina todas las filas completamente vacías del Excel para optimizar el archivo.
                                    Esta acción no afectará los headers ni las filas con datos.
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Los cambios se guardarán automáticamente en Google Drive</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={cleanEmptyRows}
                                disabled={isCleaningRows || cacheStatus.isSaving}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 ml-4"
                            >
                                {isCleaningRows ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Limpiando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Limpiar Filas</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Herramienta de conversión de horas decimales */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800 mb-1">
                                    Convertir Horas Decimales
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Convierte TODOS los números decimales que puedan ser horas (ej: 0.4375 → 10:30) en cualquier columna del Excel.
                                    Busca automáticamente en toda la hoja sin importar el nombre de la columna.
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    <span>Los cambios se guardarán automáticamente en Google Drive</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={convertDecimalTimes}
                                disabled={isConvertingTimes || cacheStatus.isSaving}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 ml-4"
                            >
                                {isConvertingTimes ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Convirtiendo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        <span>Convertir Horas</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Información del archivo actual */}
                    {cachedData && selectedFile && cachedData.sheetNames && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 mb-1">
                                Información del Archivo
                            </h4>
                            <div className="text-xs text-blue-700 space-y-1">
                                <div>Archivo: {selectedFile.name}</div>
                                <div>Hojas: {cachedData.sheetNames?.length || 0}</div>
                                <div>
                                    Total de filas: {cachedData.sheetNames?.reduce((total, sheetName) => 
                                        total + (cachedData.sheets?.[sheetName]?.length || 0), 0
                                    ) || 0}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sección de Gestión de Backups */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                        <Archive className="w-5 h-5 text-purple-600" />
                        <span>Gestión de Backups</span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Administra los archivos de respaldo del Excel
                    </p>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={loadBackups}
                        disabled={isLoadingBackups}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                        {isLoadingBackups ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Cargando...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                <span>Actualizar Lista</span>
                            </>
                        )}
                    </button>

                    {backups.length > 5 && (
                        <button
                            onClick={cleanOldBackups}
                            disabled={isCleaningBackups || isLoadingBackups}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                        >
                            {isCleaningBackups ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Limpiando...</span>
                                </>
                            ) : (
                                <>
                                    <HardDrive className="w-4 h-4" />
                                    <span>Limpiar Antiguos</span>
                                </>
                            )}
                        </button>
                    )}

                    {backups.length > 0 && (
                        <button
                            onClick={deleteAllBackups}
                            disabled={isLoadingBackups}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar Todos</span>
                        </button>
                    )}
                </div>

                {/* Mensaje de resultado */}
                {backupResult && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                        backupResult.type === 'success' ? 'bg-green-50 text-green-800' :
                        backupResult.type === 'error' ? 'bg-red-50 text-red-800' :
                        'bg-blue-50 text-blue-800'
                    }`}>
                        {backupResult.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : backupResult.type === 'error' ? (
                            <AlertTriangle className="w-4 h-4" />
                        ) : (
                            <Archive className="w-4 h-4" />
                        )}
                        <span className="text-sm">{backupResult.message}</span>
                    </div>
                )}

                {/* Lista de backups */}
                {isLoadingBackups ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                        <span className="text-gray-600">Cargando backups...</span>
                    </div>
                ) : backups.length === 0 ? (
                    <div className="text-center py-8">
                        <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                            No hay backups disponibles
                        </h3>
                        <p className="text-gray-600">
                            Los backups se crean automáticamente cuando se realizan cambios en el Excel.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>Se encontraron {backups.length} backup(s)</span>
                            <span>
                                Tamaño total: {backups.reduce((sum, backup) => sum + backup.size, 0) > 0 
                                    ? (backups.reduce((sum, backup) => sum + backup.size, 0) / 1024 / 1024).toFixed(2) + ' MB'
                                    : '0 MB'
                                }
                            </span>
                        </div>

                        {backups.map((backup) => (
                            <div key={backup.filename} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <HardDrive className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium text-gray-800 text-sm">
                                                {backup.filename}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{backup.createdFormatted}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Archive className="w-3 h-3" />
                                                <span>{backup.sizeFormatted}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => restoreBackup(backup.filename)}
                                            disabled={isRestoringBackup === backup.filename || isLoadingBackups}
                                            className="bg-green-100 hover:bg-green-200 disabled:bg-green-50 text-green-700 disabled:text-green-400 px-3 py-1 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                                        >
                                            {isRestoringBackup === backup.filename ? (
                                                <>
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                    <span className="text-xs">Restaurando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span className="text-xs">Restaurar</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup.filename)}
                                            disabled={isDeletingBackup === backup.filename || isRestoringBackup === backup.filename}
                                            className="bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 disabled:text-red-400 px-3 py-1 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                                        >
                                        {isDeletingBackup === backup.filename ? (
                                            <>
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                <span className="text-xs">Eliminando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-3 h-3" />
                                                <span className="text-xs">Eliminar</span>
                                            </>
                                        )}
                                    </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
