# Script para atualizar senha no .env com encoding correto
$envPath = Join-Path $PSScriptRoot ".env"

# Senha com encoding URL (barra / vira %2F)
$senha = "LW_Digital_Forge/123"
$senhaEncoded = [System.Web.HttpUtility]::UrlEncode($senha)

# Se HttpUtility não estiver disponível, fazer encoding manual
if (-not $senhaEncoded) {
    $senhaEncoded = $senha -replace '/', '%2F' -replace ' ', '%20'
}

$content = @"
DATABASE_URL="postgresql://postgres:$senhaEncoded@db.vedrmtowoosqxzqxgxpb.supabase.co:5432/postgres"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y="

NEXT_PUBLIC_SUPABASE_URL="https://vedrmtowoosqxzqxgxpb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU"
"@

$content | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
Write-Host "Arquivo .env atualizado!"
Write-Host "Senha codificada: LW_Digital_Forge%2F123"
