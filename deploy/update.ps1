#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Mise a jour de Cantine SEBN (nouvelle version ou correctif).
    Utiliser apres chaque livraison — ne touche pas les secrets ni la config IIS.

.PARAMETER ApiPath
    Dossier IIS de l'API (defaut : C:\inetpub\cantine-api)

.PARAMETER FrontPath
    Dossier IIS du front React (defaut : C:\inetpub\cantine-front)

.PARAMETER TcpServicePath
    Dossier du service Windows TcpListener (defaut : C:\Services\CantineTcpListener)

.PARAMETER SkipFront
    Ne pas rebuilder le front React (si seul le backend a change)

.PARAMETER SkipApi
    Ne pas rebuilder l'API (si seul le front a change)

.PARAMETER SkipTcp
    Ne pas mettre a jour le service TcpListener

.EXAMPLE
    .\update.ps1
    .\update.ps1 -SkipFront       # backend seulement
    .\update.ps1 -SkipApi -SkipTcp  # front seulement
#>
param(
    [string] $ApiPath        = "C:\Cantine Sebn\deploy\api",
    [string] $FrontPath      = "C:\Cantine Sebn\deploy\front",
    [string] $TcpServicePath = "C:\Cantine Sebn\deploy\tcplistener",
    [switch] $SkipFront,
    [switch] $SkipApi,
    [switch] $SkipTcp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    [!]  $msg" -ForegroundColor Yellow }

Import-Module WebAdministration

# ---------------------------------------------------------------------------
Write-Step "1. Verification de l'installation existante"
# ---------------------------------------------------------------------------

if (-not (Test-Path $ApiPath))  { throw "Dossier API introuvable : $ApiPath - lancez install.ps1 d'abord." }
if (-not (Test-Path $FrontPath)) { throw "Dossier front introuvable : $FrontPath - lancez install.ps1 d'abord." }
if (-not (Test-Path $TcpServicePath)) { throw "Dossier TcpListener introuvable : $TcpServicePath - lancez install.ps1 d'abord." }
Write-OK "Installation existante detectee"

# ---------------------------------------------------------------------------
if (-not $SkipApi) {
    Write-Step "2. Build et mise a jour de l'API"
    # -------------------------------------------------------------------------

    $ApiDeploy = "$Root\deploy\out\api"
    dotnet publish "$Root\Cantine.API\Cantine.API.csproj" -c Release -o $ApiDeploy --self-contained false
    Write-OK "API publiee"

    # Arreter le pool IIS avant de copier (evite les fichiers verrouilles)
    Stop-WebAppPool -Name "CantineAPI"
    Start-Sleep -Seconds 2

    # Copier en preservant appsettings.Production.json du serveur
    $secretBackup = "$Root\deploy\out\api_secret_backup.json"
    if (Test-Path "$ApiPath\appsettings.Production.json") {
        Copy-Item "$ApiPath\appsettings.Production.json" $secretBackup -Force
    }

    Get-ChildItem $ApiPath | Where-Object { $_.Name -ne "appsettings.Production.json" } | Remove-Item -Recurse -Force
    Copy-Item "$ApiDeploy\*" $ApiPath -Recurse -Force

    if (Test-Path $secretBackup) {
        Copy-Item $secretBackup "$ApiPath\appsettings.Production.json" -Force
        Remove-Item $secretBackup
    }

    # Appliquer les nouvelles migrations (idempotent — ignore les migrations deja appliquees)
    Write-Step "3. Migrations base de donnees (si nouvelles)"
    Push-Location $Root
    dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
    Pop-Location
    Write-OK "Migrations EF Core appliquees"

    # Redemarrer le pool IIS
    Start-WebAppPool -Name "CantineAPI"
    Write-OK "Pool IIS CantineAPI redemarre"
}

# ---------------------------------------------------------------------------
if (-not $SkipFront) {
    Write-Step "4. Build et mise a jour du front React"
    # -------------------------------------------------------------------------

    $FrontSrc = "$Root\cantine-web"
    Push-Location $FrontSrc
    npm ci --silent
    npm run build
    Pop-Location

    $FrontDeploy = "$Root\deploy\out\front"
    if (Test-Path $FrontDeploy) { Remove-Item $FrontDeploy -Recurse -Force }
    Copy-Item "$FrontSrc\dist" $FrontDeploy -Recurse
    Copy-Item "$Root\deploy\web.config" "$FrontDeploy\web.config" -Force

    Remove-Item "$FrontPath\*" -Recurse -Force
    Copy-Item "$FrontDeploy\*" $FrontPath -Recurse -Force
    Write-OK "Front React mis a jour dans $FrontPath"
}

# ---------------------------------------------------------------------------
if (-not $SkipTcp) {
    Write-Step "5. Mise a jour du service Windows TcpListener"
    # -------------------------------------------------------------------------

    $TcpDeploy = "$Root\deploy\out\tcplistener"
    dotnet publish "$Root\Cantine.TcpListener\Cantine.TcpListener.csproj" -c Release -o $TcpDeploy --self-contained false
    Write-OK "TcpListener publie"

    sc.exe stop CantineTcpService
    Start-Sleep -Seconds 3

    $secretTcpBackup = "$Root\deploy\out\tcp_secret_backup.json"
    if (Test-Path "$TcpServicePath\appsettings.Production.json") {
        Copy-Item "$TcpServicePath\appsettings.Production.json" $secretTcpBackup -Force
    }

    Get-ChildItem $TcpServicePath | Where-Object { $_.Name -ne "appsettings.Production.json" } | Remove-Item -Recurse -Force
    Copy-Item "$TcpDeploy\*" $TcpServicePath -Recurse -Force

    if (Test-Path $secretTcpBackup) {
        Copy-Item $secretTcpBackup "$TcpServicePath\appsettings.Production.json" -Force
        Remove-Item $secretTcpBackup
    }

    sc.exe start CantineTcpService
    Write-OK "Service CantineTcpService redemarre"
}

# ---------------------------------------------------------------------------
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  Mise a jour terminee avec succes !" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green
