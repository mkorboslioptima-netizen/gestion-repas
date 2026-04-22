# Tasks — deploiement-mvp-windows

## 1. Préparation du serveur Windows

- [ ] 1.1 Vérifier les prérequis : Windows Server avec IIS 10, SQL Server Express 2022 installés et actifs
- [ ] 1.2 Installer le .NET 8 Hosting Bundle (ASP.NET Core Runtime + IIS Module) sur le serveur
- [ ] 1.3 Installer Node.js (LTS) sur le poste de build pour compiler le front React
- [ ] 1.4 Activer le module `Réécriture d'URL` (URL Rewrite) dans IIS si absent
- [ ] 1.5 Ouvrir le port TCP 22090 (lecteurs Morpho) dans le pare-feu Windows (règle entrante)
- [ ] 1.6 Ouvrir le port 80 (ou 443) pour IIS dans le pare-feu Windows si nécessaire

## 2. Fix CORS avant build (obligatoire pour la production)

- [ ] 2.1 Dans `Cantine.API/Program.cs`, remplacer l'origine CORS `http://localhost:5173` par l'URL réelle du front en production (ex. `http://<ip-serveur>` ou `http://<nom-dns>`)
- [ ] 2.2 Valider que `Jwt:Issuer` et `Jwt:Audience` dans `appsettings.json` correspondent à l'URL de production (sinon les corriger dans `appsettings.Production.json`)

## 3. Build de l'application

- [ ] 3.1 Publier l'API : `dotnet publish Cantine.API -c Release -o deploy/api --self-contained false`
- [ ] 3.2 Publier le service TCP : `dotnet publish Cantine.TcpListener -c Release -o deploy/tcplistener --self-contained false`
- [ ] 3.3 Builder le front React : `cd cantine-web && npm ci && npm run build` → sortie dans `cantine-web/dist/`
- [ ] 3.4 Créer `deploy/front/` et y copier le contenu de `cantine-web/dist/`
- [ ] 3.5 Ajouter `cantine-web/dist/web.config` avec règle SPA fallback (`<rule name="SPA" stopProcessing="true"><match url=".*"/><conditions><add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true"/></conditions><action type="Rewrite" url="/index.html"/></rule>`)

## 4. Configuration des secrets (Production)

- [ ] 4.1 Créer `deploy/api/appsettings.Production.json` avec les valeurs réelles : chaîne de connexion SQL Server, `JwtSecret`, `JwtIssuer`, `JwtAudience`, port TCP lecteurs
- [ ] 4.2 Définir la variable d'environnement IIS Application Pool : `ASPNETCORE_ENVIRONMENT=Production`
- [ ] 4.3 Vérifier que `appsettings.Production.json` est dans `.gitignore` (ne jamais committer les secrets)

## 5. Base de données (création manuelle obligatoire — pas d'auto-migration)

- [ ] 5.1 Créer la base de données SQL Server (ex. `CantineSEBN`) avec un compte ayant les droits `dbcreator`
- [ ] 5.2 Exécuter les 8 migrations EF Core : `dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API` — crée toutes les tables (Sites, Lecteurs, Employees, MealLogs, SyncLogs, AppUsers, UserAuditLogs)
- [ ] 5.3 Vérifier dans SQL Server Management Studio que les 8+ tables sont bien présentes
- [ ] 5.4 Créer l'utilisateur administrateur initial via l'endpoint `POST /api/auth/register` avec le rôle `AdminSEBN`

## 6. Déploiement IIS — API

- [ ] 6.1 Copier le dossier `deploy/api/` sur le serveur (ex. `C:\inetpub\cantine-api\`)
- [ ] 6.2 Créer un Application Pool dédié dans IIS : `CantineAPI`, .NET CLR version = "No Managed Code", mode pipeline Intégré
- [ ] 6.3 Créer un Site Web IIS (ou application virtuelle) pointant sur `C:\inetpub\cantine-api\`, lié au port choisi (ex. 5000 ou sous-chemin `/api`)
- [ ] 6.4 Vérifier que le `web.config` présent dans `deploy/api/` contient le handler `aspNetCore` avec `processPath="dotnet"` et `arguments="Cantine.API.dll"`
- [ ] 6.5 Tester l'API : `curl http://localhost:<port>/api/health` → doit retourner 200

## 7. Déploiement IIS — Front React

- [ ] 7.1 Copier le dossier `deploy/front/` sur le serveur (ex. `C:\inetpub\cantine-front\`)
- [ ] 7.2 Créer un Site Web IIS pointant sur `C:\inetpub\cantine-front\`, port 80
- [ ] 7.3 S'assurer que le `web.config` SPA fallback est bien présent dans `C:\inetpub\cantine-front\`
- [ ] 7.4 Mettre à jour `VITE_API_BASE_URL` dans `.env.production` (ex. `http://<ip-serveur>:<port>`) avant le build si pas encore fait, puis rebuilder (tâche 3.3) et recopier
- [ ] 7.5 Tester l'accès au front depuis un navigateur : la page de login doit s'afficher

## 8. Installation du Service Windows TcpListener

- [ ] 8.1 Copier le dossier `deploy/tcplistener/` sur le serveur (ex. `C:\Services\CantineTcpListener\`)
- [ ] 8.2 Enregistrer le service (nom interne `CantineTcpService` défini dans le code) : `sc.exe create CantineTcpService binPath="C:\Services\CantineTcpListener\Cantine.TcpListener.exe" start=auto DisplayName="Cantine TCP Listener"`
- [ ] 8.3 Démarrer le service : `sc.exe start CantineTcpService`
- [ ] 8.4 Vérifier dans le Gestionnaire de services que le service est `En cours d'exécution`
- [ ] 8.5 Consulter l'Observateur d'événements Windows (Application) pour vérifier l'absence d'erreurs au démarrage

## 9. Scripts PowerShell de déploiement

- [ ] 9.1 Créer `deploy/install.ps1` — script d'installation initiale (one-shot) : build, IIS, BDD, service Windows, pare-feu
- [ ] 9.2 Créer `deploy/update.ps1` — script de mise à jour rapide : rebuild, stop service, copie, `dotnet ef database update`, recycle pool IIS, restart service
- [ ] 9.3 Créer `deploy/web.config` — règle IIS SPA fallback pour le front React (réécriture vers `index.html`)
- [ ] 9.4 Créer `deploy/appsettings.Production.template.json` — modèle des secrets de production à remplir sur le serveur (API)
- [ ] 9.5 Créer `deploy/appsettings.TcpListener.Production.template.json` — modèle des secrets de production pour le service TCP
- [ ] 9.6 Ajouter `deploy/appsettings.Production.json` et `deploy/appsettings.TcpListener.Production.json` dans `.gitignore`

## 10. Validation post-déploiement

- [ ] 10.1 Se connecter avec le compte admin sur le front → login réussi, token JWT reçu
- [ ] 10.2 Vérifier le dashboard : KPI, histogrammes et feed SSE s'affichent sans erreur
- [ ] 10.3 Tester les filtres (date, site, type de repas) et vérifier que les données se mettent à jour
- [ ] 10.4 Tester l'export Excel : le fichier `.xlsx` est bien téléchargé et contient les données correctes
- [ ] 10.5 Simuler un passage lecteur (ou vérifier les logs TCP) pour confirmer la réception et l'enregistrement en BDD
- [ ] 10.6 Vérifier les logs IIS (`C:\inetpub\logs\`) et l'Observateur d'événements pour l'absence d'erreurs 500
