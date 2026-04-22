## Architecture

Aucune modification backend, aucun changement de schéma BDD, aucun nouvel endpoint.

La solution repose sur un recalcul conditionnel des valeurs KPI côté frontend : quand `filtre.matricule` est défini, les KPI sont calculés depuis `filteredFeed` (déjà filtré par matricule) plutôt que depuis `stats` (API agrégée globale).

## Analyse du problème

Dans `DashboardPage.tsx` :

```
stats (API) ──────────────── totalPassages / totalPlatChaud / totalSandwich ──→ KPI cards
                                                                                    ↑ pas de matricule
historique (API) ──┐
ssePassages ───────┴──→ feedPassages ──→ filteredFeed (filtre matricule client-side)
                                              ↑ matricule appliqué ici, mais pas remonté aux KPI
```

La correction consiste à "court-circuiter" l'agrégation `stats` quand un matricule est sélectionné :

```
filtre.matricule défini ?
  ├── OUI → KPI calculés depuis filteredFeed (count local)
  └── NON → KPI calculés depuis stats (comportement actuel inchangé)
```

## Composant modifié

### `DashboardPage.tsx` — recalcul conditionnel des KPI

Après la ligne `filteredFeed` (ligne ~219), ajouter des variables dérivées pour les KPI :

```typescript
const kpiPassages  = filtre.matricule ? filteredFeed.length : totalPassages;
const kpiPlatChaud = filtre.matricule
  ? filteredFeed.filter(p => p.repasType === 'PlatChaud').length
  : totalPlatChaud;
const kpiSandwich  = filtre.matricule
  ? filteredFeed.filter(p => p.repasType === 'Sandwich').length
  : totalSandwich;
```

Puis dans le JSX des KPI cards, remplacer `totalPassages` / `totalPlatChaud` / `totalSandwich` par `kpiPassages` / `kpiPlatChaud` / `kpiSandwich`.

Les calculs de `percent` et `trend` utilisent aussi ces variables dérivées :
- `percent` de "Plats chauds" : `kpiPassages ? Math.round(kpiPlatChaud / kpiPassages * 100) : 0`
- `percent` de "Sandwichs" : `kpiPassages ? Math.round(kpiSandwich / kpiPassages * 100) : 0`
- `trend` : quand un matricule est sélectionné, pas de comparaison avec hier pertinente → passer `undefined` pour désactiver le trend

Note : `totalQuota` et `trendQuota` ne sont pas affichés dans les KPI cards actuelles, ils restent inchangés.

## Comportement attendu

| Situation | Repas servis | Plats chauds | Sandwichs |
|-----------|-------------|--------------|-----------|
| Aucun filtre | totaux globaux API (inchangé) | totaux globaux API (inchangé) | totaux globaux API (inchangé) |
| Matricule X sélectionné, a pris 1 sandwich | 1 | 0 | 1 |
| Matricule X sélectionné, a pris 2 plats chauds | 2 | 2 | 0 |
| Matricule X sélectionné, aucun passage | 0 | 0 | 0 |

## Flux de données après correction

```
DashboardFilters
  └── filtre.matricule
        ↓
DashboardPage
  ├── stats (API) → totalPassages / totalPlatChaud / totalSandwich (inchangés)
  ├── filteredFeed (client-side, inclut matricule)
  │     ↓
  ├── kpiPassages  = filtre.matricule ? filteredFeed.length : totalPassages
  ├── kpiPlatChaud = filtre.matricule ? filteredFeed.filter(PlatChaud).length : totalPlatChaud
  └── kpiSandwich  = filtre.matricule ? filteredFeed.filter(Sandwich).length : totalSandwich
        ↓
  KPI cards (synchronized with matricule filter)
```

## Disposition UI

Aucun changement de layout. Les KPI cards restent à la même position, seules leurs valeurs changent dynamiquement.
