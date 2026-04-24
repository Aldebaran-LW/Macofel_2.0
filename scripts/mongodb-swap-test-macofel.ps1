# Troca o conteúdo das bases MongoDB `test` e `macofel` no MESMO cluster (mongodump + mongorestore).
# NÃO executa da cloud: corre na TUA máquina com acesso ao Atlas.
#
# Pré-requisitos:
#   - MongoDB Database Tools (mongodump, mongorestore) no PATH
#   - MONGODB_URI no .env.local ou .env (ou passa -MongoUri)
#   - Backup / snapshot no Atlas recomendado antes
#
# Uso (na raiz do projeto):
#   .\scripts\mongodb-swap-test-macofel.ps1
#   npm run mongo:swap-test-macofel:dry
#   npm run mongo:swap-test-macofel
# Só mostrar o que faria:
#   .\scripts\mongodb-swap-test-macofel.ps1 -DryRun
#
param(
  [string] $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string] $MongoUri = "",
  [string] $OutDir = "",
  [switch] $DryRun,
  [switch] $SkipConfirm
)

$ErrorActionPreference = "Stop"

function Resolve-MongoToolExe {
  param([string] $Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd -and (Test-Path -LiteralPath $cmd.Source)) { return $cmd.Source }
  $exeName = if ($Name.EndsWith(".exe")) { $Name } else { "$Name.exe" }
  $roots = @(
    "${env:ProgramFiles}\MongoDB\Tools",
    "${env:ProgramFiles(x86)}\MongoDB\Tools",
    "$env:LocalAppData\Programs\MongoDB\Tools"
  )
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    # Instalacao MSI tipica: Tools\100\bin\mongodump.exe
    $globs = @(Join-Path $root "*\bin\$exeName")
    foreach ($g in $globs) {
      $hits = @(Get-Item -Path $g -ErrorAction SilentlyContinue)
      if ($hits.Count -gt 0) {
        return ($hits | Sort-Object { $_.FullName } -Descending | Select-Object -First 1).FullName
      }
    }
    $candidates = Get-ChildItem -Path $root -Recurse -Filter $exeName -ErrorAction SilentlyContinue |
      Where-Object { $_.DirectoryName -match '\\bin$' } |
      Sort-Object FullName -Descending
    if ($candidates) { return $candidates[0].FullName }
  }
  return $null
}

function Get-MongoUriFromEnvFiles {
  param([string] $Root)
  foreach ($name in @(".env.local", ".env")) {
    $path = Join-Path $Root $name
    if (-not (Test-Path $path)) { continue }
    foreach ($line in Get-Content $path -Encoding UTF8) {
      $t = $line.Trim()
      if ($t.StartsWith("#") -or $t -eq "") { continue }
      if ($t -match '^\s*MONGODB_URI\s*=') {
        $v = $t.Substring($t.IndexOf("=") + 1).Trim()
        if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
        if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
        if ($v) { return $v }
      }
    }
  }
  return $null
}

# mongodump --db=X falha se a URI já tiver outro path de base (/macofel vs --db=test). Usar URI sem path de base.
function Get-MongoClusterUriWithoutDefaultDb([string]$u) {
  if (-not $u) { return $u }
  if ($u -match '^([^:]+://[^/]+)/[^?]+(\?.*)$') {
    return $matches[1] + '/' + $matches[2]
  }
  return $u
}

$mongoDumpExe = Resolve-MongoToolExe "mongodump.exe"
if (-not $mongoDumpExe) { $mongoDumpExe = Resolve-MongoToolExe "mongodump" }
$mongoRestoreExe = Resolve-MongoToolExe "mongorestore.exe"
if (-not $mongoRestoreExe) { $mongoRestoreExe = Resolve-MongoToolExe "mongorestore" }

if (-not $MongoUri) {
  $MongoUri = Get-MongoUriFromEnvFiles $ProjectRoot
}
if (-not $MongoUri) {
  Write-Error "Define MONGODB_URI em .env.local ou .env, ou passa -MongoUri '...'"
}

$MongoUriOps = Get-MongoClusterUriWithoutDefaultDb $MongoUri

if (-not $OutDir) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutDir = Join-Path $ProjectRoot "mongo-backup-swap-$stamp"
}

Write-Host "ProjectRoot: $ProjectRoot"
Write-Host "Backup/swap folder: $OutDir"
Write-Host "URI (mascarada): $($MongoUri -replace '//[^:]+:[^@]+@', '//***:***@')"

if (-not $SkipConfirm -and -not $DryRun) {
  Write-Host ""
  Write-Host "ISTO SUBSTITUI as bases 'test' e 'macofel' no cluster desta URI." -ForegroundColor Yellow
  Write-Host "Garante snapshot no Atlas antes. Escreve SIM para continuar:" -ForegroundColor Yellow
  $r = Read-Host
  if ($r -ne "SIM") {
    Write-Host "Cancelado."
    exit 1
  }
}

$pathA = Join-Path $OutDir "A"
$pathB = Join-Path $OutDir "B"
# mongorestore com --nsFrom/--nsTo: o argumento final e' a pasta RAIZ do dump (contem subpasta test/ ou macofel/), nao test/ nem macofel/ sozinhos.
$dumpTest = Join-Path $pathA "test"
$dumpMac = Join-Path $pathB "macofel"

if ($DryRun) {
  if (-not $mongoDumpExe -or -not $mongoRestoreExe) {
    Write-Warning "mongodump/mongorestore nao encontrados (PATH nem pastas tipicas). Instala MongoDB Database Tools para executar a troca."
  } else {
    Write-Host "mongodump:  $mongoDumpExe"
    Write-Host "mongorestore: $mongoRestoreExe"
  }
  Write-Host "[DryRun] URI para dump/restore (sem path de base na string): $($MongoUriOps -replace '//[^:]+:[^@]+@', '//***:***@')"
  Write-Host "[DryRun] mongodump ... --uri=... --db=test --out=$pathA"
  Write-Host "[DryRun] mongodump ... --uri=... --db=macofel --out=$pathB"
  Write-Host "[DryRun] mongorestore ... --drop --nsFrom=macofel.* --nsTo=test.* $pathB"
  Write-Host "[DryRun] mongorestore ... --drop --nsFrom=test.* --nsTo=macofel.* $pathA"
  exit 0
}

if (-not $mongoDumpExe -or -not $mongoRestoreExe) {
  Write-Error "mongodump/mongorestore nao encontrados. Instala MongoDB Database Tools (https://www.mongodb.com/try/download/database-tools), adiciona ao PATH ou instala em Program Files\MongoDB\Tools."
}

New-Item -ItemType Directory -Force -Path $pathA | Out-Null
New-Item -ItemType Directory -Force -Path $pathB | Out-Null

Write-Host "`n1/4 mongodump test -> $pathA ..."
& $mongoDumpExe --uri=$MongoUriOps --db=test --out=$pathA
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n2/4 mongodump macofel -> $pathB ..."
& $mongoDumpExe --uri=$MongoUriOps --db=macofel --out=$pathB
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n3/4 macofel -> test (drop destino) ..."
& $mongoRestoreExe --uri=$MongoUriOps --drop --nsFrom="macofel.*" --nsTo="test.*" $pathB
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n4/4 test -> macofel (drop destino) ..."
& $mongoRestoreExe --uri=$MongoUriOps --drop --nsFrom="test.*" --nsTo="macofel.*" $pathA
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nConcluído. Pastas de dump: $pathA , $pathB" -ForegroundColor Green
Write-Host "Confirma no Compass. Ajusta MONGODB_URI para .../macofel?... se for a base de produção e redeploy na Vercel." -ForegroundColor Green
