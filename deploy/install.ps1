#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installation initiale de Cantine SEBN sur Windows Server (IIS + service Windows).
    A executer UNE SEULE FOIS sur le serveur cible.

.PARAMETER ApiPort
    Port IIS pour l'API ASP.NET Core (defaut : 5000)

.PARAMETER FrontPort
    Port IIS pour le front React (defaut : 80)

.PARAMETER ApiPath
    Dossier IIS pour l'API (defaut : C:\inetpub\cantine-api)

.PARAMETER FrontPath
    Dossier IIS pour le front React (defaut : C:\inetpub\cantine-front)

.PARAMETER TcpServicePath
    Dossier du service Windows TcpListener (defaut : C:\Services\CantineTcpListener)

.EXAMPLE
    .\install.ps1 -ApiPort 5000 -FrontPort 80
#>
param(
    [int]    $ApiPort        = 5000,
    [int]    $FrontPort      = 80,
    [string] $ApiPath        = "C:\inetpub\cantine-api",
    [string] $FrontPath      = "C:\inetpub\cantine-front",
    [string] $TcpServicePath = "C:\Services\CantineTcpListener"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    [!]  $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
Write-Step "1. Verification des prerequis"
# ---------------------------------------------------------------------------

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw ".NET SDK introuvable. Installez le .NET 8 Hosting Bundle puis relancez."
}
$dotnetVer = (dotnet --version)
Write-OK ".NET $dotnetVer"

if (-not (Get-WindowsFeature Web-Server -ErrorAction SilentlyContinue | Where-Object { $_.Installed })) {
    Write-Warn "IIS non detecte — tentative d'installation..."
    Install-WindowsFeature -Name Web-Server, Web-Asp-Net45, Web-ISAPI-Ext, Web-ISAPI-Filter -IncludeManagementTools
}
Write-OK "IIS disponible"

# ---------------------------------------------------------------------------
Write-Step "2. Build API (dotnet publish)"
# ---------------------------------------------------------------------------

$ApiDeploy = "$Root\deploy\out\api"
dotnet publish "$Root\Cantine.API\Cantine.API.csproj" -c Release -o $ApiDeploy --self-contained false
Write-OK "API publiee dans $ApiDeploy"

# ---------------------------------------------------------------------------
Write-Step "3. Build TcpListener (dotnet publish)"
# ---------------------------------------------------------------------------

$TcpDeploy = "$Root\deploy\out\tcplistener"
dotnet publish "$Root\Cantine.TcpListener\Cantine.TcpListener.csproj" -c Release -o $TcpDeploy --self-contained false
Write-OK "TcpListener publie dans $TcpDeploy"

# ---------------------------------------------------------------------------
Write-Step "4. Build front React (npm run build)"
# ---------------------------------------------------------------------------

$FrontSrc = "$Root\cantine-web"
Push-Location $FrontSrc
npm ci --silent
npm run build
Pop-Location

$FrontDeploy = "$Root\deploy\out\front"
if (Test-Path $FrontDeploy) { Remove-Item $FrontDeploy -Recurse -Force }
Copy-Item "$FrontSrc\dist" $FrontDeploy -Recurse
Copy-Item "$Root\deploy\web.config" "$FrontDeploy\web.config" -Force
Write-OK "Front React construit dans $FrontDeploy"

# ---------------------------------------------------------------------------
Write-Step "5. Configuration des secrets de production"
# ---------------------------------------------------------------------------

$ApiProd = "$ApiDeploy\appsettings.Production.json"
$TcpProd = "$TcpDeploy\appsettings.Production.json"

if (-not (Test-Path $ApiProd)) {
    Write-Warn "appsettings.Production.json API absent."
    Write-Warn "Copiez deploy\appsettings.Production.template.json vers $ApiProd"
    Write-Warn "et remplissez les valeurs reelles avant de continuer."
    Read-Host "Appuyez sur Entree une fois le fichier cree"
}
if (-not (Test-Path $TcpProd)) {
    Write-Warn "appsettings.Production.json TcpListener absent."
    Write-Warn "Copiez deploy\appsettings.TcpListener.Production.template.json vers $TcpProd"
    Write-Warn "et remplissez les valeurs reelles avant de continuer."
    Read-Host "Appuyez sur Entree une fois le fichier cree"
}
Write-OK "Secrets de production presents"

# ---------------------------------------------------------------------------
Write-Step "6. Migration de la base de donnees"
# ---------------------------------------------------------------------------

Push-Location $Root
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
Pop-Location
Write-OK "Migrations EF Core appliquees"

# ---------------------------------------------------------------------------
Write-Step "7. Deploiement IIS — API"
# ---------------------------------------------------------------------------

if (Test-Path $ApiPath) { Remove-Item $ApiPath -Recurse -Force }
New-Item -ItemType Directory -Path $ApiPath | Out-Null
Copy-Item "$ApiDeploy\*" $ApiPath -Recurse -Force
Copy-Item $ApiProd "$ApiPath\appsettings.Production.json" -Force

Import-Module WebAdministration
if (-not (Get-WebAppPoolState "CantineAPI" -ErrorAction SilentlyContinue)) {
    New-WebAppPool -Name "CantineAPI"
    Set-ItemProperty IIS:\AppPools\CantineAPI managedRuntimeVersion ""
    Write-OK "Application Pool CantineAPI cree"
}
if (-not (Get-Website -Name "CantineAPI" -ErrorAction SilentlyContinue)) {
    New-Website -Name "CantineAPI" -Port $ApiPort -PhysicalPath $ApiPath -ApplicationPool "CantineAPI"
    Write-OK "Site IIS CantineAPI cree sur le port $ApiPort"
} else {
    Write-Warn "Site IIS CantineAPI existant — non modifie"
}

Set-ItemProperty "IIS:\AppPools\CantineAPI" -Name "environmentVariables" `
    -Value @{ name = "ASPNETCORE_ENVIRONMENT"; value = "Production" } -ErrorAction SilentlyContinue

Write-OK "API deployee dans $ApiPath"

# ---------------------------------------------------------------------------
Write-Step "8. Deploiement IIS — Front React"
# ---------------------------------------------------------------------------

if (Test-Path $FrontPath) { Remove-Item $FrontPath -Recurse -Force }
New-Item -ItemType Directory -Path $FrontPath | Out-Null
Copy-Item "$FrontDeploy\*" $FrontPath -Recurse -Force

if (-not (Get-Website -Name "CantineFront" -ErrorAction SilentlyContinue)) {
    New-Website -Name "CantineFront" -Port $FrontPort -PhysicalPath $FrontPath -ApplicationPool "DefaultAppPool"
    Write-OK "Site IIS CantineFront cree sur le port $FrontPort"
} else {
    Write-Warn "Site IIS CantineFront existant — non modifie"
}
Write-OK "Front React deploye dans $FrontPath"

# ---------------------------------------------------------------------------
Write-Step "9. Installation du service Windows TcpListener"
# ---------------------------------------------------------------------------

if (Test-Path $TcpServicePath) { Remove-Item $TcpServicePath -Recurse -Force }
New-Item -ItemType Directory -Path $TcpServicePath | Out-Null
Copy-Item "$TcpDeploy\*" $TcpServicePath -Recurse -Force
Copy-Item $TcpProd "$TcpServicePath\appsettings.Production.json" -Force

$svcExe = "$TcpServicePath\Cantine.TcpListener.exe"
$existing = Get-Service -Name "CantineTcpService" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "Service CantineTcpService deja installe — non modifie"
} else {
    sc.exe create CantineTcpService binPath= $svcExe start= auto obj= LocalSystem DisplayName= "Cantine TCP Listener"
    Write-OK "Service Windows CantineTcpService cree"
}
sc.exe start CantineTcpService
Write-OK "Service CantineTcpService demarre"

# ---------------------------------------------------------------------------
Write-Step "10. Regles pare-feu Windows"
# ---------------------------------------------------------------------------

if (-not (Get-NetFirewallRule -DisplayName "Cantine TCP Lecteurs" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Cantine TCP Lecteurs" -Direction Inbound -Protocol TCP -LocalPort 22090 -Action Allow
    Write-OK "Regle pare-feu TCP 22090 creee"
}
if (-not (Get-NetFirewallRule -DisplayName "Cantine API IIS" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Cantine API IIS" -Direction Inbound -Protocol TCP -LocalPort $ApiPort -Action Allow
    Write-OK "Regle pare-feu TCP $ApiPort creee"
}
if ($FrontPort -ne $ApiPort -and -not (Get-NetFirewallRule -DisplayName "Cantine Front IIS" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Cantine Front IIS" -Direction Inbound -Protocol TCP -LocalPort $FrontPort -Action Allow
    Write-OK "Regle pare-feu TCP $FrontPort creee"
}

# ---------------------------------------------------------------------------
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  Installation terminee avec succes !" -ForegroundColor Green
Write-Host "  API    : http://localhost:$ApiPort" -ForegroundColor Green
Write-Host "  Front  : http://localhost:$FrontPort" -ForegroundColor Green
Write-Host "  Service: CantineTcpService" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green
Write-Host "Etape suivante : creez le premier compte AdminSEBN via" -ForegroundColor Yellow
Write-Host "  POST http://localhost:$ApiPort/api/auth/register" -ForegroundColor Yellow
