# Script para fazer commit e push dos arquivos de configuração para o branch decar

Write-Host "🔄 Preparando commit e push para branch decar" -ForegroundColor Green
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório nextjs_space" -ForegroundColor Red
    exit 1
}

# Verificar se há repositório git
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Repositório git não encontrado neste diretório" -ForegroundColor Yellow
    Write-Host "   Verificando diretório pai..." -ForegroundColor Yellow
    
    if (Test-Path "..\.git") {
        Write-Host "✅ Repositório git encontrado no diretório pai" -ForegroundColor Green
        Set-Location ..
    } else {
        Write-Host "❌ Repositório git não encontrado" -ForegroundColor Red
        Write-Host "   Execute este script a partir do diretório do projeto" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Diretório git encontrado" -ForegroundColor Green
Write-Host ""

# Verificar branch atual
$currentBranch = git branch --show-current
Write-Host "📍 Branch atual: $currentBranch" -ForegroundColor Cyan

# Verificar se precisa mudar para decar
if ($currentBranch -ne "decar") {
    Write-Host "🔄 Mudando para branch decar..." -ForegroundColor Yellow
    
    # Verificar se o branch existe
    $branchExists = git branch -a | Select-String "decar"
    
    if ($branchExists) {
        git checkout decar
    } else {
        Write-Host "⚠️  Branch decar não encontrado. Criando novo branch..." -ForegroundColor Yellow
        git checkout -b decar
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao mudar para branch decar" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Agora no branch decar" -ForegroundColor Green
}

Write-Host ""

# Adicionar arquivos modificados
Write-Host "📦 Adicionando arquivos ao staging..." -ForegroundColor Cyan

$filesToAdd = @(
    "nextjs_space/env.example",
    "nextjs_space/vercel.json",
    "nextjs_space/CONFIGURAR_VERCEL_DECAR.md",
    "nextjs_space/deploy-vercel-decar.ps1",
    "nextjs_space/TOKEN_VERCEL.md"
)

$addedFiles = @()

foreach ($file in $filesToAdd) {
    if (Test-Path $file) {
        git add $file
        if ($LASTEXITCODE -eq 0) {
            $addedFiles += $file
            Write-Host "   ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $file (já rastreado ou sem mudanças)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ $file (não encontrado)" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar status
$status = git status --short
if ($status) {
    Write-Host "📋 Arquivos prontos para commit:" -ForegroundColor Cyan
    Write-Host $status
    Write-Host ""
    
    # Fazer commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m "Adicionar chaves do main e configurar para deploy Vercel no branch decar

- Atualizado env.example com todas as variáveis de ambiente do main
- Atualizado vercel.json com rootDirectory
- Criado CONFIGURAR_VERCEL_DECAR.md com guia completo de deploy
- Criado deploy-vercel-decar.ps1 para deploy automático
- Criado TOKEN_VERCEL.md com documentação do token"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit realizado com sucesso" -ForegroundColor Green
        Write-Host ""
        
        # Fazer push
        Write-Host "🚀 Fazendo push para origin decar..." -ForegroundColor Cyan
        git push origin decar
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 Arquivos enviados para o repositório remoto" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
            Write-Host "   Verifique sua conexão e permissões" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ℹ️  Nenhuma mudança para commitar" -ForegroundColor Yellow
    Write-Host "   Todos os arquivos já estão commitados" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
