# Push do Macofel_2.0-catalog-agent para GitHub na branch catalog-agent.
# Pré-requisito: Git instalado e autenticação GitHub (PAT ou SSH).
#
# Uso (PowerShell, na pasta Macofel_2.0-catalog-agent):
#   .\scripts\push-catalog-agent-branch.ps1
# Só commit local (sem push — útil antes de renovar o PAT):
#   .\scripts\push-catalog-agent-branch.ps1 -NoPush
# Push já (sem perguntar), se o remoto rejeitou non-fast-forward e queres substituir pelo local:
#   .\scripts\push-catalog-agent-branch.ps1 -PushNow -ForceWithLease
#
# Se o repositório no GitHub tiver outra estrutura (monorepo só com subpasta catalog-agent),
# faz clone oficial, copia ficheiros para a pasta certa e usa git aí — este script assume que
# o conteúdo desta pasta é o que queres na branch.

param(
  [string] $RemoteUrl = "https://github.com/Aldebaran-LW/Macofel_2.0.git",
  [string] $Branch = "catalog-agent",
  [string] $RemoteName = "origin",
  [string] $UserName = "Aldebaran-LW",
  [string] $UserEmail = "lucas005willian@gmail.com",
  [string] $CommitMessage = "feat: Telegram bot, APIs de vínculo, admin Telegram, Render",
  [switch] $NoPush,
  [switch] $PushNow,
  [switch] $ForceWithLease
)

$ErrorActionPreference = "Stop"

$gitExe = $null
$cmd = Get-Command git -ErrorAction SilentlyContinue
if ($cmd) {
  $gitExe = $cmd.Source
} else {
  foreach ($p in @(
      "$env:ProgramFiles\Git\cmd\git.exe",
      "$env:ProgramFiles\Git\bin\git.exe",
      "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
      "$env:LocalAppData\Programs\Git\cmd\git.exe"
    )) {
    if (Test-Path $p) {
      $gitExe = $p
      break
    }
  }
}
if (-not $gitExe) {
  Write-Error "Git não encontrado. Instala https://git-scm.com/download/win e abre um novo terminal."
}

# Nome do parâmetro NÃO pode ser "Args": em PowerShell, "git add -A" faz -A coincidir com -Args.
function G {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]] $GitArgs)
  & $gitExe @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed (exit $LASTEXITCODE)"
  }
}

# Git escreve em stderr quando falha (ex.: remote inexistente). Com $ErrorActionPreference Stop isso rebentava o script.
function GitQuiet {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]] $GitArgs)
  $prev = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'SilentlyContinue'
    & $gitExe @GitArgs 2>$null | Out-Null
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
}

function GitOutQuiet {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]] $GitArgs)
  $prev = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'SilentlyContinue'
    return & $gitExe @GitArgs 2>$null
  } finally {
    $ErrorActionPreference = $prev
  }
}

# Raiz = pasta pai de scripts/ (Macofel_2.0-catalog-agent)
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
  Write-Error "package.json não encontrado em $root. Executa o script dentro de Macofel_2.0-catalog-agent."
}

Set-Location $root
Write-Host "Raiz: $root"

if (-not (Test-Path ".git")) {
  Write-Host "git init…"
  G init
}

G config user.name $UserName
G config user.email $UserEmail

if ((GitQuiet remote get-url $RemoteName) -ne 0) {
  Write-Host "remote add $RemoteName"
  G remote add $RemoteName $RemoteUrl
}

# Opcional: atualizar refs (falha silenciosa offline / primeiro uso)
$null = GitQuiet fetch $RemoteName

$rawBranch = GitOutQuiet branch --show-current
$onBranch = if ($null -ne $rawBranch -and $rawBranch -is [string]) { $rawBranch.Trim() } else { '' }
if ($onBranch -ne $Branch) {
  if ((GitQuiet rev-parse --verify $Branch) -eq 0) {
    G checkout $Branch
  } else {
    G checkout -b $Branch
  }
}

G add -A
$porcelain = & $gitExe status --porcelain
if (-not $porcelain) {
  Write-Host "Nada para commitar."
} else {
  G commit -m $CommitMessage
}

Write-Host @"

Próximo passo:
  git push -u $RemoteName $Branch

Se aparecer rejected (non-fast-forward) e o teu disco tiver a versão certa:
  git push --force-with-lease -u $RemoteName $Branch
  ou: .\scripts\push-catalog-agent-branch.ps1 -PushNow -ForceWithLease

Autenticação: PAT (scope repo) em https://github.com/settings/tokens
ou SSH: git remote set-url $RemoteName git@github.com:Aldebaran-LW/Macofel_2.0.git

Não coloques o token em chats nem em ficheiros commitados. No push HTTPS, quando pedir password usa o PAT novo.
"@

if ($NoPush) {
  Write-Host "`n-NoPush: commit local feito (ou nada para commitar). Corre push manualmente quando tiveres token válido."
  exit 0
}

function Do-Push {
  if ($ForceWithLease) {
    Write-Host "git push --force-with-lease -u $RemoteName $Branch"
    & $gitExe push --force-with-lease -u $RemoteName $Branch
  } else {
    & $gitExe push -u $RemoteName $Branch
  }
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed (exit $LASTEXITCODE)"
  }
}

if ($PushNow) {
  Do-Push
  exit 0
}

$push = Read-Host "Executar push agora? (s/N)"
if ($push -eq 's' -or $push -eq 'S') {
  Do-Push
}
