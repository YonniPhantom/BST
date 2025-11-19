import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: () => Promise<void>
  signOut: () => void
  refreshAccessToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Configuración de API
import { API_BASE_URL } from '../shared/Api'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar usuario del localStorage al inicializar
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Función para iniciar sesión con Google
  const signIn = async () => {
    try {
      // Obtener la URL de autenticación del backend
      const response = await fetch(`${API_BASE_URL}/api/auth/google/url`)
      if (!response.ok) {
        throw new Error('Error al obtener URL de autenticación')
      }
      
      const { authUrl } = await response.json()

      // En Electron, usar el flujo OAuth con ventana modal
      if (window.electronAPI && (window.electronAPI as any).startOAuth) {
        console.log('🔵 Starting OAuth flow in Electron...')
        const result = await (window.electronAPI as any).startOAuth(authUrl)
        console.log('🔵 OAuth result:', result)
        
        if (result.success) {
          const { data } = result
          console.log('🔵 OAuth data:', data)
          
          // Si recibimos token y user directamente (del backend)
          if (data.token && data.user) {
            console.log('🔵 Received token and user directly')
            const user = {
              ...data.user,
              accessToken: data.token,
              refreshToken: data.token
            }
            setUser(user)
            localStorage.setItem('auth_user', JSON.stringify(user))
            return
          }
          
          // Si recibimos solo el código, intercambiarlo por tokens
          if (data.code) {
            console.log('🔵 Received code, exchanging for tokens...')
            const success = await handleAuthCallback(data.code)
            console.log('🔵 Token exchange result:', success)
            if (!success) {
              throw new Error('Error procesando autenticación')
            }
          }
        } else {
          console.error('🔴 OAuth failed:', result.error)
          throw new Error(result.error || 'Error en autenticación')
        }
      } else {
        // En navegador web, redirigir
        window.location.href = authUrl
      }
    } catch (error) {
      console.error('Error iniciando sesión:', error)
      throw error
    }
  }

  // Función para cerrar sesión
  const signOut = () => {
    setUser(null)
    
    // Limpiar datos de autenticación
    localStorage.removeItem('auth_user')
    localStorage.removeItem('selectedExcelFile')
    
    // Limpiar TODOS los cachés de Excel (pueden ser de otra cuenta)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('excel_cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log('🧹 Sesión cerrada y caché limpiado')
  }

  // Función para refrescar el token de acceso
  const refreshAccessToken = async () => {
    if (!user?.refreshToken) {
      signOut()
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: user.accessToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        // El backend devuelve un nuevo JWT completo
        const updatedUser = {
          ...user,
          accessToken: data.token,
          refreshToken: data.token // El nuevo JWT contiene tanto access como refresh token
        }
        setUser(updatedUser)
        localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      } else {
        console.error('Error refreshing token')
        signOut()
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      signOut()
    }
  }

  // Función para manejar el callback de autenticación
  const handleAuthCallback = async (code: string) => {
    try {
      console.log('🔵 Exchanging code for tokens...', code.substring(0, 20) + '...')
      
      // Primero probar el endpoint de test
      console.log('🔵 Testing POST endpoint...')
      const testResponse = await fetch(`${API_BASE_URL}/api/auth/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      })
      console.log('🔵 Test response status:', testResponse.status)
      const testData = await testResponse.json()
      console.log('🔵 Test response data:', testData)
      
      const response = await fetch(`${API_BASE_URL}/api/auth/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })

      console.log('🔵 Response status:', response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log('🔵 User data received:', userData)
        const user = {
          id: userData.user.id,
          email: userData.user.email,
          name: userData.user.name,
          picture: userData.user.picture,
          accessToken: userData.token, // El backend devuelve el JWT como token
          refreshToken: userData.token // Usar el mismo token para refresh
        }
        console.log('✅ Setting user:', user)
        setUser(user)
        localStorage.setItem('auth_user', JSON.stringify(user))
        return true
      } else {
        const errorText = await response.text()
        console.error('🔴 Error in auth callback:', response.status, errorText)
        return false
      }
    } catch (error) {
      console.error('🔴 Error in auth callback:', error)
      return false
    }
  }

  // Exponer handleAuthCallback globalmente para el callback
  useEffect(() => {
    (window as any).handleAuthCallback = handleAuthCallback
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshAccessToken
  }

  // Exponer signOut globalmente para otros contextos
  useEffect(() => {
    (window as any).__authContext = { signOut }
  }, [])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook para compatibilidad con next-auth (para migración gradual)
export function useSession() {
  const { user, isLoading } = useAuth()
  
  return {
    data: user ? { user } : null,
    status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated'
  }
}

// Funciones de compatibilidad con next-auth - NO USAR, usar hooks dentro de componentes
// Estas funciones están aquí solo para compatibilidad, pero no funcionan correctamente
// Usa useAuth() dentro de tus componentes en su lugar
