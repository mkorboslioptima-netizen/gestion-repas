## Why

Depuis l'ajout des filtres sur la page Employés, l'AdminSEBN ne dispose pas d'un sélecteur de site dans la barre de filtres — il doit utiliser le sélecteur dans la section Import (liée au `SiteContext` global) pour changer de site. Ce couplage est confus. De plus, l'export Excel ignore les filtres actifs (statut, quota, recherche texte) et exporte toujours tous les employés du site, ce qui ne correspond pas à ce que l'utilisateur voit à l'écran.

## What Changes

- Ajouter un sélecteur **Site** dans la barre de filtres, visible uniquement pour `AdminSEBN`
- Ce sélecteur pilote directement `tableSiteId` (déconnecté du `SiteContext` de l'import)
- L'export Excel accepte les paramètres de filtre (`actif`, `maxMealsPerDay`, `search`) et exporte uniquement les employés correspondant aux filtres actifs
- Le titre du tableau et le nom de fichier exporté reflètent le site sélectionné

## Capabilities

### Modified Capabilities
- `filtre-employes-site` : Nouveau Select Site dans la barre de filtres (AdminSEBN uniquement), indépendant du SiteContext de l'import
- `export-excel-employes` : L'endpoint `GET /api/employes/export` accepte `actif?`, `maxMealsPerDay?` et `search?` pour filtrer côté serveur selon les filtres actifs
- `employes-table` : `tableSiteId` est désormais piloté par `filtreSite` (état local) initialisé sur le premier site disponible

## Impact

- **Frontend** : `EmployesPage.tsx` — ajout état `filtreSite`, Select Site dans la barre de filtres, passage des filtres à `getExportEmployes`
- **Frontend** : `src/api/employes.ts` — `getExportEmployes` accepte les paramètres de filtre
- **Backend** : `EmployesController.cs` — endpoint export enrichi avec `actif?`, `maxMealsPerDay?`, `search?`
- **Backend** : `ExcelExportService.cs` — `GenererExportEmployesAsync` accepte les filtres optionnels
- **Aucun changement** de schéma BDD
