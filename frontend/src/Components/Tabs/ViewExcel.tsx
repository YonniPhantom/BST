"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useSelectedFile } from '../../hooks/useSelectedFile'
import { useExcelCache } from '../../contexts/ExcelCacheContext'
import { motion } from 'motion/react'
import { FileSpreadsheet, RefreshCw, AlertCircle, Eye, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit3, Clock, Save, Wifi, WifiOff } from 'lucide-react'


export default function ViewExcel() {
  const { selectedFile, hasSelectedFile } = useSelectedFile()
  const { cachedData, cacheStatus, syncWithDrive, updateCellValue, isOfflineMode, ensureCurrentDateRow } = useExcelCache()
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ row: number, col: number } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set())
  const [newRows, setNewRows] = useState<Set<number>>(new Set())
  const rowsPerPage = 20

  // Funciones helper para tracking de cambios
  const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`

  const isCellChanged = (rowIndex: number, colIndex: number) => {
    return changedCells.has(getCellKey(rowIndex, colIndex))
  }

  const isRowNew = (rowIndex: number) => {
    return newRows.has(rowIndex)
  }

  const markCellAsChanged = (rowIndex: number, colIndex: number) => {
    setChangedCells(prev => new Set(prev).add(getCellKey(rowIndex, colIndex)))
  }

  // const markRowAsNew = (rowIndex: number) => {
  //   setNewRows(prev => new Set(prev).add(rowIndex))
  // }

  const clearChanges = () => {
    setChangedCells(new Set())
    setNewRows(new Set())
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

  // Las funciones de fecha ahora vienen del contexto

  // Establecer la primera hoja como activa cuando cambien los datos del caché
  useEffect(() => {
    console.log('📊 Datos del caché actualizados:', cachedData)
    if (cachedData && cachedData.sheetNames && cachedData.sheetNames.length > 0) {
      console.log('📋 Hojas disponibles:', cachedData.sheetNames)
      setActiveSheet(cachedData.sheetNames[0])
      console.log('✅ Hoja activa establecida:', cachedData.sheetNames[0])
    } else {
      console.log('❌ No hay datos de caché o sheetNames')
    }
  }, [cachedData])

  // Verificar y crear fila de fecha actual cuando se cargan los datos
  useEffect(() => {
    if (cachedData && activeSheet) {
      // Pequeño delay para asegurar que los datos estén completamente cargados
      const timer = setTimeout(() => {
        ensureCurrentDateRow()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [cachedData, activeSheet, ensureCurrentDateRow])

  // Limpiar cambios cuando se sincroniza exitosamente
  useEffect(() => {
    if (!cacheStatus.hasUnsavedChanges && cacheStatus.lastSynced) {
      clearChanges()
    }
  }, [cacheStatus.hasUnsavedChanges, cacheStatus.lastSynced])

  // Guardado automático cada 5 minutos
  useEffect(() => {
    if (!hasSelectedFile || !cacheStatus.hasUnsavedChanges) return

    console.log('📅 Configurando auto-sync cada 5 minutos para cambios pendientes')

    const interval = setInterval(() => {
      if (cacheStatus.hasUnsavedChanges) {
        console.log('🔄 Auto-sync ejecutándose - hay cambios pendientes')
        syncWithDrive().catch((error: any) => {
          console.warn('⚠️ Auto-sync falló:', error)
        })
      }
    }, 5 * 60 * 1000) // 5 minutos

    return () => {
      console.log('🧹 Limpiando intervalo de auto-sync')
      clearInterval(interval)
    }
  }, [hasSelectedFile, cacheStatus.hasUnsavedChanges, syncWithDrive])

  const getCurrentSheetData = () => {
    if (!cachedData || !activeSheet) {
      console.log('❌ No hay cachedData o activeSheet:', { cachedData: !!cachedData, activeSheet })
      return []
    }
    const rawData = cachedData.sheets[activeSheet] || []
    console.log('📄 Datos de la hoja', activeSheet, ':', rawData.length, 'filas')

    // Filtrar filas completamente vacías
    return rawData.filter((row: any) => {
      // Una fila se considera no vacía si tiene al menos una celda con contenido
      return row && row.some((cell: any) =>
        cell !== null &&
        cell !== undefined &&
        cell.toString().trim() !== ''
      )
    })
  }

  const getPaginatedData = () => {
    const data = getCurrentSheetData()
    if (!data || !Array.isArray(data)) return []

    // Reversar los datos para mostrar los más recientes primero (excluyendo headers)
    const headers = data.length > 0 ? [data[0]] : []
    const dataRows = data.length > 1 ? data.slice(1).reverse() : []
    const reversedData = [...headers, ...dataRows]

    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return reversedData.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    const data = getCurrentSheetData()
    if (!data || !Array.isArray(data)) return 1
    return Math.ceil(data.length / rowsPerPage)
  }

  const getColumnHeaders = () => {
    // Definir las columnas específicas que queremos mostrar
    return [
      '#',
      'NOMBRE',
      'NUM CONTROL',
      'CARRERA',
      'HORA ENTRADA'
    ]
  }

  const getTableData = () => {
    const data = getPaginatedData()
    if (!data || !Array.isArray(data)) return []
    const rawData = data.length > 1 ? data.slice(1) : []

    // Mapear los datos del Excel incluyendo información de tipo de fila
    return rawData.map((row, index) => {
      // Verificar si es una fila de fecha
      const isDate = isDateRow(row)

      if (isDate) {
        // Para filas de fecha, mostrar la fecha en la primera columna y vacío en las demás
        return {
          data: [row[0] || '', '', '', '', ''],
          isDateRow: true,
          originalRow: row,
          rowIndex: index
        }
      } else {
        // Para filas normales, mapear según la estructura del Excel
        // Columnas esperadas: # (0), Nombre (1), Número Control (2), Carrera (3), Hora Entrada (4)
        const mappedRow = new Array(5).fill('')

        if (row && Array.isArray(row)) {
          mappedRow[0] = row[0] || '' // # (1ª columna del Excel - índice 0)
          mappedRow[1] = row[1] || '' // NOMBRE (2ª columna del Excel - índice 1)
          mappedRow[2] = row[2] || '' // NUM CONTROL (3ª columna del Excel - índice 2)
          mappedRow[3] = row[3] || '' // CARRERA (4ª columna del Excel - índice 3)
          mappedRow[4] = row[4] || '' // HORA ENTRADA (5ª columna del Excel - índice 4)
        }

        return {
          data: mappedRow,
          isDateRow: false,
          originalRow: row,
          rowIndex: index
        }
      }
    })
  }

  const getDataRowsCount = () => {
    const data = getCurrentSheetData()
    if (!data || !Array.isArray(data)) return 0
    // Restar 1 para excluir la fila de headers
    return Math.max(0, data.length - 1)
  }

  // Función para detectar si un valor es una hora en formato decimal de Excel
  const isExcelTime = (value: any): boolean => {
    if (typeof value !== 'number') return false
    // Los valores de tiempo en Excel están entre 0 y 1 (representando 24 horas)
    // También pueden ser mayores a 1 si representan más de 24 horas
    return value >= 0 && value < 10 && (value % 1) !== 0
  }

  // Función para convertir decimal de Excel a formato de tiempo HH:MM
  const formatExcelTime = (decimal: number): string => {
    try {
      // Convertir decimal a horas totales
      const totalHours = decimal * 24
      const hours = Math.floor(totalHours)
      const minutes = Math.round((totalHours - hours) * 60)

      // Formatear con ceros a la izquierda
      const formattedHours = hours.toString().padStart(2, '0')
      const formattedMinutes = minutes.toString().padStart(2, '0')

      return `${formattedHours}:${formattedMinutes}`
    } catch {
      return decimal.toString()
    }
  }

  // Función para formatear el valor de una celda
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return ''

    // Si es un número que parece ser una hora de Excel
    if (isExcelTime(value)) {
      return formatExcelTime(value)
    }

    // Para otros valores, convertir a string normalmente
    return value.toString()
  }

  // Función para detectar si una columna es de tiempo
  const isTimeColumn = (colIndex: number): boolean => {
    // La columna 4 (índice 4) es la columna "Hora Entrada" en la nueva estructura
    return colIndex === 4
  }

  // Función para validar y formatear tiempo
  const validateAndFormatTime = (value: string): string => {
    // Si el valor está vacío, devolverlo tal como está
    if (!value.trim()) {
      return value
    }

    // Limpiar el valor de espacios y caracteres extraños
    const cleanValue = value.replace(/\s/g, '').trim()

    // Intentar diferentes patrones de tiempo
    let hours, minutes

    // Patrón HH:MM o H:MM
    let match = cleanValue.match(/^(\d{1,2}):(\d{2})$/)
    if (match) {
      hours = parseInt(match[1])
      minutes = parseInt(match[2])
    } else {
      // Patrón HHMM (sin dos puntos)
      match = cleanValue.match(/^(\d{1,2})(\d{2})$/)
      if (match && cleanValue.length >= 3) {
        if (cleanValue.length === 3) {
          // HMM -> H:MM
          hours = parseInt(cleanValue[0])
          minutes = parseInt(cleanValue.slice(1))
        } else {
          // HHMM -> HH:MM
          hours = parseInt(cleanValue.slice(0, 2))
          minutes = parseInt(cleanValue.slice(2))
        }
      }
    }

    if (hours !== undefined && minutes !== undefined) {
      // Validar rangos
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Formatear como HH:MM
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }
    }

    // Si no es un tiempo válido, devolver el valor original
    return value
  }

  // Función para iniciar la edición de una celda
  const startEditing = (rowIndex: number, colIndex: number, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(formatCellValue(currentValue))
  }

  // Función para cancelar la edición
  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Función para mapear el índice de columna mostrada al índice real del Excel
  const mapDisplayColumnToExcelColumn = (displayColIndex: number): number => {
    // Mapeo de nuestras columnas mostradas a las columnas reales del Excel
    // Nueva estructura: #, Nombre, Número Control, Carrera, Hora Entrada
    // Indices Excel: 0, 1, 2, 3, 4
    const columnMapping = [
      0, // # -> columna 0 del Excel
      1, // Nombre -> columna 1 del Excel
      2, // Número Control -> columna 2 del Excel
      3, // Carrera -> columna 3 del Excel
      4  // Hora Entrada -> columna 4 del Excel
    ]
    return columnMapping[displayColIndex] !== undefined ? columnMapping[displayColIndex] : displayColIndex
  }

  // Función para guardar cambios en una celda
  const saveCellEdit = useCallback(async (displayRowIndex: number, displayColIndex: number, newValue: string) => {
    if (!selectedFile || !activeSheet) return

    // Convertir el índice de fila mostrado al índice real en los datos originales
    const totalDataRows = getDataRowsCount()
    const currentRowInPage = displayRowIndex + 1
    const rowsBeforeCurrentPage = (currentPage - 1) * rowsPerPage
    const originalRowNumber = totalDataRows - rowsBeforeCurrentPage - currentRowInPage + 1
    const actualRowIndex = originalRowNumber - 1 // Convertir a índice base 0

    // Mapear la columna mostrada a la columna real del Excel
    const actualColIndex = mapDisplayColumnToExcelColumn(displayColIndex)

    // Actualizar en el caché local
    updateCellValue(activeSheet, actualRowIndex + 1, actualColIndex, newValue) // +1 porque la primera fila son headers
    console.log('✏️ Celda actualizada, cambios marcados automáticamente por updateCellValue')

  }, [selectedFile, activeSheet, updateCellValue, currentPage, rowsPerPage])

  // Manejar el envío del formulario de edición
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCell) {
      let processedValue = editValue

      // Si es una columna de tiempo, validar y formatear
      if (isTimeColumn(editingCell.col)) {
        processedValue = validateAndFormatTime(editValue)
        setEditValue(processedValue) // Actualizar el valor mostrado
      }

      // Marcar la celda como cambiada
      markCellAsChanged(editingCell.row, editingCell.col)

      saveCellEdit(editingCell.row, editingCell.col, processedValue)
      cancelEditing()
    }
  }

  // Manejar teclas en la edición
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSubmit(e)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  if (!hasSelectedFile) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FileSpreadsheet className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No hay archivo seleccionado
        </h3>
        <p className="text-gray-600 text-center">
          Ve a la pestaña de Configuración y selecciona un archivo Excel de Google Drive para visualizarlo aquí.
        </p>
      </motion.div>
    )
  }

  if (cacheStatus.isLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Cargando Excel...
        </h3>
        <p className="text-gray-600">
          Obteniendo contenido de {selectedFile?.name}
        </p>
      </motion.div>
    )
  }

  if (cacheStatus.error) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Error al cargar el archivo
        </h3>
        <p className="text-gray-600 text-center mb-4">
          {cacheStatus.error}
        </p>
        <button
          onClick={syncWithDrive}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>
      </motion.div>
    )
  }

  const headers = getColumnHeaders()
  const tableData = getTableData() || []
  const totalPages = getTotalPages()

  return (
    <motion.div
      className="p-6 space-y-6 min-h-[calc(100vh-10rem)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-800">
                Visualización de datos
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} • {getDataRowsCount()} registros
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Indicador de modo offline */}
            {isOfflineMode && (
              <div className="flex items-center space-x-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                <WifiOff className="w-4 h-4" />
                <span>Modo offline</span>
              </div>
            )}

            {/* Indicador de edición */}
            <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
              <Edit3 className="w-4 h-4" />
              <span>Haz clic en cualquier celda para editarla</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={syncWithDrive}
            disabled={cacheStatus.isSaving}
            className={`${isOfflineMode
              ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
              } text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2`}
            title={isOfflineMode ? 'Intentar reconectar y sincronizar' : 'Sincronizar con Google Drive'}
          >
            {isOfflineMode ? (
              <Wifi className={`w-4 h-4 ${cacheStatus.isSaving ? 'animate-spin' : ''}`} />
            ) : (
              <RefreshCw className={`w-4 h-4 ${cacheStatus.isSaving ? 'animate-spin' : ''}`} />
            )}
            <span>{isOfflineMode ? 'Reconectar' : 'Sincronizar'}</span>
          </button>

          {/* Botón de guardado manual */}
          <button
            onClick={() => {
              console.log('💾 Botón Guardar presionado. Estado:', {
                hasUnsavedChanges: cacheStatus.hasUnsavedChanges,
                isSaving: cacheStatus.isSaving,
                cachedData: !!cachedData
              });
              syncWithDrive();
            }}
            disabled={cacheStatus.isSaving || !cacheStatus.hasUnsavedChanges}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <Save className={`w-4 h-4 ${cacheStatus.isSaving ? 'animate-spin' : ''}`} />
            <span>Guardar</span>
          </button>

          {/* Indicador de estado */}
          <div className="flex items-center space-x-2 text-sm">
            {cacheStatus.hasUnsavedChanges ? (
              <div className="flex items-center space-x-1 text-orange-600">
                <WifiOff className="w-4 h-4" />
                <span>Cambios sin guardar</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span>Sincronizado</span>
              </div>
            )}
            {cacheStatus.lastSynced && (
              <span className="text-gray-500">
                Última sync: {cacheStatus.lastSynced.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={() => window.open(`https://drive.google.com/file/d/${selectedFile?.id}/view`, '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir en Drive</span>
          </button>
        </div>

        {/* Sheet Tabs */}
        {cachedData && cachedData.sheetNames && cachedData.sheetNames.length > 1 && (
          <div className="flex space-x-2 border-b border-gray-200">
            {cachedData.sheetNames.map((sheetName: string) => (
              <button
                key={sheetName}
                onClick={() => {
                  setActiveSheet(sheetName)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 font-medium transition-colors duration-200 border-b-2 ${activeSheet === sheetName
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
              >
                {sheetName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {cachedData && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {activeSheet} ({getDataRowsCount()} registros con datos)
            </h2>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{header}</span>
                        {isTimeColumn(index) && (
                          <div title="Columna de tiempo (formato HH:MM)">
                            <Clock className="w-3 h-3 text-blue-500" />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((rowData, rowIndex) => {
                  // Verificar si es una fila de fecha
                  if (rowData.isDateRow) {
                    return (
                      <tr key={rowIndex} className="bg-blue-50 border-t-2 border-blue-200">
                        <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                          📅
                        </td>
                        <td
                          colSpan={headers.length}
                          className="px-4 py-3 text-sm font-semibold text-blue-800 bg-blue-100 text-center"
                        >
                          {rowData.data[0]}
                        </td>
                      </tr>
                    )
                  }

                  // Fila normal de datos
                  return (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {headers.map((_, colIndex) => {
                        const cellValue = rowData.data[colIndex]
                        const formattedValue = formatCellValue(cellValue)
                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                        const isCellModified = isCellChanged(rowIndex, colIndex)
                        const isRowModified = isRowNew(rowIndex)

                        return (
                          <td
                            key={colIndex}
                            className={`px-4 py-3 text-sm max-w-xs relative group ${isRowModified
                              ? 'bg-orange-50 border-l-2 border-orange-400'
                              : isCellModified
                                ? 'bg-yellow-50 border-l-2 border-yellow-400'
                                : ''
                              }`}
                            title={formattedValue}
                          >
                            {isEditing ? (
                              <form onSubmit={handleEditSubmit} className="w-full">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  onBlur={() => handleEditSubmit({ preventDefault: () => { } } as React.FormEvent)}
                                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={isTimeColumn(colIndex) ? "HH:MM (ej: 08:30)" : ""}
                                  autoFocus
                                />
                              </form>
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1 flex items-center justify-between group"
                                onClick={() => startEditing(rowIndex, colIndex, cellValue)}
                              >
                                <span className="truncate">{formattedValue}</span>
                                <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                              </div>
                            )}

                            {(isCellModified || isRowModified) && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" title="Cambios sin guardar" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {tableData.length === 0 && (
            <div className="p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No hay datos para mostrar
              </h3>
              <p className="text-gray-600">
                Esta hoja está vacía o no contiene datos válidos.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
