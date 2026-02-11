# RENASCER.ps1 - cria um projeto novo Vite+React e migra arquivos
# Rode no PowerShell na pasta do projeto:  powershell -ExecutionPolicy Bypass -File .\renascer.ps1

$ErrorActionPreference = "Stop"

function Copy-IfExists($from, $to) {
  if (Test-Path $from) {
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    Copy-Item $from -Destination $to -Recurse -Force
  }
}

Write-Host "🔥 RENASCER: backup + projeto novo + migração 🔥" -ForegroundColor Cyan

# 1) Backup completo
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "..\BACKUP_ELETROBESS_$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host "📦 Fazendo backup em: $backupDir" -ForegroundColor Yellow
Copy-Item .\* -Destination $backupDir -Recurse -Force

# 2) Criar projeto novo
$newDir = "..\eletrobess_novo_$stamp"
Write-Host "🆕 Criando projeto novo em: $newDir" -ForegroundColor Yellow
Set-Location ..
npx create-vite@latest ("eletrobess_novo_$stamp") -- --template react

Set-Location $newDir

# 3) Instalar deps base
Write-Host "📦 Instalando deps base..." -ForegroundColor Yellow
npm install

Write-Host "➕ Instalando react-router-dom + libs comuns..." -ForegroundColor Yellow
npm install react-router-dom

# 4) Migrar arquivos do antigo
$oldDir = Resolve-Path ("$backupDir")
Write-Host "📁 Migrando src/public..." -ForegroundColor Yellow

Copy-IfExists "$oldDir\public" ".\public"
Copy-IfExists "$oldDir\src\assets" ".\src\assets"
Copy-IfExists "$oldDir\src\components" ".\src\components"
Copy-IfExists "$oldDir\src\layout" ".\src\layout"
Copy-IfExists "$oldDir\src\pages" ".\src\pages"
Copy-IfExists "$oldDir\src\styles" ".\src\styles"
Copy-IfExists "$oldDir\src\utils" ".\src\utils"
Copy-IfExists "$oldDir\src\services" ".\src\services"
Copy-IfExists "$oldDir\src\hooks" ".\src\hooks"

# 5) Criar main.jsx correto (React 18 + Router ok)
Write-Host "🧠 Gerando main.jsx e App.jsx base..." -ForegroundColor Yellow

@'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@ | Set-Content -Encoding UTF8 .\src\main.jsx

# Se existir App.jsx no backup, tenta copiar por cima; se não, cria um básico
if (Test-Path "$oldDir\src\App.jsx") {
  Copy-Item "$oldDir\src\App.jsx" ".\src\App.jsx" -Force
} elseif (Test-Path "$oldDir\src\App.tsx") {
  Copy-Item "$oldDir\src\App.tsx" ".\src\App.jsx" -Force
} else {
@'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
'@ | Set-Content -Encoding UTF8 .\src\App.jsx
}

# 6) Limpar coisa do template e testar
Write-Host "🧹 Limpando arquivos do template..." -ForegroundColor Yellow
Remove-Item .\src\App.css -ErrorAction SilentlyContinue
Remove-Item .\src\index.css -ErrorAction SilentlyContinue
Remove-Item .\src\assets\react.svg -ErrorAction SilentlyContinue

Write-Host "🏗️ Rodando build (pra garantir que compila)..." -ForegroundColor Yellow
npm run build

Write-Host "✅ PRONTO! Projeto novo criado em: $newDir" -ForegroundColor Green
Write-Host "👉 Agora rode: cd $newDir; npm run dev" -ForegroundColor Green
