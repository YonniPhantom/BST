# Configuración de Autenticación en el Backend

## 🚨 Error Actual
Si ves el error "Error al obtener URL de autenticación", significa que el backend no tiene las credenciales de Google OAuth configuradas.

## 🔧 Solución Rápida

### 1. Crear archivo .env
```bash
cd backend
cp .env.example .env
```

### 2. Configurar credenciales en .env
Edita el archivo `.env` con tus credenciales reales:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=572110142649-j36luh3d4srbsecbbnflgi2dbfk0rl6m.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# JWT Configuration
JWT_SECRET=tu_jwt_secret_super_seguro_aqui

# Database Configuration
DB_PATH=./data/app.db
```

### 3. Verificar configuración
```bash
node check-config.js
```

### 4. Reiniciar el backend
```bash
npm run dev
```

## 🔍 Verificar que funciona

1. **Backend corriendo**: http://localhost:3001
2. **Endpoint de auth**: http://localhost:3001/api/auth/google/url
3. **Debería devolver**: `{"authUrl": "https://accounts.google.com/..."}`

## 🌐 Configuración en Google Cloud Console

Asegúrate de que en Google Cloud Console tengas configurado:

**URIs de redirección autorizadas:**
- `http://localhost:3001/api/auth/callback/google`

**NO uses:**
- `http://localhost:5173/auth/callback` (esto es para el frontend)

## 🔄 Flujo de Autenticación Correcto

1. Frontend solicita URL → `GET /api/auth/google/url`
2. Usuario autoriza en Google → Redirige a `http://localhost:3001/api/auth/callback/google`
3. Backend procesa callback → `POST /api/auth/google/callback`
4. Backend devuelve JWT → Frontend guarda token

## 🐛 Troubleshooting

### Error: "GOOGLE_CLIENT_ID no está configurado"
- Verifica que el archivo `.env` existe en `/backend/`
- Verifica que las variables no tengan valores por defecto
- Reinicia el servidor después de cambiar `.env`

### Error: "redirect_uri_mismatch"
- Verifica que `GOOGLE_REDIRECT_URI` sea exactamente: `http://localhost:3001/api/auth/callback/google`
- Verifica que esta URI esté configurada en Google Cloud Console

### Error de CORS
- El backend ya tiene CORS configurado para `origin: '*'`
- Si persiste, verifica que el frontend use `http://localhost:3001` como `VITE_API_BASE_URL`
