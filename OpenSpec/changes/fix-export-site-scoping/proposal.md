## Why

Les utilisateurs avec les rôles `ResponsableCantine` (gestionnaire) et `Prestataire` ont accès à la page Dashboard. Lorsqu'ils consultent les statistiques, l'historique ou téléchargent un export Excel, ils reçoivent les données de **tous les sites** au lieu de leur site uniquement.

Cause racine : le `siteId` du JWT de l'utilisateur n'est jamais utilisé pour restreindre les requêtes côté serveur. Le filtre de site est uniquement visible par les admins côté frontend, donc les non-admins envoient `siteId: undefined` → les endpoints retournent tout.

## What Changes

### Backend (priorité haute — seul endroit sûr)
- `RepasController` : dans les 4 endpoints (`historique-jour`, `stats-jour`, `export`, `export-global`), forcer `siteId` à la valeur du claim JWT si l'utilisateur n'est pas `AdminSEBN`
- `RapportsController` : dans `GetRecapMensuel`, filtrer les passages par le `siteId` du JWT du prestataire

### Frontend (correction UX)
- `DashboardFilters.tsx` : initialiser l'état `siteId` avec `authSiteId` du JWT pour les non-admins, afin que les requêtes initiales portent déjà le bon site
- `DashboardPage.tsx` : initialiser `filtre.siteId` avec `authSiteId` pour les non-admins

## Capabilities

### Modified Capabilities
- `export-passages-excel` : les gestionnaires et prestataires n'exportent que les données de leur site
- `export-global-excel` : idem — résumé limité à leur site
- `stats-jour` : statistiques limitées au site de l'utilisateur pour les non-admins
- `historique-jour` : historique limité au site de l'utilisateur pour les non-admins
- `rapport-prestataire-mensuel` : rapport mensuel filtré par site du prestataire

## Impact

- **Backend** : `Cantine.API/Controllers/RepasController.cs` — ajout de 2 helpers + 4 lignes de guard
- **Backend** : `Cantine.API/Controllers/RapportsController.cs` — ajout filtre siteId
- **Frontend** : `cantine-web/src/components/DashboardFilters.tsx` — initialisation siteId pour non-admins
- **Frontend** : `cantine-web/src/pages/DashboardPage.tsx` — initialisation filtre.siteId pour non-admins
- **Aucun changement** de schéma BDD, DTOs, ni d'autres pages
