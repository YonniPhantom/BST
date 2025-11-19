# 🔧 Fix: OAuth Scopes - Permisos de Escritura en Google Drive

## 🐛 Problema Identificado

**Error:** "The user has not granted the app write access to the file"

### Causa Raíz

Los scopes de OAuth estaban configurados incorrectamente:

```javascript
// ❌ INCORRECTO (solo lectura)
const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly',  // Solo lectura
  'https://www.googleapis.com/auth/drive.file'       // Solo archivos creados por la app
];
```

### Explicación de Scopes

- **`drive.readonly`**: Solo permite **leer** archivos, no modificarlos ❌
- **`drive.file`**: Solo permite modificar archivos **creados por la app** ❌
- **`drive`**: Permite **leer y escribir** todos los archivos ✅

## ✅ Solución Implementada

Cambié el scope a acceso completo:

```javascript
// ✅ CORRECTO (lectura y escritura)
const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive' // Acceso completo a Drive
];
```

### Archivo Modificado

**`backend/routes/auth.js`** - Línea 42-47

## 🔄 Pasos para Aplicar el Fix

### 1. Instalar la Nueva Versión

```powershell
# El nuevo instalador está en:
launcher\dist\BST Setup 1.0.0.exe
```

### 2. **IMPORTANTE: Cerrar Sesión y Volver a Iniciar Sesión**

⚠️ **DEBES cerrar sesión y volver a iniciar sesión** para que Google solicite los nuevos permisos.

**Por qué:** Google guarda los permisos otorgados. Si ya iniciaste sesión con los permisos antiguos (solo lectura), Google no pedirá los nuevos permisos hasta que:
- Cierres sesión y vuelvas a iniciar sesión
- O revoques el acceso manualmente en Google

### 3. Verificar Permisos en Google

Cuando vuelvas a iniciar sesión, Google te mostrará:

```
BST quiere acceder a tu cuenta de Google

Esta aplicación podrá:
✅ Ver, editar, crear y eliminar todos tus archivos de Google Drive
✅ Ver tu dirección de correo electrónico
✅ Ver tu información personal
```

**Acepta** estos permisos.

## 🧪 Cómo Verificar que Funciona

1. Cierra sesión en la app
2. Vuelve a iniciar sesión
3. Acepta los nuevos permisos de Google
4. Selecciona un archivo de Excel
5. Haz cambios y guarda
6. **Resultado esperado**: ✅ "Sincronización exitosa"

## 🔍 Logs para Verificar

### Antes del Fix (Error)
```
❌ Error code: 403
❌ Error message: The user has not granted the app write access to the file
```

### Después del Fix (Éxito)
```
✅ Archivo actualizado en Google Drive
✅ Sincronización exitosa
```

## 📋 Checklist de Verificación

- [ ] Instalé la nueva versión de la app
- [ ] Cerré sesión en la app
- [ ] Volví a iniciar sesión con Google
- [ ] Acepté los nuevos permisos (incluyendo "editar archivos de Drive")
- [ ] Probé guardar cambios en un archivo
- [ ] ✅ Funciona correctamente

## ⚠️ Notas Importantes

### Si Sigues Viendo el Error

1. **Revoca el acceso manualmente en Google:**
   - Ve a https://myaccount.google.com/permissions
   - Busca "BST" o tu app
   - Haz clic en "Quitar acceso"
   - Vuelve a iniciar sesión en la app

2. **Verifica que estés usando la nueva versión:**
   - La nueva versión tiene el scope correcto
   - Verifica la fecha de modificación del instalador

3. **Limpia el caché:**
   - Cierra sesión
   - Cierra la app completamente
   - Vuelve a abrir e inicia sesión

## 🎯 Resumen

**Problema:** OAuth solo tenía permisos de lectura
**Solución:** Cambié el scope a `drive` (acceso completo)
**Acción requerida:** Cerrar sesión y volver a iniciar sesión para obtener los nuevos permisos

## 📚 Referencias

- [Google Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- `drive.readonly` - Ver y descargar archivos
- `drive.file` - Ver y editar archivos creados por la app
- `drive` - Acceso completo (recomendado para apps de gestión de archivos)
