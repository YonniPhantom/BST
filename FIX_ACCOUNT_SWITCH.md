# 🔧 Fix: Error al Cambiar de Cuenta de Google Drive

## 🐛 Problema Identificado

Cuando el usuario cambia de cuenta de Google Drive:
1. El token de acceso de la cuenta anterior queda almacenado en `localStorage`
2. Los cachés de Excel de la cuenta anterior permanecen en `localStorage`
3. Al intentar sincronizar con la nueva cuenta, el token antiguo no tiene permisos
4. Resultado: **"Failed to sync with Google Drive"** con error 403 (Access Denied)

## ✅ Solución Implementada

### 1. Limpieza Completa al Cerrar Sesión

**Archivo:** `frontend/src/contexts/AuthContext.tsx`

- Ahora `signOut()` limpia **todos los cachés de Excel** además de los datos de autenticación
- Busca todas las claves que empiecen con `excel_cache_` y las elimina
- Garantiza que no queden datos de la cuenta anterior

```typescript
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
```

### 2. Detección de Errores de Permisos

**Archivo:** `backend/routes/drive.js`

- Mejorado el manejo de errores 401, 403 y 404
- Mensajes específicos para cada tipo de error:
  - **401**: Token expirado o inválido
  - **403**: Sin permisos (token de otra cuenta)
  - **404**: Archivo no encontrado

```javascript
// 401: Token inválido o expirado
if (error.code === 401 || error.status === 401) {
  return res.status(401).json({
    error: 'Authentication expired or invalid. Please sign out and sign in again.',
    code: 'AUTH_EXPIRED',
    message: error.message
  });
}

// 403: Sin permisos (puede ser token de otra cuenta)
if (error.code === 403 || error.status === 403) {
  return res.status(403).json({
    error: 'Access denied. This file may belong to a different account. Please sign out and sign in with the correct account.',
    code: 'ACCESS_DENIED',
    message: error.message
  });
}
```

### 3. Logout Automático en Errores de Permisos

**Archivos:** 
- `frontend/src/contexts/ExcelCacheContext.tsx`
- `frontend/src/Components/Drive.tsx`

- Detecta errores 401/403 en las peticiones a Drive
- Cierra sesión automáticamente cuando detecta token inválido o sin permisos
- Muestra alerta al usuario explicando el problema

```typescript
// Si es error 401 o 403, el token es inválido o de otra cuenta
if (syncResponse.status === 401 || syncResponse.status === 403) {
  console.error('🚨 Token inválido o sin permisos. Cerrando sesión...')
  
  // Mostrar alerta al usuario
  Swal.fire({
    icon: 'error',
    title: 'Sesión inválida',
    text: syncResponse.status === 403 
      ? 'Este archivo pertenece a otra cuenta de Google. Por favor, cierra sesión e inicia sesión con la cuenta correcta.'
      : 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    confirmButtonText: 'Cerrar sesión',
    allowOutsideClick: false
  }).then(() => {
    signOut()
  })
}
```

### 4. Contexto Global de Autenticación

**Archivo:** `frontend/src/contexts/AuthContext.tsx`

- Expone `signOut()` globalmente para que otros contextos puedan acceder
- Permite que `ExcelCacheContext` cierre la sesión cuando detecta errores

```typescript
// Exponer signOut globalmente para otros contextos
useEffect(() => {
  (window as any).__authContext = { signOut }
}, [])
```

## 🔄 Flujo Corregido

### Antes (Con Bug):
1. Usuario inicia sesión con Cuenta A
2. Selecciona archivo y trabaja normalmente
3. Usuario cierra sesión
4. Usuario inicia sesión con Cuenta B
5. **BUG**: Token de Cuenta A sigue en caché
6. **BUG**: Cachés de Excel de Cuenta A siguen en localStorage
7. Al sincronizar: Error 403 (token de Cuenta A no tiene permisos en archivos de Cuenta B)

### Después (Corregido):
1. Usuario inicia sesión con Cuenta A
2. Selecciona archivo y trabaja normalmente
3. Usuario cierra sesión
4. **✅ Se limpian todos los cachés y tokens**
5. Usuario inicia sesión con Cuenta B
6. **✅ Token nuevo de Cuenta B**
7. **✅ Sin cachés de Cuenta A**
8. Al sincronizar: ✅ Funciona correctamente

## 📋 Archivos Modificados

1. `frontend/src/contexts/AuthContext.tsx`
   - Limpieza completa de cachés en `signOut()`
   - Exposición global de `signOut()`

2. `backend/routes/drive.js`
   - Mejor manejo de errores 401/403/404
   - Mensajes específicos para cada error

3. `frontend/src/contexts/ExcelCacheContext.tsx`
   - Detección de errores 401/403
   - Logout automático con alerta al usuario

4. `frontend/src/Components/Drive.tsx`
   - Detección de error 403
   - Logout automático

## 🧪 Cómo Probar

1. Inicia sesión con una cuenta de Google (Cuenta A)
2. Selecciona un archivo de Excel
3. Haz algunos cambios y sincroniza
4. Cierra sesión
5. Inicia sesión con otra cuenta de Google (Cuenta B)
6. Selecciona un archivo de Excel de la Cuenta B
7. Haz cambios y sincroniza
8. **Resultado esperado**: ✅ Sincronización exitosa sin errores

## 🚀 Para Aplicar los Cambios

```powershell
# 1. Reconstruir frontend
cd frontend
npm run build

# 2. Reconstruir launcher
cd ..\launcher
npm run build:win
```

El nuevo instalador estará en `launcher\dist\BST Setup 1.0.0.exe`

## 💡 Notas Importantes

- **Siempre cierra sesión** antes de cambiar de cuenta de Google
- Si ves el error "Access denied", cierra sesión manualmente y vuelve a iniciar sesión
- Los cachés se limpian automáticamente al cerrar sesión
- El sistema ahora detecta automáticamente cuando el token es de otra cuenta

## 🔍 Logs para Debugging

Si el problema persiste, busca en los logs:

**Frontend (F12 → Console):**
```
🚨 Token inválido o sin permisos. Cerrando sesión...
🧹 Sesión cerrada y caché limpiado
```

**Backend:**
```
❌ Error syncing with Drive
❌ Error code: 403
❌ Error status: 403
```

## ✅ Beneficios

1. **Cambio de cuenta sin problemas**: Ahora puedes cambiar entre cuentas de Google sin errores
2. **Detección automática**: El sistema detecta cuando el token es inválido o de otra cuenta
3. **Limpieza automática**: Los cachés se limpian automáticamente al cerrar sesión
4. **Mensajes claros**: El usuario sabe exactamente qué está pasando y qué hacer
5. **Logout automático**: No más tokens corruptos o de cuentas incorrectas
