## Why

La page Employés liste tous les employés d'un site sans possibilité de filtrer par période d'activité repas. Un administrateur ou gestionnaire ne peut pas savoir rapidement quels employés ont déjeuné sur une période donnée (semaine, mois) sans passer par le dashboard. Ajouter un filtre date permet d'isoler instantanément les employés actifs sur une période précise et d'exporter cette liste ciblée.

## What Changes

- Ajouter un sélecteur de plage de dates (**Date début / Date fin**) dans la barre de filtres de la page Employés
- Quand un filtre date est actif, seuls les employés ayant au moins un repas enregistré dans la période s'affichent
- Sans filtre date : comportement inchangé (tous les employés du site)
- L'endpoint `GET /api/employes` accepte `dateDebut` et `dateFin` optionnels et effectue une jointure avec `MealLogs`
- L'export Excel respecte le filtre date (exporte uniquement les employés filtrés)

## Capabilities

### Modified Capabilities
- `filtre-employes-date` : RangePicker date dans la barre de filtres, transmet `dateDebut`/`dateFin` à l'API
- `employes-list-api` : `GET /api/employes` accepte `dateDebut?` et `dateFin?` — filtre les employés ayant au moins un MealLog dans la période
- `export-excel-employes` : `GET /api/employes/export` accepte `dateDebut?` et `dateFin?` — même logique de jointure

## Impact

- **Backend** : `EmployesController.cs` — ajout `dateDebut?`, `dateFin?` sur `GetEmployes` et `ExportExcel`
- **Backend** : `ExcelExportService.cs` — `GenererExportEmployesAsync` accepte `dateDebut?`/`dateFin?`
- **Frontend** : `EmployesPage.tsx` — ajout `RangePicker` dans la barre de filtres, transmission des dates à l'API et à l'export
- **Frontend** : `src/api/employes.ts` — `getEmployes` et `getExportEmployes` acceptent les dates
- **Aucun changement** de schéma BDD (jointure sur `MealLogs` existant)
