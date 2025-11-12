import React, { useState, useEffect, useRef } from 'react'
import { User, Users, Clock, MoreHorizontal, FileSpreadsheet, Search } from 'lucide-react'
import { useSelectedFile } from '../../hooks/useSelectedFile'
import { useExcelCache } from '../../contexts/ExcelCacheContext'
import { useStudentsData } from '../../contexts/StudentsDataContext'
import { motion } from 'motion/react'
import { API_BASE_URL } from '../../shared/Api'

export default function New() {
  const { selectedFile, hasSelectedFile } = useSelectedFile()
  const { addRowToCache, ensureCurrentDateRow } = useExcelCache()
  const { 
    students, 
    isLoaded, 
    isLoading: studentsLoading, 
    loadStudents, 
    searchStudents, 
    addStudent, 
    error: studentsError,
    isSyncing,
  } = useStudentsData()
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    matricula: '',
    nombre: '',
    carrera: ''
  })
  
  // Estados para autocompletado
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<any | null>(null)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [isNewStudent, setIsNewStudent] = useState(false)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

  const [todayRegistrations, setTodayRegistrations] = useState<any[]>([])
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false)

  // Estados para búsqueda rápida
  const [quickSearchMatricula, setQuickSearchMatricula] = useState('')
  const [isQuickSearching, setIsQuickSearching] = useState(false)
  const [quickSearchResult, setQuickSearchResult] = useState<any | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [quickSearchMessage, setQuickSearchMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null)

  // Función para obtener los registros de hoy
  const fetchTodayRegistrations = async () => {
    setIsLoadingRegistrations(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/today-registrations`)
      if (response.ok) {
        const data = await response.json()
        setTodayRegistrations(data.registrations || [])
      } else {
        console.error('Error fetching today registrations:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching today registrations:', error)
    } finally {
      setIsLoadingRegistrations(false)
    }
  }


  // Cargar registros al cargar el componente
  useEffect(() => {
    fetchTodayRegistrations();
    
    // Cargar estudiantes si hay archivo seleccionado
    if (hasSelectedFile && !isLoaded && !studentsLoading) {
      loadStudents();
    }
  }, [hasSelectedFile, isLoaded, studentsLoading, loadStudents]);

  // Función para buscar estudiantes (ahora usa el contexto)
  const performSearch = (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    
    // Usar búsqueda en memoria
    const results = searchStudents(query)
    setSuggestions(results)
    setShowSuggestions(results.length > 0)
    setActiveSuggestionIndex(-1)
    
    setIsSearching(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Autocompletado para nombre y matrícula
    if ((name === 'nombre' || name === 'matricula') && value.trim().length >= 2) {
      // Limpiar timeout anterior
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }

      // Establecer nuevo timeout para búsqueda
      const timeout = setTimeout(() => {
        performSearch(value)
      }, 300)
      setSearchTimeout(timeout)
    } else if (name === 'nombre' || name === 'matricula') {
      setSuggestions([])
      setShowSuggestions(false)
    }

    // Marcar como nuevo estudiante si se está escribiendo
    if (name === 'nombre' || name === 'matricula') {
      setIsNewStudent(true)
    }
  }

  // Función para seleccionar una sugerencia
  const selectSuggestion = (student: any) => {
    setFormData({
      nombre: student.nombre || '',
      matricula: student.matricula || '',
      carrera: student.carrera || ''
    })
    setSuggestions([])
    setShowSuggestions(false)
    setIsNewStudent(false)
    setActiveSuggestionIndex(-1)
  }

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent, _fieldName: string) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[activeSuggestionIndex])
        }
        break
      case 'Escape':
        setSuggestions([])
        setShowSuggestions(false)
        setActiveSuggestionIndex(-1)
        break
    }
  }

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.autocomplete-container')) {
        setShowSuggestions(false)
        setActiveSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasSelectedFile || !selectedFile) {
      setRegistrationMessage({
        type: 'error',
        text: 'No hay archivo Excel seleccionado. Ve a Configuración para seleccionar uno.'
      });
      return
    }

    setIsRegistering(true);
    setRegistrationMessage(null);
    
    try {
      // Si es un estudiante nuevo, agregarlo a la memoria
      if (isNewStudent) {
        console.log('🔄 Agregando nuevo estudiante a memoria...')
        const studentData = {
          nombre: formData.nombre.trim(),
          matricula: formData.matricula.trim(),
          carrera: formData.carrera.trim()
        }
        
        // Agregar a memoria (con sincronización automática)
        await addStudent(studentData)
        console.log('✅ Estudiante agregado y sincronizado exitosamente')
      }

      // Obtener hora local actual en formato HH:MM
      const now = new Date();
      const horaEntrada = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // Crear la nueva fila de datos
      const newRowData = [
        formData.nombre.trim(),     // Columna 0: Nombre
        formData.matricula.trim(),  // Columna 1: Número de control
        '',                         // Columna 2: Préstamo (vacío)
        formData.carrera,          // Columna 3: Carrera
        '',                        // Columna 4: Correo (vacío)
        '',                        // Columna 5: Teléfono (vacío)
        horaEntrada                // Columna 6: Hora de entrada
      ];

      // Asegurar que existe la fila de fecha actual antes de agregar el registro
      ensureCurrentDateRow();
      
      // Agregar al caché local (se sincronizará automáticamente)
      addRowToCache(newRowData);

      // Guardar también en la base de datos SQLite
      try {
        console.log('💾 Guardando registro en base de datos...')
        const registrationData = {
          matricula: formData.matricula.trim(),
          nombre: formData.nombre.trim(),
          carrera: formData.carrera.trim(),
          hora_entrada: horaEntrada,
          fecha_registro: new Date().toISOString().split('T')[0],
          tipo_registro: 'Manual',
          file_id: selectedFile?.id || 'local'
        }

        const dbResponse = await fetch(`${API_BASE_URL}/api/students/save-registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData)
        })

        if (dbResponse.ok) {
          const dbData = await dbResponse.json()
          console.log('✅ Registro guardado en BD con ID:', dbData.id)
        } else {
          console.warn('⚠️ Error guardando en BD, pero Excel se actualizó correctamente')
        }
      } catch (dbError) {
        console.warn('⚠️ Error guardando en base de datos:', dbError)
        // No fallar el registro si la BD falla, el Excel se actualizó correctamente
      }

      // Registro exitoso
      const successMessage = isNewStudent 
        ? `¡Nuevo estudiante ${formData.nombre.trim()} agregado y registrado exitosamente a las ${horaEntrada}!`
        : `¡Estudiante ${formData.nombre.trim()} registrado exitosamente a las ${horaEntrada}!`
      
      setRegistrationMessage({
        type: 'success',
        text: successMessage
      });

      // Limpiar formulario después del registro exitoso
      handleClear();

      // Actualizar la lista de registros de hoy
      fetchTodayRegistrations();

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setRegistrationMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Error registrando estudiante:', error);
      setRegistrationMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error desconocido al registrar estudiante'
      });
    } finally {
      setIsRegistering(false);
    }
  }

  const handleClear = () => {
    setFormData({
      matricula: '',
      nombre: '',
      carrera: ''
    })
    setSuggestions([])
    setShowSuggestions(false)
    setIsNewStudent(false)
    setActiveSuggestionIndex(-1)
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
  }

  // Función para búsqueda rápida
  const handleQuickSearch = async () => {
    if (!quickSearchMatricula.trim()) {
      setQuickSearchMessage({
        type: 'error',
        text: 'Por favor ingresa un número de control'
      });
      setTimeout(() => setQuickSearchMessage(null), 3000);
      return;
    }

    setIsQuickSearching(true);
    setQuickSearchMessage(null);
    setQuickSearchResult(null);
    
    try {
      // Buscar en la lista de estudiantes cargados
      const results = searchStudents(quickSearchMatricula.trim());
      
      if (results.length > 0) {
        // Encontrado - mostrar diálogo de confirmación
        const student = results[0];
        setQuickSearchResult(student);
        setShowConfirmDialog(true);
        setQuickSearchMessage({
          type: 'success',
          text: `Estudiante encontrado: ${student.nombre}`
        });
      } else {
        // No encontrado - mostrar mensaje
        setQuickSearchMessage({
          type: 'error',
          text: 'No se encontró ningún estudiante con ese número de control. Procede con el registro manual.'
        });
        // Limpiar campo después de 3 segundos
        setTimeout(() => {
          setQuickSearchMatricula('');
          setQuickSearchMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error en búsqueda rápida:', error);
      setQuickSearchMessage({
        type: 'error',
        text: 'Error al buscar estudiante'
      });
    } finally {
      setIsQuickSearching(false);
    }
  };

  // Función para confirmar registro rápido
  const handleConfirmQuickRegistration = async () => {
    if (!quickSearchResult) return;

    setShowConfirmDialog(false);
    setIsRegistering(true);
    
    try {
      // Obtener hora local actual en formato HH:MM
      const now = new Date();
      const horaEntrada = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // Crear la nueva fila de datos
      const newRowData = [
        quickSearchResult.nombre,     // Columna 0: Nombre
        quickSearchResult.matricula,  // Columna 1: Número de control
        '',                            // Columna 2: Préstamo (vacío)
        quickSearchResult.carrera,    // Columna 3: Carrera
        '',                            // Columna 4: Correo (vacío)
        '',                            // Columna 5: Teléfono (vacío)
        horaEntrada                    // Columna 6: Hora de entrada
      ];

      // Asegurar que existe la fila de fecha actual antes de agregar el registro
      ensureCurrentDateRow();
      
      // Agregar al caché local (se sincronizará automáticamente)
      addRowToCache(newRowData);

      // Guardar también en la base de datos SQLite
      try {
        console.log('💾 Guardando registro en base de datos...');
        const registrationData = {
          matricula: quickSearchResult.matricula,
          nombre: quickSearchResult.nombre,
          carrera: quickSearchResult.carrera,
          hora_entrada: horaEntrada,
          fecha_registro: new Date().toISOString().split('T')[0],
          tipo_registro: 'Búsqueda Rápida',
          file_id: selectedFile?.id || 'local'
        };

        const dbResponse = await fetch(`${API_BASE_URL}/api/students/save-registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData)
        });

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          console.log('✅ Registro guardado en BD con ID:', dbData.id);
        } else {
          console.warn('⚠️ Error guardando en BD, pero Excel se actualizó correctamente');
        }
      } catch (dbError) {
        console.warn('⚠️ Error guardando en base de datos:', dbError);
      }

      // Registro exitoso
      setQuickSearchMessage({
        type: 'success',
        text: `¡Estudiante ${quickSearchResult.nombre} registrado exitosamente a las ${horaEntrada}!`
      });

      // Limpiar campos
      setQuickSearchMatricula('');
      setQuickSearchResult(null);

      // Actualizar la lista de registros de hoy
      fetchTodayRegistrations();

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setQuickSearchMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Error registrando estudiante:', error);
      setQuickSearchMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error desconocido al registrar estudiante'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Función para cancelar registro rápido
  const handleCancelQuickRegistration = () => {
    setShowConfirmDialog(false);
    setQuickSearchMatricula('');
    setQuickSearchResult(null);
    setQuickSearchMessage(null);
  };

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
          Ve a la pestaña de Configuración y selecciona un archivo Excel de Google Drive para poder registrar estudiantes.
        </p>
      </motion.div>
    )
  }

  return (
    <div className='min-h-[calc(100vh-10rem)] p-6 bg-gray-50'>
      {/* Header con información del archivo */}
      <div className='mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-green-100 rounded-lg'>
            <FileSpreadsheet className='w-5 h-5 text-green-600' />
          </div>
          <div className='flex-1'>
            <h2 className='font-semibold text-gray-900'>Archivo Excel Activo</h2>
            <p className='text-sm text-gray-600'>{selectedFile?.name}</p>
          </div>
          <div className='text-right flex items-center gap-3'>
            {studentsLoading ? (
              <div className='flex items-center gap-2 text-blue-600'>
                <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                <span className='text-sm'>Cargando estudiantes...</span>
              </div>
            ) : isLoaded ? (
              <div className='text-sm text-green-600'>
                ✅ {students.length} estudiantes cargados
                {isSyncing && (
                  <span className='ml-2 text-blue-600'>
                    (sincronizando...)
                  </span>
                )}
              </div>
            ) : studentsError ? (
              <div className='text-sm text-red-600'>
                ❌ Error: {studentsError}
              </div>
            ) : (
              <div className='text-sm text-gray-500'>
                Esperando carga...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto'>
        
        {/* Búsqueda Rápida y Registro Manual */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Búsqueda Rápida */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-blue-100 rounded-lg'>
                <Search className='w-6 h-6 text-blue-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Búsqueda Rápida</h2>
                <p className='text-sm text-gray-600'>Busca y registra estudiantes por número de control</p>
              </div>
            </div>

            {/* Mensaje de estado de búsqueda rápida */}
            {quickSearchMessage && (
              <div className={`p-4 rounded-lg mb-4 ${
                quickSearchMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : quickSearchMessage.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                <div className='flex items-center gap-2'>
                  {quickSearchMessage.type === 'success' ? (
                    <div className='w-5 h-5 rounded-full bg-green-500 flex items-center justify-center'>
                      <span className='text-white text-xs'>✓</span>
                    </div>
                  ) : quickSearchMessage.type === 'error' ? (
                    <div className='w-5 h-5 rounded-full bg-red-500 flex items-center justify-center'>
                      <span className='text-white text-xs'>!</span>
                    </div>
                  ) : (
                    <div className='w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center'>
                      <span className='text-white text-xs'>i</span>
                    </div>
                  )}
                  <span className='font-medium'>{quickSearchMessage.text}</span>
                </div>
              </div>
            )}

            {/* Campo de búsqueda */}
            <div className='flex gap-3'>
              <div className='flex-1'>
                <input
                  type='text'
                  value={quickSearchMatricula}
                  onChange={(e) => setQuickSearchMatricula(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickSearch();
                    }
                  }}
                  placeholder='Ingresa el número de control'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg'
                  disabled={isQuickSearching || isRegistering}
                />
              </div>
              <button
                onClick={handleQuickSearch}
                disabled={isQuickSearching || isRegistering || !quickSearchMatricula.trim()}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {isQuickSearching ? (
                  <>
                    <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className='w-5 h-5' />
                    Buscar
                  </>
                )}
              </button>
            </div>

            {/* Diálogo de confirmación */}
            {showConfirmDialog && quickSearchResult && (
              <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <div className='mb-3'>
                  <h3 className='font-semibold text-gray-900 mb-2'>Estudiante Encontrado</h3>
                  <div className='space-y-1 text-sm'>
                    <p><span className='font-medium'>Nombre:</span> {quickSearchResult.nombre}</p>
                    <p><span className='font-medium'>Matrícula:</span> {quickSearchResult.matricula}</p>
                    <p><span className='font-medium'>Carrera:</span> {quickSearchResult.carrera}</p>
                  </div>
                </div>
                <div className='flex gap-3'>
                  <button
                    onClick={handleConfirmQuickRegistration}
                    disabled={isRegistering}
                    className='flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                  >
                    {isRegistering ? (
                      <>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        Registrando...
                      </>
                    ) : (
                      '¿Registrar entrada?'
                    )}
                  </button>
                  <button
                    onClick={handleCancelQuickRegistration}
                    disabled={isRegistering}
                    className='flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Registro Manual */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='p-2 bg-green-100 rounded-lg'>
                <User className='w-6 h-6 text-green-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Registro Manual</h2>
                <button className='p-1 text-gray-400 hover:text-gray-600'>
                  <MoreHorizontal className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Mensaje de estado */}
            {registrationMessage && (
              <div className={`p-4 rounded-lg mb-4 ${
                registrationMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className='flex items-center gap-2'>
                  {registrationMessage.type === 'success' ? (
                    <div className='w-5 h-5 rounded-full bg-green-500 flex items-center justify-center'>
                      <span className='text-white text-xs'>✓</span>
                    </div>
                  ) : (
                    <div className='w-5 h-5 rounded-full bg-red-500 flex items-center justify-center'>
                      <span className='text-white text-xs'>!</span>
                    </div>
                  )}
                  <span className='font-medium'>{registrationMessage.text}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Campo Nombre con Autocompletado */}
              <div className='autocomplete-container relative'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nombre Completo
                  {isNewStudent && (
                    <span className='ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>
                      Nuevo estudiante
                    </span>
                  )}
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    name='nombre'
                    value={formData.nombre}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'nombre')}
                    placeholder='Ej. Juan Pérez García'
                    className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                    autoComplete='off'
                  />
                  {isSearching && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                    </div>
                  )}
                  {!isSearching && (formData.nombre.length >= 2 || formData.matricula.length >= 2) && (
                    <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                  )}
                </div>
                
                {/* Lista de Sugerencias */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {suggestions.map((student, index) => (
                      <div
                        key={`${student.matricula}-${index}`}
                        ref={el => { suggestionRefs.current[index] = el }}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 ${
                          index === activeSuggestionIndex ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => selectSuggestion(student)}
                      >
                        <div className='flex items-center justify-between'>
                          <div>
                            <div className='font-medium text-gray-900'>{student.nombre}</div>
                            <div className='text-sm text-gray-600'>Mat. {student.matricula}</div>
                            {student.carrera && (
                              <div className='text-xs text-gray-500'>{student.carrera}</div>
                            )}
                          </div>
                          <div className='text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded'>
                            Seleccionar
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campo Matrícula con Autocompletado */}
              <div className='autocomplete-container relative'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Número de Control
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    name='matricula'
                    value={formData.matricula}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'matricula')}
                    placeholder='Ej. 2023001234'
                    className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                    autoComplete='off'
                  />
                  {isSearching && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Carrera
                </label>
                <input
                  type='text'
                  name='carrera'
                  value={formData.carrera}
                  onChange={handleInputChange}
                  placeholder='Ej. Sistemas Computacionales'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  type='submit'
                  disabled={isRegistering}
                  className='flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                >
                  {isRegistering ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                      Registrando...
                    </>
                  ) : (
                    'Registrar Entrada'
                  )}
                </button>
                <button
                  type='button'
                  onClick={handleClear}
                  disabled={isRegistering}
                  className='px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Registros de Hoy */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-purple-100 rounded-lg'>
                <Users className='w-5 h-5 text-purple-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Registros de Hoy</h2>
                <p className='text-sm text-gray-600'>{todayRegistrations.length} estudiantes registrados</p>
              </div>
            </div>
            
          </div>

          {/* Contenedor con altura fija y scroll */}
          <div className='h-5/6 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50'>
            <div className='p-4 space-y-4'>
              {isLoadingRegistrations ? (
                <div className='flex items-center justify-center py-6'>
                  <div className='w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin'></div>
                  <span className='ml-2 text-gray-600 text-sm'>Cargando registros...</span>
                </div>
              ) : todayRegistrations.length === 0 ? (
                <div className='text-center py-6 text-gray-500'>
                  <Users className='w-8 h-8 mx-auto mb-2 text-gray-300' />
                  <p className='text-sm'>No hay registros para hoy</p>
                  <p className='text-xs'>Los registros aparecerán aquí cuando se hagan</p>
                </div>
              ) : (
                todayRegistrations.map((student) => (
                  <div key={student.id} className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm'>
                    <div className='flex justify-between items-center mb-2'>
                      <h3 className='font-medium text-gray-900'>{student.nombre}</h3>
                      <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 text-gray-400' />
                        <span className='text-sm text-gray-600'>{student.hora_entrada}</span>
                      </div>
                    </div>
                    <div className='text-sm text-gray-600 space-y-1'>
                      <p>Mat. {student.matricula}</p>
                      <p className='truncate'>{student.carrera}</p>
                    </div>
                    <div className='mt-2 flex justify-between items-center'>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        student.tipo_registro === 'QR/Código' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {student.tipo_registro}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
