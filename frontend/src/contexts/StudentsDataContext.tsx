import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { API_BASE_URL } from '../shared/Api'

interface StudentRecord {
  matricula: string
  nombre: string
  carrera: string
  rowIndex?: number
  [key: string]: any
}

interface StudentsDataContextType {
  students: StudentRecord[]
  isLoaded: boolean
  isLoading: boolean
  loadStudents: () => Promise<void>
  searchStudents: (query: string) => StudentRecord[]
  addStudent: (student: Omit<StudentRecord, 'rowIndex'>) => Promise<void>
  getStudentByMatricula: (matricula: string) => StudentRecord | undefined
  studentsCount: number
  error: string | null
  syncToExcel: () => Promise<void>
  isSyncing: boolean
  hasUnsyncedChanges: boolean
}

const StudentsDataContext = createContext<StudentsDataContextType | undefined>(undefined)

export function StudentsDataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false)

  const loadStudents = useCallback(async () => {
    if (isLoading || isLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Cargando estudiantes desde Excel...')
      
      const response = await fetch(`${API_BASE_URL}/api/students/load-excel`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error cargando estudiantes')
      }

      const data = await response.json()
      console.log('✅ Estudiantes cargados:', data.data.studentsCount)
      
      setStudents(data.data.students)
      setIsLoaded(true)

    } catch (err) {
      console.error('❌ Error cargando estudiantes:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isLoaded])

  const searchStudents = useCallback((query: string): StudentRecord[] => {
    if (!query || query.trim().length < 2) return []

    const queryLower = query.toLowerCase().trim()
    
    return students
      .filter(student => {
        const nombreMatch = student.nombre.toLowerCase().includes(queryLower)
        const matriculaMatch = student.matricula.toLowerCase().includes(queryLower)
        return nombreMatch || matriculaMatch
      })
      .map(student => ({
        ...student,
        relevance: student.nombre.toLowerCase().startsWith(queryLower) ? 3 :
                  student.nombre.toLowerCase().includes(queryLower) ? 2 :
                  student.matricula.toLowerCase().startsWith(queryLower) ? 1 : 0.5
      }))
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, 10)
  }, [students])

  const addStudent = useCallback(async (newStudent: Omit<StudentRecord, 'rowIndex'>) => {
    // Verificar si ya existe
    const exists = students.some(s => s.matricula === newStudent.matricula)
    if (exists) {
      console.warn('El estudiante ya existe:', newStudent.matricula)
      return
    }

    console.log('➕ Agregando nuevo estudiante a memoria:', newStudent)
    
    const studentWithIndex: StudentRecord = {
      matricula: newStudent.matricula,
      nombre: newStudent.nombre,
      carrera: newStudent.carrera,
      rowIndex: students.length + 1 // Asignar nuevo índice
    }
    
    // Agregar a memoria
    setStudents(prev => [...prev, studentWithIndex])
    
    // Sincronizar automáticamente al Excel
    console.log('🔄 Sincronizando automáticamente al Excel...')
    setIsSyncing(true)
    
    try {
      const updatedStudents = [...students, studentWithIndex]
      
      const response = await fetch(`${API_BASE_URL}/api/students/sync-to-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ students: updatedStudents })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Sincronización automática exitosa:', data)
        setHasUnsyncedChanges(false)
      } else {
        const errorData = await response.json()
        console.warn('⚠️ Error en sincronización automática:', errorData)
        setHasUnsyncedChanges(true)
        setError('Error sincronizando: ' + (errorData.error || 'Error desconocido'))
      }
    } catch (syncError) {
      console.warn('⚠️ Error sincronizando automáticamente:', syncError)
      setHasUnsyncedChanges(true)
      setError('Error de conexión durante sincronización')
    } finally {
      setIsSyncing(false)
    }
  }, [students])

  const getStudentByMatricula = useCallback((matricula: string): StudentRecord | undefined => {
    return students.find(s => s.matricula === matricula)
  }, [students])

  const syncToExcel = useCallback(async () => {
    if (isSyncing || !hasUnsyncedChanges) return

    setIsSyncing(true)
    setError(null)

    try {
      console.log('🔄 Sincronizando estudiantes al Excel...')
      
      const response = await fetch(`${API_BASE_URL}/api/students/sync-to-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ students })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error sincronizando al Excel')
      }

      const data = await response.json()
      console.log('✅ Sincronización exitosa:', data)
      
      setHasUnsyncedChanges(false)

    } catch (err) {
      console.error('❌ Error sincronizando:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSyncing(false)
    }
  }, [students, isSyncing, hasUnsyncedChanges])

  return (
    <StudentsDataContext.Provider value={{
      students,
      isLoaded,
      isLoading,
      loadStudents,
      searchStudents,
      addStudent,
      getStudentByMatricula,
      studentsCount: students.length,
      error,
      syncToExcel,
      isSyncing,
      hasUnsyncedChanges
    }}>
      {children}
    </StudentsDataContext.Provider>
  )
}

export function useStudentsData() {
  const context = useContext(StudentsDataContext)
  if (context === undefined) {
    throw new Error('useStudentsData must be used within a StudentsDataProvider')
  }
  return context
}
