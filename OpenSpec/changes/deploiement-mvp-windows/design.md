## Context

Le client dispose d'un serveur Windows interne avec IIS 10, SQL Server Express 2022 et accès administrateur. Le MVP à déployer comprend :
- **Cantine.API** : ASP.NET Core 8 Web API avec JWT
- **Cantine.TcpListener** : Windows Service .NET 8 (écoute lecteurs biométriques Morpho)
- **cantine-web** : SPA React 18 + Vite (fichiers statiques)
- **Base de données** : SQL Server Express 2022

Le déploiement est entièrement on-premise, sans cloud ni conteneur.

## Goals / Non-Goals

**Goals:**
- Déployer l'API sur IIS en mode `InProcess` avec le .NET 8 Hosting Bundle
- Servir le front React comme fichiers statiques via IIS (site ou application virtuelle)
- Créer la base de données via `dotnet ef database update` depuis le serveur
- Installer `Cantine.TcpListener` comme service Windows natif (`sc create` ou `New-Service`)
- Paramétrer les secrets via `appsettings.Production.json` (jamais en dur dans le code)
- Fournir une checklist de validation end-to-end post-déploiement

**Non-Goals:**
- Déploiement conteneurisé (Docker, Kubernetes)
- CI/CD automatisé (pipeline GitHub Actions / Azure DevOps)
- Haute disponibilité / load balancing
- Migration de données depuis un système existant
- Configuration HTTPS/TLS (à traiter séparément selon certificat client)

## Decisions

### D1 — IIS InProcess pour l'API
**Choix :** Hébergement ASP.NET Core en mode `InProcess` (même pool applicatif que IIS).  
**Pourquoi :** Meilleures performances (pas de proxy inversé), plus simple à configurer sur Windows Server. `web.config` généré automatiquement par `dotnet publish`.  
**Alternative écartée :** Mode `OutOfProcess` (Kestrel derrière IIS) — complexité inutile pour cette charge.

### D2 — Front React servi par IIS comme site statique séparé
**Choix :** `npm run build` génère `dist/`, copié dans un dossier IIS dédié. Un `web.config` minimal avec réécriture URL (SPA fallback) est ajouté.  
**Pourquoi :** Découplage API / front, pas de SSR nécessaire pour ce projet.  
**Alternative écartée :** Servir les statics depuis l'API ASP.NET Core — couplage indésirable.

### D3 — Service Windows natif pour TcpListener
**Choix :** `dotnet publish` + `sc.exe create` (ou PowerShell `New-Service`) pour enregistrer `Cantine.TcpListener` comme service Windows.  
**Pourquoi :** Démarrage automatique au boot, gestion par le SCM Windows, logs via Event Viewer.  
**Alternative écartée :** Tâche planifiée Windows — pas de redémarrage automatique en cas de crash.

### D4 — Secrets via appsettings.Production.json
**Choix :** `ASPNETCORE_ENVIRONMENT=Production` + `appsettings.Production.json` non versionné (dans `.gitignore`).  
**Pourquoi :** Séparation claire dev/prod, pas d'exposition de secrets dans le dépôt Git.  
**Valeurs à configurer :** chaîne de connexion SQL, secret JWT, port TCP lecteurs.

### D5 — Migration BDD via dotnet ef sur le serveur
**Choix :** Exécuter `dotnet ef database update` depuis le serveur de déploiement avec un compte SQL ayant les droits `dbcreator`.  
**Pourquoi :** Migrations EF Core garantissent la cohérence du schéma, idempotentes.  
**Alternative écartée :** Script SQL manuel — risque de désynchronisation avec les migrations.

## Risks / Trade-offs

| Risque | Mitigation |
|--------|-----------|
| SQL Server Express limite 10 Go / pas de SQL Agent | Acceptable pour MVP ; prévoir upgrade si volume croît |
| Port TCP lecteurs (22090) bloqué par le pare-feu Windows | Ouvrir le port entrant dans les règles Windows Firewall dans le script de déploiement |
| `appsettings.Production.json` oublié sur le serveur lors d'une mise à jour | Documenter clairement que ce fichier est local et ne doit pas être écrasé |
| Rollback difficile si migration BDD cassante | Sauvegarder la BDD avant chaque `dotnet ef database update` |
| IIS Application Pool Identity sans droits suffisants sur la BDD | Utiliser un compte de service dédié ou SQL Auth dans la chaîne de connexion |

## Open Questions

1. **Port front-end** — l'API et le front sont-ils sur le même port (ex. `:80`) ou sur des ports séparés ? → Impacte la configuration CORS et le `baseURL` axios.
2. **Nom de domaine / IP** — accès par IP locale ou nom DNS interne ? → Impacte `JwtIssuer`, `JwtAudience` et la config `baseURL` du front.
3. **Compte SQL** — authentification Windows (SSPI) ou SQL Auth (login/mot de passe) ? → Impacte la chaîne de connexion.
4. **Certificat TLS** — HTTP ou HTTPS pour le MVP ? → Si HTTPS, quel certificat (auto-signé, Let's Encrypt interne) ?
