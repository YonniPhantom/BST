#!/usr/bin/env pwsh
# Script para construir la aplicación BST en Windows

Write-Host "🚀 Iniciando construcción de BST..." -ForegroundColor Cyan

# 1. Construir el frontend
Write-Host "`n📦 Paso 1/3: Construyendo frontend..." -ForegroundColor Yellow
Set-Location -Path "frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo el frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend construido exitosamente" -ForegroundColor Green

# 2. Construir electron
Write-Host "`n⚡ Paso 2/3: Construyendo Electron..." -ForegroundColor Yellow
npm run electron:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo Electron" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Electron construido exitosamente" -ForegroundColor Green

# 3. Construir el instalador
Write-Host "`n📦 Paso 3/3: Construyendo instalador..." -ForegroundColor Yellow
Set-Location -Path "..\launcher"
npm run build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo el instalador" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Instalador construido exitosamente" -ForegroundColor Green

# Volver al directorio raíz
Set-Location -Path ".."

Write-Host "`n🎉 ¡Construcción completada!" -ForegroundColor Green
Write-Host "📁 El instalador se encuentra en: launcher\dist\" -ForegroundColor Cyan
