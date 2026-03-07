# Script automático para preservar layout do Macofel
$macofel = "$env:USERPROFILE\Downloads\Projeto - Site de Material de Construção\Macofel"
$here = Get-Location

if (-not (Test-Path "package.json")) { Write-Host "Execute no diretório nextjs_space"; exit 1 }

git checkout decar 2>&1 | Out-Null
$backupEnv = Get-Content "env.example" -ErrorAction SilentlyContinue
$backupVercel = Get-Content "vercel.json" -ErrorAction SilentlyContinue

Write-Host "📦 Copiando layout do Macofel..."
robocopy $macofel $here /E /XD node_modules .next .git .vercel test_reports /XF *.tsbuildinfo /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null

if ($backupEnv) { $backupEnv | Out-File "env.example" -Encoding UTF8 -NoNewline }
if ($backupVercel) { $backupVercel | Out-File "vercel.json" -Encoding UTF8 -NoNewline }

git add -A
git commit -m "Preservar layout completo do Macofel" 2>&1
git push origin decar --force 2>&1

Write-Host "✅ Concluído!"
