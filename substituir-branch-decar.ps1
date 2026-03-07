# Script para substituir o branch decar pelo conteúdo do diretório Macofel
# Mantendo as chaves/variáveis atualizadas

$macofelPath = "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\Macofel"
$nextjsPath = Get-Location

Write-Host "🔄 Substituindo branch decar pelo conteúdo do diretório Macofel" -ForegroundColor Green
Write-Host ""

# Verificar se os diretórios existem
if (-not (Test-Path $macofelPath)) {
    Write-Host "❌ Diretório Macofel não encontrado: $macofelPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório Macofel encontrado" -ForegroundColor Green
Write-Host "📍 Diretório atual: $nextjsPath" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script a partir do diretório nextjs_space" -ForegroundColor Red
    exit 1
}

# Verificar se está no branch decar
$currentBranch = git branch --show-current
if ($currentBranch -ne "decar") {
    Write-Host "🔄 Mudando para branch decar..." -ForegroundColor Yellow
    git checkout decar
}

Write-Host "📍 Branch atual: $(git branch --show-current)" -ForegroundColor Cyan
Write-Host ""

# Fazer backup das variáveis atualizadas
Write-Host "💾 Fazendo backup das variáveis atualizadas..." -ForegroundColor Cyan
$backupEnv = Get-Content "env.example" -ErrorAction SilentlyContinue
$backupVercel = Get-Content "vercel.json" -ErrorAction SilentlyContinue

if ($backupEnv) {
    Write-Host "   ✅ env.example salvo" -ForegroundColor Green
}
if ($backupVercel) {
    Write-Host "   ✅ vercel.json salvo" -ForegroundColor Green
}

Write-Host ""

# Usar robocopy para copiar arquivos (mais eficiente e confiável)
Write-Host "📦 Copiando arquivos do diretório Macofel..." -ForegroundColor Cyan
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Yellow

robocopy $macofelPath $nextjsPath /E /XD node_modules .next .git .vercel test_reports /XF *.tsbuildinfo /NFL /NDL /NJH /NJS /R:3 /W:1 | Out-Null

if ($LASTEXITCODE -le 1) {
    Write-Host "   ✅ Arquivos copiados com sucesso" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Código de retorno: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "   (Isso é normal para robocopy)" -ForegroundColor Yellow
}

Write-Host ""

# Restaurar as variáveis atualizadas
Write-Host "🔐 Restaurando variáveis atualizadas..." -ForegroundColor Cyan

if ($backupEnv) {
    $backupEnv | Out-File "env.example" -Encoding UTF8 -NoNewline
    Write-Host "   ✅ env.example restaurado com variáveis atualizadas" -ForegroundColor Green
}

if ($backupVercel) {
    $backupVercel | Out-File "vercel.json" -Encoding UTF8 -NoNewline
    Write-Host "   ✅ vercel.json restaurado" -ForegroundColor Green
}

Write-Host ""

# Adicionar todos os arquivos ao git
Write-Host "📝 Adicionando arquivos ao git..." -ForegroundColor Cyan
git add -A

# Verificar status
$status = git status --short
if ($status) {
    Write-Host "📋 Arquivos modificados:" -ForegroundColor Cyan
    $status | Select-Object -First 20
    Write-Host ""
    
    # Fazer commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m "Substituir branch decar pelo conteúdo do diretório Macofel (mantendo variáveis atualizadas)"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit realizado" -ForegroundColor Green
        Write-Host ""
        
        # Fazer push
        Write-Host "🚀 Fazendo push para origin decar..." -ForegroundColor Cyan
        git push origin decar --force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔗 Repositório: https://github.com/Aldebaran-LW/Materiais_de_Construcao/tree/decar" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ℹ️  Nenhuma mudança detectada" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
