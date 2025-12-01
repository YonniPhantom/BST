#!/usr/bin/env node

/**
 * Script para verificar la configuración del backend
 */

require('dotenv').config();

console.log('🔍 Verificando configuración del backend...\n');

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'JWT_SECRET'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'your_google_client_id_here' || value === 'your_google_client_secret_here' || value === 'your_jwt_secret_here') {
    console.log(`❌ ${varName}: No configurado o usando valor por defecto`);
    allConfigured = false;
  } else {
    console.log(`✅ ${varName}: Configurado`);
  }
});

console.log('\n📋 Configuración actual:');
console.log(`- PORT: ${process.env.PORT || '3001'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'No configurado'}`);

if (allConfigured) {
  console.log('\n✅ Todas las variables de entorno están configuradas correctamente');
} else {
  console.log('\n❌ Faltan variables de entorno por configurar');
  console.log('\n📝 Para configurar:');
  console.log('1. Copia .env.example a .env');
  console.log('2. Edita .env con tus credenciales de Google OAuth');
  console.log('3. Reinicia el servidor');
}

console.log('\n🔗 URLs importantes:');
console.log(`- Backend: https://pacheco.yonniphantom.dev`);
console.log(`- Auth URL: https://pacheco.yonniphantom.dev/api/auth/google/url`);
console.log(`- Callback: ${process.env.GOOGLE_REDIRECT_URI || 'https://pacheco.yonniphantom.dev/api/auth/callback/google'}`);
