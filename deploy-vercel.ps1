# Script para fazer deploy na Vercel
# Token: vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk

Write-Host "=== Deploy na Vercel ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: Execute este script no diretório nextjs_space" -ForegroundColor Red
    exit 1
}

# Verificar se Vercel CLI está instalado
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Instalando Vercel CLI..." -ForegroundColor Yellow
    npm i -g vercel
}

# Token da Vercel
$token = "vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk"

Write-Host "Fazendo login na Vercel..." -ForegroundColor Yellow
Write-Host ""

# Fazer login
$env:VERCEL_TOKEN = $token

Write-Host "Iniciando deploy..." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Quando perguntar sobre root directory, digite: nextjs_space"
Write-Host "- Configure as variáveis de ambiente no Dashboard da Vercel"
Write-Host ""

# Deploy (com confirmação automática)
vercel --token $token --yes

Write-Host ""
Write-Host "=== Deploy concluído! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Configure as variáveis de ambiente na Vercel Dashboard"
Write-Host "2. Atualize NEXTAUTH_URL com a URL real do projeto"
Write-Host "3. Execute 'vercel --prod' para deploy em produção"
