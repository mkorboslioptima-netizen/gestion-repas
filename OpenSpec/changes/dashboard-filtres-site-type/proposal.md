## Why

Le dashboard actuel ne permet pas de filtrer par type de repas (Plat chaud / Sandwich) ni par site (SEBN 1, SEBN 2, SEBN 3). Les responsables et l'administrateur ne peuvent donc pas isoler rapidement les données d'un site précis ou d'un type de repas particulier. De plus, il n'existe aucune visualisation comparative des repas servis par site.

## What Changes

- Ajouter un filtre **Type de repas** (Plat chaud / Sandwich / Tous) visible par tous les rôles dans le panneau de filtres du dashboard
- Ajouter un filtre **Site** (SEBN 1 / SEBN 2 / SEBN 3 / Tous) visible uniquement pour le rôle `AdminSEBN`
- Ajouter un histogramme **Repas par site** (barres groupées par site avec distinction plat chaud / sandwich), visible uniquement pour `AdminSEBN`
- Les filtres type et site s'appliquent côté frontend sur les données déjà chargées (pas de nouvel endpoint requis) ; le filtre site envoie en paramètre `siteId` à l'API si sélectionné

## Capabilities

### New Capabilities
- `filtre-type-repas` : Sélecteur Plat chaud / Sandwich / Tous dans DashboardFilters, appliqué sur KPI, graphiques et feed
- `filtre-site-admin` : Sélecteur site visible uniquement pour `AdminSEBN`, transmis comme paramètre aux appels API `stats-jour` et `historique-jour`
- `histogramme-repas-par-site` : BarChart groupé (plat chaud + sandwich) par site, visible uniquement pour `AdminSEBN`

### Modified Capabilities
- `dashboard-filtres` : `FiltreState` étendu avec `repasType?: string` et `siteId?: string`
- `meal-stats-jour` : L'endpoint accepte un paramètre optionnel `siteId` pour filtrer par site
- `meal-historique-jour` : L'endpoint accepte un paramètre optionnel `siteId` et `repasType` pour filtrage

## Impact

- **Frontend** : `DashboardFilters.tsx` — ajout des selects type repas et site (ce dernier conditionnel au rôle `AdminSEBN` via `useRole`)
- **Frontend** : `DashboardPage.tsx` — transmission des nouveaux filtres aux requêtes, filtrage local `repasType` sur feedPassages, ajout du graphique Repas par site
- **Backend API** : `RepasController` — paramètres `siteId` et `repasType` ajoutés aux endpoints `historique-jour` et `stats-jour`
- **Frontend** `src/api/repas.ts` — `FiltreParams` étendu avec `siteId?` et `repasType?`
- **Aucun changement** de schéma BDD
