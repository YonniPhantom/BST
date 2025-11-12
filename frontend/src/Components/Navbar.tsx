import { BookOpenIcon, CalendarDays, CircleCheckBig, FileSpreadsheet, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useSelectedFile } from '../hooks/useSelectedFile'
import { useSave } from '../contexts/SaveContext'
import SyncStatus from './SyncStatus'

export default function Navbar() {
  const { selectedFile, hasSelectedFile } = useSelectedFile()
  
  // Usar el contexto de guardado de forma opcional
  let saveContext
  try {
    saveContext = useSave()
  } catch (error) {
    // Si no hay SaveProvider, usar valores por defecto
    saveContext = {
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      saveError: null
    }
  }
  
  const { isSaving, lastSaved, hasUnsavedChanges, saveError } = saveContext

  const formatLastSaved = (date: Date | null) => {
    if (!date) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Guardado hace unos segundos'
    if (minutes === 1) return 'Guardado hace 1 minuto'
    if (minutes < 60) return `Guardado hace ${minutes} minutos`
    
    return `Guardado a las ${date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`
  }

  const getSaveStatus = () => {
    if (saveError) {
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        text: 'Error al guardar',
        className: 'text-red-600 bg-red-50'
      }
    }
    
    if (isSaving) {
      return {
        icon: <Save className="w-4 h-4 text-blue-500 animate-pulse" />,
        text: 'Guardando...',
        className: 'text-blue-600 bg-blue-50'
      }
    }
    
    if (hasUnsavedChanges) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        text: 'Cambios sin guardar',
        className: 'text-yellow-600 bg-yellow-50'
      }
    }
    
    if (lastSaved) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        text: formatLastSaved(lastSaved),
        className: 'text-green-600 bg-green-50'
      }
    }
    
    return null
  }

  const saveStatus = getSaveStatus()
  
  return (
    <div className='flex justify-between items-center bg-white border-b-2 border-gray-200 h-20 px-20'>
        <div className='flex items-center gap-2'>
            <div className='bg-[#005B9F] h-[40px] w-[40px] rounded-md flex items-center justify-center'>
                <BookOpenIcon color='white' size={24}/>
            </div>
            <div>
                <h1 className='text-xl font-bold'>Sistema de Registro Bibliotecario</h1>
                <div className="flex items-center gap-4">
                    <span className='text-sm text-gray-500'>Control de acceso estudiantil</span>
                    
                    {hasSelectedFile && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">
                          {selectedFile?.name}
                        </span>
                        <CircleCheckBig className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    
                    {/* Estado de guardado */}
                    {hasSelectedFile && saveStatus && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${saveStatus.className}`}>
                        {saveStatus.icon}
                        <span>{saveStatus.text}</span>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <div className='flex items-center gap-4'>
            {/* Estado de sincronización */}
            {hasSelectedFile && (
              <div className='flex items-center gap-2 border border-gray-200 rounded-md p-2'>
                <SyncStatus />
              </div>
            )}
            
            <div className='flex items-center gap-2'>
                <CircleCheckBig size={20} color='#00C951'/>
            </div>
            <div className='flex items-center gap-2 border border-gray-200 rounded-md p-2'>
                <CalendarDays size={18} />
                <span className='text-sm text-black'>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
        </div>
    </div>
  )
}
