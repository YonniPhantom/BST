#!/usr/bin/env pwsh
# Script para ejecutar la aplicación BST en modo desarrollo

Write-Host "🚀 Iniciando BST en modo desarrollo..." -ForegroundColor Cyan

# Verificar si el backend está corriendo
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $backendRunning = $true
    Write-Host "✅ Backend ya está corriendo" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend no está corriendo, iniciándolo..." -ForegroundColor Yellow
}

# Iniciar backend si no está corriendo
if (-not $backendRunning) {
    Write-Host "🔧 Iniciando backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start" -WindowStyle Normal
    Write-Host "⏳ Esperando a que el backend inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Iniciar frontend en modo desarrollo
Write-Host "⚡ Iniciando frontend..." -ForegroundColor Yellow
Set-Location -Path "frontend"
npm run electron:dev
