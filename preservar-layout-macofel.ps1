# Script para preservar o layout do diretório Macofel no branch decar

$macofelPath = "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\Macofel"
$nextjsPath = Get-Location

Write-Host "🎨 Preservando layout do Macofel no branch decar" -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script a partir do diretório nextjs_space" -ForegroundColor Red
    exit 1
}

# Verificar se o diretório Macofel existe
if (-not (Test-Path $macofelPath)) {
    Write-Host "❌ Diretório Macofel não encontrado: $macofelPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório Macofel encontrado" -ForegroundColor Green
Write-Host "📍 Diretório atual: $nextjsPath" -ForegroundColor Cyan
Write-Host ""

# Verificar branch
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

# Copiar TODOS os arquivos do Macofel (preservando layout completo)
Write-Host "📦 Copiando layout completo do Macofel..." -ForegroundColor Cyan
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Yellow

# Usar robocopy para copiar tudo, exceto node_modules, .next, .git, etc.
robocopy $macofelPath $nextjsPath /E /XD node_modules .next .git .vercel test_reports /XF *.tsbuildinfo /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null

Write-Host "   ✅ Layout copiado com sucesso" -ForegroundColor Green
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

# Adicionar tudo ao git
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
    git commit -m "Preservar layout completo do Macofel no branch decar (mantendo variáveis atualizadas)"
    
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
            Write-Host "🎨 Layout do Macofel preservado no branch decar" -ForegroundColor Green
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
