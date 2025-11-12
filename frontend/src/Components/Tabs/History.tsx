import { useState, useEffect } from 'react'
import { Search, Filter, Clock, User, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '../../shared/Api'

interface HistoryRecord {
  id: number
  matricula: string
  nombre: string
  carrera: string
  hora_entrada: string
  fecha_registro: string
  tipo_registro: string
  file_id: string
  created_at: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalRecords: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function History() {
  console.log('🎯 History component rendering, API_BASE_URL:', API_BASE_URL)
  
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 50,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    tipoRegistro: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  // Fetch history data
  const fetchHistory = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      // Agregar filtros solo si tienen valor
      if (filters.search) params.append('search', filters.search)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.tipoRegistro) params.append('tipoRegistro', filters.tipoRegistro)
      
      const endpoint = `${API_BASE_URL}/api/students/history?${params}`
      
      console.log('📅 Cargando registros desde:', endpoint)
      console.log('🔍 Filtros aplicados:', filters)
      
      const response = await fetch(endpoint)
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Datos recibidos:', data)
        console.log('📋 Registros:', data.registrations?.length || 0)
        console.log('📄 Paginación:', data.pagination)
        
        if (data.registrations && Array.isArray(data.registrations)) {
          setRecords(data.registrations)
          console.log('✅ Records set successfully:', data.registrations.length)
        } else {
          console.warn('⚠️ No registrations array in response')
          setRecords([])
        }
        
        if (data.pagination) {
          setPagination(data.pagination)
          console.log('✅ Pagination set successfully')
        } else {
          console.warn('⚠️ No pagination in response')
          setPagination({ 
            currentPage: 1, 
            totalPages: 1, 
            totalRecords: 0, 
            limit: 50,
            hasNextPage: false,
            hasPrevPage: false
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Error fetching history:', response.status, response.statusText, errorData)
      }
    } catch (error) {
      console.error('❌ Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount and when filters change
  useEffect(() => {
    console.log('🔄 History component mounted or filters changed')
    fetchHistory(1)
  }, [filters.search, filters.dateFrom, filters.dateTo, filters.tipoRegistro])

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchHistory(newPage)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      tipoRegistro: ''
    })
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format datetime for display
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className='min-h-[calc(100vh-10rem)] p-6 bg-gray-50'>
      {/* Header */}
      <div className='mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <Clock className='w-6 h-6 text-blue-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                Historial de Registros
              </h1>
              <p className='text-gray-600'>
                {pagination.totalRecords} registros totales
              </p>
            </div>
          </div>
          
          <div className='flex items-center gap-3'>
            <button
              onClick={() => fetchHistory(pagination.currentPage)}
              disabled={isLoading}
              className='flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50'
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200'
            >
              <Filter className='w-4 h-4' />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className='mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Search */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Buscar
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder='Nombre, matrícula o carrera...'
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Fecha desde
              </label>
              <input
                type='date'
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            {/* Date To */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Fecha hasta
              </label>
              <input
                type='date'
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            {/* Registration Type */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Tipo de registro
              </label>
              <select
                value={filters.tipoRegistro}
                onChange={(e) => handleFilterChange('tipoRegistro', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value=''>Todos</option>
                <option value='Manual'>Manual</option>
                <option value='Búsqueda Rápida'>Búsqueda Rápida</option>
                <option value='QR'>QR</option>
                <option value='QR/Código'>QR/Código</option>
              </select>
            </div>
          </div>

          <div className='mt-4 flex justify-end'>
            <button
              onClick={clearFilters}
              className='px-4 py-2 text-gray-600 hover:text-gray-800'
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
            <span className='ml-3 text-gray-600'>Cargando historial...</span>
          </div>
        ) : records.length === 0 ? (
          <div className='text-center py-12 text-gray-500'>
            <Clock className='w-16 h-16 mx-auto mb-4 text-gray-300' />
            <p className='text-lg'>No se encontraron registros</p>
            <p className='text-sm'>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Estudiante
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Matrícula
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Carrera
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Fecha
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Hora
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Tipo
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Registrado
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {records.map((record) => (
                    <tr key={record.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='p-2 bg-gray-100 rounded-full mr-3'>
                            <User className='w-4 h-4 text-gray-600' />
                          </div>
                          <div className='font-medium text-gray-900'>
                            {record.nombre}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        {record.matricula}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-600 max-w-xs truncate'>
                        {record.carrera}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        {formatDate(record.fecha_registro)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        <div className='flex items-center'>
                          <Clock className='w-4 h-4 text-gray-400 mr-1' />
                          {record.hora_entrada}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.tipo_registro === 'QR' || record.tipo_registro === 'QR/Código'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {record.tipo_registro}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        {formatDateTime(record.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between'>
              <div className='flex-1 flex justify-between sm:hidden'>
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Siguiente
                </button>
              </div>
              
              <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                <div>
                  <p className='text-sm text-gray-700'>
                    Mostrando{' '}
                    <span className='font-medium'>
                      {((pagination.currentPage - 1) * pagination.limit) + 1}
                    </span>{' '}
                    a{' '}
                    <span className='font-medium'>
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
                    </span>{' '}
                    de{' '}
                    <span className='font-medium'>{pagination.totalRecords}</span>{' '}
                    resultados
                  </p>
                </div>
                
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className='relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>
                  
                  <span className='text-sm text-gray-700'>
                    Página {pagination.currentPage} de {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className='relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md'
                  >
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
