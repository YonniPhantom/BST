#!/usr/bin/env node

/**
 * Script para probar el refresh de tokens
 */

require('dotenv').config();

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Crear un token de prueba con datos simulados
const testPayload = {
  id: 'test_user_id',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  accessToken: 'expired_google_token',
  refreshToken: 'test_refresh_token',
  expiresAt: Date.now() - 1000 // Expirado hace 1 segundo
};

const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });

console.log('🔍 Token de prueba generado:');
console.log('Token:', testToken.substring(0, 50) + '...');
console.log('Payload:', testPayload);

console.log('\n📋 Para probar el refresh:');
console.log('1. Usa este token en el frontend');
console.log('2. Haz una petición a /api/drive/list');
console.log('3. Debería fallar con 401 de Google');
console.log('4. El frontend debería llamar a /api/auth/refresh');

console.log('\n🧪 Comando de prueba:');
console.log(`curl -X POST http://localhost:3001/api/auth/refresh \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"token":"${testToken}"}'`);
