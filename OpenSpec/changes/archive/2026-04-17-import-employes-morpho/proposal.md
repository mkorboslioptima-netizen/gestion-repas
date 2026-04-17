## Why

La table `Employees` de CantineSEBN est vide à l'installation. MorphoManager, le logiciel de gestion des lecteurs biométriques Morpho, maintient déjà la base de référence des employés (Matricule, Nom, Prénom) dans sa propre base SQL Server locale — une instance par site (SEBN-TN01, SEBN-TN02). Un import ponctuel depuis cette source évite une double saisie et garantit la cohérence des matricules utilisés lors des pointages.

## What Changes

- Nouveau endpoint `POST /api/employes/import-morpho/{siteId}` qui lit la base MorphoManager du site concerné et insère les employés manquants dans `CantineSEBN.Employees` pour ce site.
- La chaîne de connexion MorphoManager est lue depuis la table `MorphoConfigs` en base de données (configurée dans la page Sites par l'AdminSEBN) — **pas d'appsettings.json**.
- L'import est **idempotent** : un employé déjà présent (même SiteId + Matricule) est mis à jour (Nom/Prénom) sans doublon.
- Résultat retourné : nombre d'employés importés, mis à jour et ignorés.
- Bouton "Importer depuis MorphoManager" dans la page Employés de l'interface React (accès `AdminSEBN` uniquement, avec sélection du site).

## Capabilities

### New Capabilities
- `morpho-employee-import` : import ponctuel des employés depuis la base SQL Server MorphoManager d'un site vers `CantineSEBN.Employees`, avec idempotence et résumé du résultat.

### Modified Capabilities
<!-- Aucune spec existante dans openspec/specs/ ne couvre les employés — pas de delta nécessaire. -->

## Impact

- **Cantine.Core** : nouvelle interface `IMorphoEmployeeImporter` + DTO `ImportResultDto`
- **Cantine.Infrastructure** : implémentation `MorphoEmployeeImporter` (lit `MorphoConfigs` depuis le DbContext, puis connexion SqlClient vers la base MorphoManager du site)
- **Cantine.API** : nouveau controller `EmployesController` + endpoint import site-aware
- **cantine-web** : page Employés avec bouton d'import (sélecteur de site pour AdminSEBN)
- **Prérequis** : le change `multi-site-architecture` DOIT être appliqué avant ce change (table `MorphoConfigs` nécessaire)
- **Dépendance NuGet** : `Microsoft.Data.SqlClient` (déjà transitif via EF Core)
