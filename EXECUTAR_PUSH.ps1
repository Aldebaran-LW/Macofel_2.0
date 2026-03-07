# Script para fazer push dos arquivos para o branch decar
# Execute este script a partir do diretório nextjs_space

Write-Host "🚀 Fazendo push para branch decar..." -ForegroundColor Green
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório nextjs_space" -ForegroundColor Red
    Write-Host "   Caminho esperado: ...\macofel_ecommerce\nextjs_space\" -ForegroundColor Yellow
    exit 1
}

# Verificar repositório git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Repositório git não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório correto" -ForegroundColor Green
Write-Host ""

# Criar/mudar para branch decar
$currentBranch = git branch --show-current
Write-Host "📍 Branch atual: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne "decar") {
    $decarExists = git branch -a | Select-String "decar"
    if ($decarExists) {
        Write-Host "🔄 Mudando para branch decar..." -ForegroundColor Yellow
        git checkout decar
    } else {
        Write-Host "🆕 Criando branch decar..." -ForegroundColor Yellow
        git checkout -b decar
    }
}

Write-Host ""

# Adicionar arquivos
Write-Host "📦 Adicionando arquivos..." -ForegroundColor Cyan

$files = @(
    "env.example",
    "vercel.json",
    "CONFIGURAR_VERCEL_DECAR.md",
    "deploy-vercel-decar.ps1",
    "TOKEN_VERCEL.md"
)

$added = $false
foreach ($file in $files) {
    if (Test-Path $file) {
        git add $file 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $file" -ForegroundColor Green
            $added = $true
        }
    } else {
        Write-Host "   ⚠️  $file (não encontrado)" -ForegroundColor Yellow
    }
}

Write-Host ""

if ($added) {
    # Commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m "Adicionar chaves do main e configurar Vercel"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit realizado" -ForegroundColor Green
        Write-Host ""
        
        # Push
        Write-Host "🚀 Fazendo push para origin decar..." -ForegroundColor Cyan
        git push origin decar
        
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
    Write-Host "ℹ️  Nenhum arquivo foi adicionado" -ForegroundColor Yellow
    Write-Host "   Verifique se os arquivos existem no diretório" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
