import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'motion/react'
import { Cloud, FileSpreadsheet, Download, RefreshCw, LogOut, User, Calendar, Check, CheckCircle, AlertTriangle, Shield, Lock } from 'lucide-react'
import { useFile } from '../contexts/FileContext'
import { API_BASE_URL } from '../shared/Api'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export default function Drive() {
  const { user, isLoading, signIn, signOut, refreshAccessToken } = useAuth()
  const { selectedFile, setSelectedFile, clearSelectedFile } = useFile()
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validatingFile, setValidatingFile] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<{[key: string]: any}>({})

  const fetchFiles = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Enviando petición a Drive con token:', user.accessToken?.substring(0, 50) + '...')
      let response = await fetch(`${API_BASE_URL}/api/drive/list`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      // Si el token expiró, intentar refrescar y reintentar
      if (response.status === 401) {
        console.log('🔄 Token expirado, intentando refrescar...')
        await refreshAccessToken()
        
        // Obtener el usuario actualizado del localStorage
        const updatedUserData = localStorage.getItem('auth_user')
        if (!updatedUserData) {
          throw new Error('No se pudo obtener el token actualizado')
        }
        const updatedUser = JSON.parse(updatedUserData)
        
        // Reintentar con el token refrescado
        response = await fetch(`${API_BASE_URL}/api/drive/list`, {
          headers: {
            'Authorization': `Bearer ${updatedUser.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      }
      
      if (!response.ok) {
        throw new Error('Error al obtener archivos de Drive')
      }
      const data = await response.json()
      setFiles(data.files || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchFiles()
    }
  }, [user])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const validateExcelFormat = async (file: DriveFile) => {
    if (!user) return
    
    setValidatingFile(file.id)
    console.log('🔍 Iniciando validación para archivo:', file.name, 'ID:', file.id)
    
    try {
      let response = await fetch(`${API_BASE_URL}/api/drive/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: file.id
        })
      })
      
      console.log('📡 Respuesta del servidor - Status:', response.status, 'OK:', response.ok)
      
      // Si el token expiró, intentar refrescar y reintentar
      if (response.status === 401) {
        console.log('🔄 Token expirado en validación, intentando refrescar...')
        await refreshAccessToken()
        
        // Obtener el usuario actualizado del localStorage
        const updatedUserData = localStorage.getItem('auth_user')
        if (!updatedUserData) {
          throw new Error('No se pudo obtener el token actualizado')
        }
        const updatedUser = JSON.parse(updatedUserData)
        
        // Reintentar con el token refrescado
        response = await fetch(`${API_BASE_URL}/api/drive/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${updatedUser.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileId: file.id
          })
        })
        
        console.log('📡 Respuesta del servidor (reintento) - Status:', response.status, 'OK:', response.ok)
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta del servidor:', errorText)
        throw new Error('Error al validar el archivo')
      }
      
      const validationResult = await response.json()
      console.log('✅ Resultado de validación:', validationResult)
      
      setValidationResults(prev => ({
        ...prev,
        [file.id]: validationResult
      }))
      
      return validationResult
    } catch (err) {
      console.error('❌ Error validating file:', err)
      return {
        isValid: false,
        errors: ['Error al validar el archivo: ' + (err instanceof Error ? err.message : 'Error desconocido')],
        warnings: []
      }
    } finally {
      setValidatingFile(null)
    }
  }

  const handleSelectFile = async (file: DriveFile) => {
    // Primero validar el formato
    const validation = await validateExcelFormat(file)
    
    if (validation.isValid) {
      setSelectedFile(file)
    }
  }

  const handleDeselectFile = () => {
    clearSelectedFile()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <motion.div 
        className="max-w-2xl mx-auto p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <Cloud className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Conectar con Google Drive
            </h2>
            <p className="text-gray-600">
              Conecta tu cuenta de Google Drive para acceder a tus archivos Excel
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">¿Qué puedes hacer?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ver todos tus archivos Excel en Drive</li>
              <li>• Descargar archivos directamente</li>
              <li>• Acceso seguro con tu cuenta de Google</li>
            </ul>
          </div>

          <button
            onClick={() => signIn()}
            className="bg-blue-600 cursor-pointer hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <Cloud className="w-5 h-5" />
            <span>Conectar con Google Drive</span>
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Cloud className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Google Drive</h1>
              <p className="text-gray-600">Archivos Excel conectados</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              onClick={() => {
                clearSelectedFile()
                signOut()
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Files List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Archivos Excel ({files.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando archivos...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No hay archivos Excel</h3>
            <p className="text-gray-600">No se encontraron archivos Excel en tu Google Drive</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {files.map((file, index) => {
              const selected = selectedFile?.id === file.id
              const isValidating = validatingFile === file.id
              const validation = validationResults[file.id]
              const isBlocked = selectedFile && selectedFile.id !== file.id
              
              return (
                <motion.div
                  key={file.id}
                  className={`p-6 transition-colors duration-200 ${
                    selected 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : validation && !validation.isValid
                      ? 'bg-red-50 border-l-4 border-red-500'
                      : isBlocked
                      ? 'bg-gray-100 border-l-4 border-gray-400 opacity-60'
                      : 'hover:bg-gray-50'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        selected ? 'bg-green-200' : 
                        validation && !validation.isValid ? 'bg-red-200' :
                        'bg-green-100'
                      }`}>
                        {validation && !validation.isValid ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <FileSpreadsheet className={`w-5 h-5 ${
                            selected ? 'text-green-700' : 'text-green-600'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-800">{file.name}</h3>
                          {selected && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {validation && validation.isValid && !selected && (
                            <div title="Formato válido">
                              <Shield className="w-5 h-5 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Modificado: {formatDate(file.modifiedTime)}</span>
                          </div>
                        </div>
                        
                        {/* Mostrar resultado de validación */}
                        {validation && (
                          <div className="mt-2">
                            {validation.isValid ? (
                              <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                ✓ Formato válido - Listo para usar
                              </div>
                            ) : (
                              <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                ✗ Formato inválido
                              </div>
                            )}
                            {validation.warnings && Array.isArray(validation.warnings) && validation.warnings.length > 0 && (
                              <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded mt-1">
                                ⚠ {validation.warnings[0]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selected ? (
                        <button
                          onClick={handleDeselectFile}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                        >
                          <span>Deseleccionar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectFile(file)}
                          disabled={isValidating || !!(selectedFile && selectedFile.id !== file.id)}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                          title={selectedFile && selectedFile.id !== file.id ? 'Deselecciona el archivo actual para seleccionar otro' : ''}
                        >
                          {isValidating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Validando...</span>
                            </>
                          ) : selectedFile && selectedFile.id !== file.id ? (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>Bloqueado</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Seleccionar</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Ver en Drive</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
