## Why

CantineSEBN doit gérer plusieurs sites physiques distincts (SEBN-TN01, SEBN-TN02, potentiellement un troisième). Chaque site possède ses propres employés, son propre lecteur Morpho, son propre prestataire de restauration et ses propres statistiques. L'architecture mono-site actuelle ne permet pas cette séparation : un AdminSEBN global doit pouvoir consulter tous les sites, chaque site a son propre administrateur interne et son prestataire (accès lecture seule), et les données d'un site ne doivent pas être visibles par les acteurs d'un autre site.

## What Changes

- **BREAKING** : `Employee.Matricule` n'est plus une PK simple — la PK devient composite `(SiteId, Matricule)` car le même matricule peut exister sur deux sites différents (deux personnes distinctes).
- Nouvelle entité `Site` (SiteId, Nom, Actif) — table de référence des sites.
- Nouvelle entité `MorphoConfig` (SiteId, ConnectionString, Query, CommandTimeout) — stocke la configuration de chaque base MorphoManager en DB plutôt qu'en `appsettings.json`.
- Ajout de `SiteId` comme colonne discriminante sur `Lecteurs` et `MealLogs`.
- Le JWT intègre un claim `siteId` : `null` pour AdminSEBN (accès global), valeur fixe pour AdminCantine et Prestataire.
- Seed initial des sites SEBN-TN01 et SEBN-TN02 dans la migration EF Core.
- Tous les repositories filtrent désormais par `SiteId` extrait du contexte utilisateur.
- **Nouveau rôle** `Prestataire` : accès lecture seule aux stats du site assigné.

## Capabilities

### New Capabilities
- `site-management` : gestion des sites (liste, création, activation/désactivation) et de leur configuration MorphoManager.
- `site-scoped-access` : contrôle d'accès basé sur le site — chaque acteur ne voit que les données de son site (ou tous les sites pour AdminSEBN).

### Modified Capabilities
<!-- Aucune spec fonctionnelle existante dans openspec/specs/ — pas de delta nécessaire. -->

## Impact

- **Cantine.Core** : `Site.cs`, `MorphoConfig.cs` (entités) ; `SiteId` sur `Employee`, `Lecteur`, `MealLog` ; PK composite `Employee`.
- **Cantine.Infrastructure** : `SiteConfiguration.cs`, `MorphoConfigConfiguration.cs` ; migration EF Core `AddMultiSiteSupport` ; tous les repositories mis à jour pour filtrer par `SiteId`.
- **Cantine.API** : `SiteId` extrait du JWT dans un `ISiteContext` injecté ; `SitesController` (CRUD sites + MorphoConfig) ; middleware de validation du site.
- **cantine-web** : sélecteur de site pour AdminSEBN ; toutes les pages existantes transmettent le `siteId` dans les requêtes API.
- **Base de données** : migration destructive sur `Employees` (PK change) — nécessite un plan de migration en production.
- **Dépendances** : aucune nouvelle dépendance NuGet.
