# Script para atualizar .env com todas as variáveis corretas
$envPath = Join-Path $PSScriptRoot ".env"

$senhaEncoded = "LW_Digital_Forge%2F123"

$envContent = @"
# Database - Supabase PostgreSQL
# Connection String com Transaction Pooler (IPv4 compatível)
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:$senhaEncoded@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y="

# Supabase API Keys
NEXT_PUBLIC_SUPABASE_URL="https://vedrmtowoosqxzqxgxpb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU"
"@

$envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline

Write-Host "✅ Arquivo .env atualizado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Variáveis configuradas:" -ForegroundColor Cyan
Write-Host "- DATABASE_URL (Transaction Pooler)" -ForegroundColor Yellow
Write-Host "- NEXTAUTH_URL" -ForegroundColor Yellow
Write-Host "- NEXTAUTH_SECRET" -ForegroundColor Yellow
Write-Host "- NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
Write-Host "- NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host "- SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANTE para Vercel:" -ForegroundColor Red
Write-Host "Configure as mesmas variáveis no Dashboard da Vercel!" -ForegroundColor Yellow
Write-Host "Settings > Environment Variables" -ForegroundColor Yellow
