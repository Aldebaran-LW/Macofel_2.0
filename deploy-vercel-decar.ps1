# Script de Deploy para Vercel - Branch DECAR
# Usa o token da Vercel para fazer deploy automático

Write-Host "🚀 Iniciando deploy na Vercel - Branch DECAR" -ForegroundColor Green
Write-Host ""

# Token da Vercel
$VERCEL_TOKEN = "vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk"

# Verificar se está no diretório correto
$currentDir = Get-Location
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: package.json não encontrado!" -ForegroundColor Red
    Write-Host "   Execute este script a partir do diretório nextjs_space" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Diretório correto detectado" -ForegroundColor Green
Write-Host ""

# Verificar se Vercel CLI está instalado
Write-Host "📦 Verificando Vercel CLI..." -ForegroundColor Cyan
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Vercel CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Vercel CLI instalado com sucesso" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI já está instalado" -ForegroundColor Green
}

Write-Host ""

# Fazer login com o token
Write-Host "🔐 Fazendo login na Vercel com token..." -ForegroundColor Cyan
$env:VERCEL_TOKEN = $VERCEL_TOKEN
vercel login --token $VERCEL_TOKEN

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer login na Vercel" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Login realizado com sucesso" -ForegroundColor Green
Write-Host ""

# Verificar se o projeto já está vinculado
Write-Host "🔍 Verificando projeto Vercel..." -ForegroundColor Cyan
$projectLinked = Test-Path ".vercel/project.json"

if (-not $projectLinked) {
    Write-Host "⚠️  Projeto não vinculado. Vamos vincular agora..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Informações necessárias:" -ForegroundColor Cyan
    Write-Host "   - Root Directory: nextjs_space" -ForegroundColor White
    Write-Host "   - Framework: Next.js" -ForegroundColor White
    Write-Host ""
    
    # Vincular projeto
    vercel link
} else {
    Write-Host "✅ Projeto já está vinculado" -ForegroundColor Green
}

Write-Host ""

# Deploy para preview
Write-Host "🚀 Fazendo deploy para preview..." -ForegroundColor Cyan
Write-Host ""
vercel --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro durante o deploy" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deploy para preview concluído!" -ForegroundColor Green
Write-Host ""

# Perguntar se deseja fazer deploy para produção
Write-Host "❓ Deseja fazer deploy para produção? (S/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🚀 Fazendo deploy para produção..." -ForegroundColor Cyan
    Write-Host ""
    vercel --prod --yes
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro durante o deploy de produção" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Deploy para produção concluído!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Processo concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Acesse o Dashboard da Vercel: https://vercel.com" -ForegroundColor White
Write-Host "   2. Configure as variáveis de ambiente (veja CONFIGURAR_VERCEL_DECAR.md)" -ForegroundColor White
Write-Host "   3. Atualize NEXTAUTH_URL com a URL real do projeto" -ForegroundColor White
Write-Host ""
