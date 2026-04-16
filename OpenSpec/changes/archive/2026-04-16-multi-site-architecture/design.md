## Context

CantineSEBN est actuellement une application mono-site : toutes les entités (Employees, Lecteurs, MealLogs) appartiennent implicitement à une seule cantine. Avec l'ajout de SEBN-TN01 et SEBN-TN02 (et potentiellement un troisième site), l'architecture doit évoluer vers un modèle multi-tenant à base de données partagée (Option B — single DB, SiteId discriminant).

Les serveurs des deux sites communiquent entre eux, ce qui rend une base SQL Server centralisée viable. L'AdminSEBN doit avoir une vue consolidée de tous les sites depuis une seule interface.

## Goals / Non-Goals

**Goals:**
- Ajouter une table `Sites` et propager `SiteId` sur toutes les entités existantes.
- Rendre la PK de `Employee` composite `(SiteId, Matricule)`.
- Stocker la configuration MorphoManager par site en base de données (`MorphoConfigs`).
- Intégrer `siteId` dans le JWT pour le contrôle d'accès.
- Seeder les sites SEBN-TN01 et SEBN-TN02 dans la migration initiale.
- Exposer un `SitesController` pour la gestion des sites et de leurs configs.

**Non-Goals:**
- Synchronisation inter-sites des employés (chaque site est autonome).
- Gestion de plusieurs bases SQL Server (toutes les données sont dans une seule DB centralisée).
- Interface de changement de site pour AdminCantine (ils n'ont accès qu'à leur propre site).
- Authentification et gestion des utilisateurs (couvert par le projet Node.js existant — à synchroniser en Phase 2).

## Decisions

### 1. Stratégie multi-tenant : DB partagée avec SiteId discriminant
**Choix :** Une seule base `CantineSEBN` avec une colonne `SiteId` sur chaque table métier.
**Pourquoi :** Les serveurs communiquent, le volume est faible (2-3 sites, quelques centaines d'employés par site). Une DB centralisée simplifie les migrations, les backups et la vue consolidée de l'AdminSEBN.
**Alternative écartée :** Une DB par site (schema-based multi-tenancy) — migrations à rejouer N fois, pas de requêtes croisées natives.

### 2. PK composite (SiteId, Matricule) sur Employee
**Choix :** Clé primaire composite plutôt qu'un Id surrogate.
**Pourquoi :** Le matricule est l'identifiant métier utilisé par les lecteurs Morpho lors des pointages. Un surrogate int `Id` nécessiterait de joindre sur `SiteId + Matricule` partout de toute façon. La PK composite est plus explicite et correspond au domaine.
**Conséquence :** `MealLog` référence `Employee` via `(SiteId, Matricule)` — les deux colonnes doivent être présentes dans `MealLog`.

### 3. MorphoConfig en base de données
**Choix :** Table `MorphoConfigs` (SiteId PK, ConnectionString, Query, CommandTimeout) plutôt que `appsettings.json`.
**Pourquoi :** L'AdminSEBN peut reconfigurer la connexion MorphoManager sans redéploiement. La configuration est visible et auditable depuis l'interface. Cohérent avec l'entité `Site`.
**Alternative écartée :** Section `MorphoManager:Sites:TN01:ConnectionString` dans `appsettings.json` — nécessite un redéploiement pour toute modification, et ne scale pas.
**Note sécurité :** La `ConnectionString` dans la DB est un secret. Chiffrement au repos à ajouter en production (différé Phase 1).

### 4. SiteContext injecté via ISiteContext
**Choix :** Interface `ISiteContext` (Cantine.Core) implémentée par `HttpSiteContext` (Cantine.API) qui lit le claim `siteId` du JWT.
**Pourquoi :** Les repositories Core ne doivent pas accéder au HttpContext directement (violation de couches). `ISiteContext` isole cette dépendance dans la couche API.
**Comportement :** Si `siteId` est absent du token (AdminSEBN global) → `ISiteContext.SiteId` retourne `null` → accès à tous les sites.

### 5. Nouveau rôle Prestataire
**Choix :** Rôle `Prestataire` avec `siteId` dans le JWT. Accès lecture seule aux endpoints stats (`GET /api/stats/*`).
**Pourquoi :** Chaque cantine a un prestataire externe différent. Le prestataire doit voir les états de consommation mais ne peut pas modifier les données.
**Note :** La création des comptes Prestataire reste manuelle (via le projet Node.js existant) en Phase 1.

### 6. Seed des sites initiaux dans la migration
**Choix :** `HasData()` dans `SiteConfiguration.cs` pour seeder SEBN-TN01 et SEBN-TN02.
**Pourquoi :** Les sites doivent exister avant tout import d'employés ou pointage. Le seed en migration garantit leur présence dès le `dotnet ef database update`.

## Risks / Trade-offs

- **Migration destructive sur Employee (PK change)** → En Phase 1, la table est vide (pas encore d'import). La migration peut recréer la table proprement. En production, un plan de migration avec backup préalable est requis.
- **Connexions MorphoManager en DB (secret)** → Acceptable en Phase 1 (réseau interne). Chiffrement à prévoir avant exposition externe.
- **Filtrage SiteId oublié dans un repository** → Risque de fuite de données inter-sites. Mitigation : revue systématique de tous les repositories lors de l'apply. À renforcer avec des tests d'intégration en Phase 2.
- **AdminSEBN sans siteId dans le token** → La logique `null = accès global` doit être explicitement documentée et testée.

## Migration Plan

1. Créer et appliquer la migration `AddMultiSiteSupport` (table Sites, SiteId sur toutes les entités, MorphoConfigs, seed TN01/TN02).
2. Vérifier que la migration s'applique proprement sur une DB vide (Phase 1).
3. Déployer la nouvelle version de l'API.
4. **Rollback :** Impossible sans perte de données si des employés ont été importés. Avant toute mise en production, backup complet de la DB.

## Open Questions

- Le projet Node.js existant gère-t-il déjà les utilisateurs avec un claim `siteId` dans le JWT ? Si oui, quel est le nom exact du claim ? Si non, comment seront créés les comptes AdminCantine et Prestataire en Phase 1 ?
- Le serveur central héberge-t-il SQL Server, ou est-ce un des deux sites qui sert de référence ?
