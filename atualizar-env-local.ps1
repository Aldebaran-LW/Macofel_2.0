# Script para atualizar arquivo .env local
# Execute: .\atualizar-env-local.ps1

$envPath = Join-Path $PSScriptRoot ".env"

Write-Host "Atualizando arquivo .env..." -ForegroundColor Cyan

$envContent = @"
# ============================================
# 🔐 VARIÁVEIS DE AMBIENTE - MACOFEL E-commerce
# ============================================
# 
# Este arquivo contém todas as chaves e configurações do projeto.
# Para desenvolvimento local, use estas configurações.
# Para produção na Vercel, configure estas variáveis no Dashboard da Vercel
#
# ⚠️ IMPORTANTE: Este arquivo NÃO deve ser commitado no Git!
# ============================================

# ============================================
# DATABASE - Supabase PostgreSQL
# ============================================
# Connection String do Supabase usando Transaction Pooler
# Formato: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Connection String direta (para migrations e operações administrativas)
DIRECT_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@db.vedrmtowoosqxzqxgxpb.supabase.co:5432/postgres"

# ============================================
# NEXTAUTH - Autenticação
# ============================================
# ⚠️ IMPORTANTE: 
# - Para desenvolvimento local: http://localhost:3003
# - Para produção na Vercel: https://macofel-dois.lwdigitalforge.com (sem barra no final)
NEXTAUTH_URL="http://localhost:3003"
NEXTAUTH_SECRET="HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y="

# ============================================
# SUPABASE - API Keys
# ============================================
# Project Reference: vedrmtowoosqxzqxgxpb
# URL do Projeto: https://vedrmtowoosqxzqxgxpb.supabase.co

# URL pública do Supabase (usada no cliente)
NEXT_PUBLIC_SUPABASE_URL="https://vedrmtowoosqxzqxgxpb.supabase.co"

# Chave anônima do Supabase (pública, segura para uso no cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk"

# Chave de serviço do Supabase (privada, apenas no servidor)
# ⚠️ NUNCA exponha esta chave no cliente!
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU"

# ============================================
# MONGODB - Produtos e Categorias
# ============================================
# MongoDB Atlas Connection String (para produtos/catálogo)
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority"

# ============================================
# NODE ENVIRONMENT
# ============================================
# Para desenvolvimento local, use: development
# Para produção, use: production
NODE_ENV="development"

# ============================================
# INSTRUÇÕES PARA VERCEL
# ============================================
# 1. Acesse: https://vercel.com
# 2. Vá em: Settings > Environment Variables
# 3. Adicione TODAS as variáveis acima
# 4. Aplique para: Production, Preview e Development
# 5. ⚠️ IMPORTANTE: Atualize NEXTAUTH_URL para: https://macofel-dois.lwdigitalforge.com
# ============================================
"@

$envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline

Write-Host "Arquivo .env atualizado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Variáveis configuradas:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (Supabase PostgreSQL)" -ForegroundColor White
Write-Host "   - NEXTAUTH_URL (http://localhost:3003 para desenvolvimento)" -ForegroundColor White
Write-Host "   - NEXTAUTH_SECRET" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "   - MONGODB_URI" -ForegroundColor White
Write-Host "   - NODE_ENV (development)" -ForegroundColor White
Write-Host ""
Write-Host "Lembre-se:" -ForegroundColor Yellow
Write-Host "   - Para produção, configure NEXTAUTH_URL na Vercel como:" -ForegroundColor White
Write-Host "     https://macofel-dois.lwdigitalforge.com" -ForegroundColor Cyan
Write-Host ""
