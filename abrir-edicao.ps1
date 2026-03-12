# Script para abrir o modo de edição do painel admin
Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Green

# Verificar se o servidor já está rodando
$portCheck = netstat -ano | findstr :3000
if ($portCheck) {
    Write-Host "✅ Servidor já está rodando na porta 3000" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
} else {
    Write-Host "⏳ Iniciando servidor..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Minimized
    Write-Host "⏳ Aguardando servidor iniciar (10 segundos)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
}

Write-Host "🌐 Abrindo painel de administração..." -ForegroundColor Green
Start-Sleep -Seconds 2

# Abrir diferentes páginas de edição
Write-Host ""
Write-Host "📋 Páginas de edição disponíveis:" -ForegroundColor Cyan
Write-Host "  1. Imagens do Hero: http://localhost:3000/admin/hero-images" -ForegroundColor White
Write-Host "  2. Produtos: http://localhost:3000/admin/produtos" -ForegroundColor White
Write-Host "  3. Categorias: http://localhost:3000/admin/categorias" -ForegroundColor White
Write-Host "  4. Dashboard: http://localhost:3000/admin/dashboard" -ForegroundColor White
Write-Host ""

# Abrir a página de edição de imagens do hero
Start-Process "http://localhost:3000/admin/hero-images"

Write-Host "✅ Modo de edição aberto!" -ForegroundColor Green
Write-Host "💡 Dica: Faça login como administrador para acessar o painel" -ForegroundColor Yellow
