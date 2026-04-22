## Why

Lorsqu'un utilisateur sélectionne un matricule spécifique dans le filtre du dashboard, les KPI cards (Repas servis, Plats chauds, Sandwichs) continuent d'afficher les totaux globaux du jour — elles ne se synchronisent pas avec le filtre matricule. Seul le feed de passages en bas de page est filtré, et uniquement côté client. Ce comportement crée une incohérence : l'utilisateur voit des chiffres agrégés pour tous les employés alors qu'il consulte les passages d'un seul. Par exemple, si l'employé sélectionné a pris uniquement un sandwich ce jour-là, les KPI affichent toujours les totaux globaux au lieu de montrer Plats chauds = 0 et Sandwichs = 1.

## What Changes

- Les KPI cards (Repas servis, Plats chauds, Sandwichs) se recalculent dynamiquement selon le matricule sélectionné
- Quand aucun matricule n'est sélectionné : comportement inchangé, les KPI affichent les totaux globaux via l'API
- Quand un matricule est sélectionné : les KPI sont calculés localement depuis les données `historique` déjà chargées et filtrées par matricule — sans appel API supplémentaire
- Le filtre matricule existant dans `DashboardFilters.tsx` et la logique de filtrage client-side dans `feedPassages` sont conservés tels quels

## Capabilities

### Modified Capabilities
- `dashboard-kpi-sync` : Les valeurs des KPI cards reflètent la sélection matricule — recalcul local depuis `historique` filtré quand `filtre.matricule` est défini
- `filtre-matricule` : Le matricule est inclus dans le `filtreParams` transmis aux requêtes **uniquement** pour les besoins du recalcul local (pas de modification backend nécessaire)

## Impact

- **Frontend** : `DashboardPage.tsx` uniquement — calcul conditionnel des valeurs KPI
- **Aucun changement** backend (pas de nouvelle route, pas de modification BDD)
- **Aucun changement** sur `DashboardFilters.tsx`, `KpiCard.tsx`, ni `src/api/repas.ts`
