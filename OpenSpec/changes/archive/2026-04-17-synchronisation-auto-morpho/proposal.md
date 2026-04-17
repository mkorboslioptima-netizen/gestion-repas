## Why

L'import manuel des employés depuis MorphoManager nécessite une action humaine régulière pour maintenir la base CantineSEBN à jour. Les nouveaux arrivants ne peuvent pas pointer tant qu'ils ne sont pas importés manuellement, et les départs ne sont pas détectés. Une synchronisation automatique toutes les 6 heures, combinée à un bouton de synchronisation manuelle dans l'interface, garantit une base employés toujours à jour sans intervention quotidienne.

## What Changes

- Nouveau **job de synchronisation planifié** toutes les 6 heures dans `Cantine.TcpListener` (Windows Service existant) qui appelle `IMorphoEmployeeImporter.ImportAsync` pour chaque site actif configuré.
- Nouveau **bouton "Synchroniser"** dans la page Employés (en plus du bouton d'import déjà existant) — déclenche la même logique d'import mais depuis l'UI avec retour visuel en temps réel.
- Le résultat de chaque synchronisation automatique est **loggué** avec timestamp et compteurs (importés / mis à jour / ignorés).
- Les employés absents de MorphoManager et présents dans CantineSEBN sont **désactivés** (pas supprimés) lors de la synchro automatique.

## Capabilities

### New Capabilities
- `morpho-auto-sync` : synchronisation planifiée toutes les 6 heures pour tous les sites actifs ayant une `MorphoConfig`, avec désactivation automatique des employés absents de MorphoManager.

### Modified Capabilities
- `morpho-employee-import` : ajout d'un paramètre `desactiverAbsents` (bool, défaut `false` pour l'import manuel, `true` pour la synchro auto) afin de ne pas désactiver d'employés lors d'un import ponctuel déclenché manuellement.

## Impact

- **Cantine.TcpListener** : ajout d'un `IHostedService` de synchronisation planifiée (`MorphoSyncBackgroundService`).
- **Cantine.Infrastructure** : mise à jour de `MorphoEmployeeImporter` pour supporter la désactivation des absents.
- **Cantine.Core** : mise à jour de `IMorphoEmployeeImporter.ImportAsync` pour accepter `desactiverAbsents`.
- **Cantine.API** : endpoint `POST /api/employes/sync-morpho` (déclenche la synchro de tous les sites en background).
- **cantine-web** : bouton "Synchroniser" dans `EmployesPage`, avec état de chargement et résumé par site.
- **Dépendances** : aucune nouvelle dépendance NuGet.
