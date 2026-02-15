# Script para configurar o banco de dados
Write-Host "=== Configurando Banco de Dados ===" -ForegroundColor Cyan

Write-Host "`n1. Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao gerar Prisma Client!" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Aplicando schema ao banco de dados..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao aplicar schema!" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Populando banco com dados de exemplo..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao popular banco!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Configuracao concluida! ===" -ForegroundColor Green
Write-Host "`nAgora voce pode executar: npm run dev" -ForegroundColor Cyan
