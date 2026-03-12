# Script simplificado para push no branch decar
# Execute este script a partir do diretório do projeto (macofel_ecommerce)

Write-Host "🚀 Push para branch DECAR" -ForegroundColor Green
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "nextjs_space")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório macofel_ecommerce" -ForegroundColor Red
    Write-Host "   Caminho esperado: ...\macofel_ecommerce\" -ForegroundColor Yellow
    exit 1
}

# Verificar repositório git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Repositório git não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório correto" -ForegroundColor Green

# Verificar/mudar para branch decar
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
    "nextjs_space/env.example",
    "nextjs_space/vercel.json",
    "nextjs_space/CONFIGURAR_VERCEL_DECAR.md",
    "nextjs_space/deploy-vercel-decar.ps1",
    "nextjs_space/TOKEN_VERCEL.md",
    "nextjs_space/git-push-decar.ps1",
    "nextjs_space/FAZER_PUSH_DECAR.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        git add $file 2>&1 | Out-Null
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $file (não encontrado)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Verificar se há mudanças
$status = git status --porcelain
if ($status) {
    Write-Host "📋 Mudanças detectadas:" -ForegroundColor Cyan
    Write-Host $status
    Write-Host ""
    
    # Commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m "Adicionar chaves do main e configurar para deploy Vercel no branch decar

- Atualizado env.example com todas as variáveis de ambiente do main
- Atualizado vercel.json com rootDirectory
- Criado CONFIGURAR_VERCEL_DECAR.md com guia completo de deploy
- Criado deploy-vercel-decar.ps1 para deploy automático
- Criado TOKEN_VERCEL.md com documentação do token
- Criado scripts auxiliares para git push"
    
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
    Write-Host "ℹ️  Nenhuma mudança para commitar" -ForegroundColor Yellow
    Write-Host "   Todos os arquivos já estão commitados" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
