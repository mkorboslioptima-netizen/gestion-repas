## Why

Le client possède un serveur Windows interne et souhaite mettre en production la version MVP développée (authentification JWT, dashboard, filtres par site/type, export Excel, SSE). Il faut un guide de déploiement reproductible couvrant IIS, SQL Server Express, le service TCP et le front React compilé.

## What Changes

- Ajout d'un guide de déploiement complet pour Windows Server (IIS 10 + .NET 8 Hosting Bundle)
- Script de configuration IIS (site Web API + application React en build statique)
- Script de création et migration de la base de données SQL Server Express
- Installation et enregistrement du service Windows `Cantine.TcpListener`
- Configuration des variables d'environnement (JWT secret, chaîne de connexion, ports TCP)
- Checklist de validation post-déploiement

## Capabilities

### New Capabilities

- `deployment-guide` : Documentation et scripts pas-à-pas pour déployer le MVP sur Windows Server (IIS, .NET 8, SQL Server Express, service TCP, React build)

### Modified Capabilities

_(aucune — ce changement n'affecte pas les exigences fonctionnelles existantes)_

## Impact

- Aucun changement de code applicatif
- Ajout de fichiers de configuration : `appsettings.Production.json`, `web.config` IIS pour l'API et le front
- Ajout de scripts PowerShell de déploiement dans `deploy/`
- Dépendance externe : Windows Server avec IIS 10, .NET 8 Hosting Bundle, SQL Server Express 2022
