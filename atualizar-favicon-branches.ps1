# Script para atualizar favicon nos branches: main, demo e novo-layout
# URL do novo favicon: https://vedrmtowoosqxzqxgxpb.supabase.co/storage/v1/object/public/Macofel/og-image.jpeg

Write-Host "🔄 Atualizando favicon nos branches..." -ForegroundColor Green

# Configurar Git safe.directory
git config --global --add safe.directory "*" 2>&1 | Out-Null

# Lista de branches
$branches = @("main", "demo", "novo-layout")

# Salvar branch atual
$currentBranch = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não foi possível determinar o branch atual. Continuando..." -ForegroundColor Yellow
    $currentBranch = "unknown"
} else {
    Write-Host "📌 Branch atual: $currentBranch" -ForegroundColor Cyan
}

# URL do novo favicon
$newFaviconUrl = "https://vedrmtowoosqxzqxgxpb.supabase.co/storage/v1/object/public/Macofel/og-image.jpeg"
$layoutFile = "app/layout.tsx"

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
        
        # Verificar se o arquivo existe
        if (-not (Test-Path $layoutFile)) {
            Write-Host "⚠️  Arquivo $layoutFile não encontrado no branch $branch" -ForegroundColor Yellow
            continue
        }
        
        # Ler o arquivo
        $content = Get-Content $layoutFile -Raw
        
        # Verificar se precisa atualizar
        if ($content -match "og-image\.jpeg") {
            Write-Host "ℹ️  Favicon já está atualizado no branch: $branch" -ForegroundColor Gray
        } else {
            # Atualizar o favicon
            Write-Host "✏️  Atualizando favicon..." -ForegroundColor Cyan
            
            # Substituir URLs antigas do favicon
            $content = $content -replace "https://vedrmtowoosqxzqxgxpb\.supabase\.co/storage/v1/object/public/Macofel/[^']+", $newFaviconUrl
            
            # Salvar o arquivo
            Set-Content -Path $layoutFile -Value $content -NoNewline
            
            # Verificar status
            $status = git status --short $layoutFile
            if ($status) {
                Write-Host "📝 Alterações detectadas" -ForegroundColor Green
                
                # Adicionar arquivo
                git add $layoutFile
                
                # Fazer commit
                Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
                git commit -m "Atualizar favicon para og-image.jpeg"
                
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
                }
            } else {
                Write-Host "⚠️  Nenhuma alteração detectada" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "❌ Erro ao processar branch: $branch" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Voltar para o branch original se possível
if ($currentBranch -ne "unknown") {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "🔄 Voltando para o branch original: $currentBranch" -ForegroundColor Cyan
    git checkout $currentBranch 2>&1 | Out-Null
}

Write-Host "`n✅ Processo concluído!" -ForegroundColor Green
Write-Host "`n📋 Resumo:" -ForegroundColor Cyan
Write-Host "  • Favicon atualizado para: og-image.jpeg" -ForegroundColor White
Write-Host "  • URL: $newFaviconUrl" -ForegroundColor Gray
Write-Host "  • Arquivo modificado: $layoutFile" -ForegroundColor Gray
