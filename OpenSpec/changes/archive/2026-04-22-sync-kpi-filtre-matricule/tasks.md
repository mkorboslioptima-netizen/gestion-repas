# Tasks — sync-kpi-filtre-matricule

## T1 — ✅ Ajouter les variables KPI dérivées dans `DashboardPage.tsx`

Fichier : `cantine-web/src/pages/DashboardPage.tsx`

Après le bloc `filteredFeed` (ligne ~219), ajouter :

```typescript
const kpiPassages  = filtre.matricule ? filteredFeed.length : totalPassages;
const kpiPlatChaud = filtre.matricule
  ? filteredFeed.filter(p => p.repasType === 'PlatChaud').length
  : totalPlatChaud;
const kpiSandwich  = filtre.matricule
  ? filteredFeed.filter(p => p.repasType === 'Sandwich').length
  : totalSandwich;
```

## T2 — ✅ Mettre à jour les KPI cards dans le JSX

Fichier : `cantine-web/src/pages/DashboardPage.tsx` (section KPI grid, lignes ~254-272)

- KPI "Repas servis" : `value={kpiPassages}`, `percent={Math.min(100, Math.round(kpiPassages / 5))}`, `trend={jourUnique && !filtre.matricule ? trendPassages : undefined}`
- KPI "Plats chauds" : `value={kpiPlatChaud}`, `percent={kpiPassages ? Math.round(kpiPlatChaud / kpiPassages * 100) : 0}`, `trend={jourUnique && !filtre.matricule ? trendPlatChaud : undefined}`
- KPI "Sandwichs" : `value={kpiSandwich}`, `percent={kpiPassages ? Math.round(kpiSandwich / kpiPassages * 100) : 0}`, `trend={jourUnique && !filtre.matricule ? trendSandwich : undefined}`

Note : le `trend` est désactivé (`undefined`) quand un matricule est sélectionné car la comparaison avec hier n'est pas calculée pour un employé individuel.

## T3 — ✅ Mettre à jour `pieData` pour utiliser les valeurs KPI synchronisées

Fichier : `cantine-web/src/pages/DashboardPage.tsx` (ligne ~223)

Remplacer :
```typescript
const pieData = useMemo(() => [
  { name: 'Plats chauds', value: totalPlatChaud },
  { name: 'Sandwich', value: totalSandwich },
], [totalPlatChaud, totalSandwich]);
```

Par :
```typescript
const pieData = useMemo(() => [
  { name: 'Plats chauds', value: kpiPlatChaud },
  { name: 'Sandwich', value: kpiSandwich },
], [kpiPlatChaud, kpiSandwich]);
```

## T4 — Test manuel

- Sélectionner un matricule ayant uniquement des sandwichs → vérifier KPI : Plats chauds = 0, Sandwichs = N
- Sélectionner un matricule sans aucun passage → vérifier KPI : tous à 0
- Désélectionner le matricule → vérifier que les KPI reviennent aux totaux globaux
- Vérifier que le graphique "Répartition plats" (pie) reflète aussi les valeurs filtrées
- Vérifier qu'aucune régression sur les autres filtres (site, type repas, dates)
