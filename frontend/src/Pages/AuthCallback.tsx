import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { exchangeCodeForTokens } from '../api/auth'
import Loading from '../Components/Loading'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Procesando autenticación...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener parámetros de la URL (compatible con HashRouter)
        // En HashRouter: http://localhost:3001/app/#/auth/callback?code=...
        const hash = window.location.hash
        const queryString = hash.includes('?') ? hash.split('?')[1] : ''
        const urlParams = new URLSearchParams(queryString)

        const code = urlParams.get('code')
        const error = urlParams.get('error')
        const token = urlParams.get('token')
        const userParam = urlParams.get('user')

        if (error) {
          setStatus('error')
          setMessage(`Error de autenticación: ${error}`)
          return
        }

        // Si ya tenemos el token y usuario (del endpoint GET), usarlos directamente
        if (token && userParam) {
          try {
            const userData = JSON.parse(decodeURIComponent(userParam))
            const user = {
              ...userData,
              accessToken: token,
              refreshToken: token
            }

            // Guardar usuario en localStorage
            localStorage.setItem('auth_user', JSON.stringify(user))

            setStatus('success')
            setMessage('¡Autenticación exitosa! Redirigiendo...')

            // Redirigir al dashboard después de un breve delay
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
            return
          } catch (parseError) {
            console.error('Error parsing user data:', parseError)
            // Continuar con el flujo normal usando el código
          }
        }

        if (!code) {
          setStatus('error')
          setMessage('No se recibió código de autorización')
          return
        }

        setMessage('Intercambiando código por tokens...')

        // Intercambiar código por tokens (flujo original)
        const user = await exchangeCodeForTokens(code)

        if (!user) {
          setStatus('error')
          setMessage('Error al obtener información del usuario')
          return
        }

        // Guardar usuario en localStorage
        localStorage.setItem('auth_user', JSON.stringify(user))

        setStatus('success')
        setMessage('¡Autenticación exitosa! Redirigiendo...')

        // Redirigir al dashboard después de un breve delay
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)

      } catch (error) {
        console.error('Error in auth callback:', error)
        setStatus('error')
        setMessage('Error procesando autenticación')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loading size="lg" text={message} />
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Autenticación Exitosa!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Error de Autenticación</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}
