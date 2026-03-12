# Script para aplicar alterações nos branches: main, demo e novo-layout
# Alterações: Atualização de endereço e visualização de senha

Write-Host "🚀 Aplicando alterações nos branches..." -ForegroundColor Green

# Resolver problema de safe.directory do Git
Write-Host "🔧 Configurando Git safe.directory..." -ForegroundColor Cyan
git config --global --add safe.directory "*" 2>&1 | Out-Null

# Lista de branches
$branches = @("main", "demo", "novo-layout")

# Verificar se estamos em um repositório git
try {
    $gitRoot = git rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro: Não é um repositório git válido" -ForegroundColor Red
        Write-Host "Execute este script dentro do diretório do repositório git" -ForegroundColor Yellow
        Write-Host "Erro: $gitRoot" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Repositório git encontrado: $gitRoot" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao verificar repositório git" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Salvar branch atual
$currentBranch = git branch --show-current
Write-Host "📌 Branch atual: $currentBranch" -ForegroundColor Cyan

# Para cada branch
foreach ($branch in $branches) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "🔄 Processando branch: $branch" -ForegroundColor Yellow
    
    try {
        # Verificar se o branch existe
        $branchExists = git show-ref --verify --quiet refs/heads/$branch 2>$null
        $remoteBranchExists = git show-ref --verify --quiet refs/remotes/origin/$branch 2>$null
        
        if (-not $branchExists -and -not $remoteBranchExists) {
            Write-Host "⚠️  Branch '$branch' não encontrado. Pulando..." -ForegroundColor Yellow
            continue
        }
        
        # Fazer checkout do branch
        Write-Host "📥 Fazendo checkout do branch: $branch" -ForegroundColor Cyan
        git checkout $branch 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erro ao fazer checkout do branch: $branch" -ForegroundColor Red
            continue
        }
        
        # Verificar status
        $status = git status --short
        if ($status) {
            Write-Host "📝 Alterações detectadas:" -ForegroundColor Green
            git status --short
            
            # Adicionar arquivos modificados
            Write-Host "➕ Adicionando arquivos..." -ForegroundColor Cyan
            git add .
            
            # Fazer commit
            Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
            $commitMessage = "Atualizar endereço e adicionar visualização de senha`n`n- Atualizado endereço para: Av. São Paulo, 699 - Centro, Parapuã - SP, 17730-000`n- Adicionada visualização de senha nos campos de login e cadastro"
            git commit -m $commitMessage
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Commit realizado com sucesso!" -ForegroundColor Green
                
                # Perguntar se deseja fazer push
                $push = Read-Host "Deseja fazer push para o remoto? (S/N)"
                if ($push -eq "S" -or $push -eq "s") {
                    Write-Host "🚀 Fazendo push..." -ForegroundColor Cyan
                    git push origin $branch
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
                    } else {
                        Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "⚠️  Nenhuma alteração para commitar" -ForegroundColor Yellow
            }
        } else {
            Write-Host "ℹ️  Nenhuma alteração detectada no branch: $branch" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "❌ Erro ao processar branch: $branch" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Voltar para o branch original
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🔄 Voltando para o branch original: $currentBranch" -ForegroundColor Cyan
git checkout $currentBranch 2>&1 | Out-Null

Write-Host "`n✅ Processo concluído!" -ForegroundColor Green
Write-Host "`n📋 Resumo das alterações:" -ForegroundColor Cyan
Write-Host "  • Endereço atualizado em:" -ForegroundColor White
Write-Host "    - components/footer.tsx" -ForegroundColor Gray
Write-Host "    - components/footer-v2.tsx" -ForegroundColor Gray
Write-Host "    - app/page.tsx" -ForegroundColor Gray
Write-Host "    - app/page-demo.tsx" -ForegroundColor Gray
Write-Host "    - app/produto/[slug]/page.tsx" -ForegroundColor Gray
Write-Host "  • Visualização de senha adicionada em:" -ForegroundColor White
Write-Host "    - app/login/page.tsx" -ForegroundColor Gray
Write-Host "    - app/cadastro/page.tsx (senha e confirmar senha)" -ForegroundColor Gray
