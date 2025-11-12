# Configuración de Autenticación con Google OAuth

Este proyecto ahora usa un sistema de autenticación personalizado con Google OAuth en lugar de NextAuth.js, ya que es más compatible con Vite + React + Electron.

## Configuración Requerida

### 1. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Drive API** y **Google+ API**
4. Ve a **Credenciales** > **Crear credenciales** > **ID de cliente OAuth 2.0**
5. Configura las URIs de redirección autorizadas:
   - `http://localhost:5173/auth/callback` (para desarrollo)
   - Agrega otras URIs según tus necesidades

### 2. Variables de Entorno

Copia el archivo `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Google:

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_de_google
VITE_GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Permisos de Google Drive

El sistema solicita los siguientes permisos:
- `openid`: Identificación básica
- `profile`: Información del perfil
- `email`: Dirección de email
- `https://www.googleapis.com/auth/drive.readonly`: Lectura de archivos de Drive
- `https://www.googleapis.com/auth/drive.file`: Escritura de archivos creados por la app

## Cómo Funciona

### Flujo de Autenticación

1. **Inicio de sesión**: El usuario hace clic en "Conectar con Google Drive"
2. **Redirección**: Se abre Google OAuth en el navegador
3. **Autorización**: El usuario autoriza los permisos
4. **Callback**: Google redirige a `/auth/callback` con un código
5. **Intercambio**: El código se intercambia por tokens de acceso
6. **Almacenamiento**: Los tokens se guardan en localStorage
7. **Redirección**: El usuario es redirigido al dashboard

### Componentes Principales

- **AuthContext**: Maneja el estado de autenticación global
- **AuthCallback**: Página que procesa la respuesta de Google
- **Drive**: Componente que lista archivos de Google Drive

### Hooks Disponibles

```typescript
import { useAuth, useSession } from '../contexts/AuthContext'

// Hook principal
const { user, isAuthenticated, signIn, signOut } = useAuth()

// Hook compatible con next-auth (para migración gradual)
const { data: session, status } = useSession()
```

## Migración desde NextAuth

Los componentes existentes que usan `next-auth/react` han sido actualizados para usar el nuevo sistema. La API es compatible:

```typescript
// Antes (NextAuth)
import { useSession, signIn, signOut } from 'next-auth/react'

// Después (Sistema personalizado)
import { useSession, signIn, signOut } from '../contexts/AuthContext'
```

## Desarrollo

Para desarrollo local:

1. Asegúrate de que el backend esté corriendo en puerto 3001
2. Inicia la aplicación: `npm run dev`
3. La aplicación estará disponible en `http://localhost:5173`

## Producción

Para producción, actualiza las variables de entorno y las URIs de redirección en Google Cloud Console con tus dominios de producción.

## Troubleshooting

### Error: "GOOGLE_CLIENT_ID no está configurado"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de cambiar `.env`

### Error: "redirect_uri_mismatch"
- Verifica que la URI de redirección en Google Cloud Console coincida exactamente con `VITE_GOOGLE_REDIRECT_URI`

### Error: "access_denied"
- El usuario canceló la autorización o hay un problema con los permisos solicitados
