## Architecture

Aucune modification du schéma BDD. Les nouveaux filtres s'appuient sur les données existantes (`MealLogs.RepasType` et `MealLogs.SiteId`).

## Composants modifiés

### `DashboardFilters.tsx`
- `FiltreState` étendu : `repasType?: 'PlatChaud' | 'Sandwich'` et `siteId?: string`
- Ajout d'un `<Select>` **Type de repas** (options : Tous / Plat chaud / Sandwich) — visible par tous
- Ajout d'un `<Select>` **Site** (options : Tous + liste dynamique depuis `getSites()`) — conditionnel : rendu uniquement si `role === 'AdminSEBN'` via `useRole()`
- Les sites sont chargés une seule fois via `useQuery` sur `getSites()`
- `handleReset` remet `repasType` et `siteId` à `undefined`

### `DashboardPage.tsx`
- `filtreParams` inclut `siteId` et `repasType` transmis aux requêtes `getStatsJour` et `getHistoriqueJour`
- Filtrage local `feedPassages` : si `filtre.repasType` est défini, filtrer le tableau `feedPassages` par `p.repasType === filtre.repasType`
- Nouvel histogramme **Repas par site** — `<BarChart>` avec deux `<Bar>` (platChaud: #16a34a, sandwich: #7c3aed) groupées par site — visible uniquement `AdminSEBN` via `<RoleGate allowed={['AdminSEBN']}>`
- Les données de l'histogramme sont calculées depuis `stats` : `stats.map(s => ({ site: s.nomSite, platChaud: s.platChaud, sandwich: s.sandwich }))`

### `src/api/repas.ts`
```typescript
export interface FiltreParams {
  dateDebut?: string;
  dateFin?: string;
  heureDebut?: string;
  heureFin?: string;
  siteId?: string;      // nouveau
  repasType?: string;   // nouveau
}
```

### Backend — `RepasController.cs`

**`GET /api/repas/stats-jour`** — nouveau paramètre optionnel :
```csharp
[FromQuery] string? siteId = null
```
Si `siteId` est fourni, la boucle `foreach (var site in sites)` est filtrée pour ne traiter que le site correspondant.

**`GET /api/repas/historique-jour`** — nouveaux paramètres optionnels :
```csharp
[FromQuery] string? siteId = null,
[FromQuery] string? repasType = null
```
Ajout de conditions `.Where()` dans la requête LINQ si ces paramètres sont non-null :
```csharp
.Where(m => siteId == null || m.SiteId == siteId)
.Where(m => repasType == null || m.RepasType.ToString() == repasType)
```

## Règles de visibilité

| Élément | AdminSEBN | ResponsableCantine | Prestataire |
|---|---|---|---|
| Filtre Type repas | ✅ | ✅ | ✅ |
| Filtre Site | ✅ | ❌ | ❌ |
| Histogramme Repas par site | ✅ | ❌ | ❌ |

## Disposition UI

```
[Filtres existants: dates / heures] [Type repas ▾] [Site ▾ — AdminSEBN only] [Appliquer] [Réinitialiser]

KPI cards (inchangées, agrégées selon filtre site+type)

[Répartition plats — pie]  [Passages par heure — bar]

[Repas par site — bar groupé — AdminSEBN only]   ← nouvelle ligne

[Feed table]
```

## Flux de données

```
DashboardFilters
  ├── onChange type repas → FiltreState.repasType
  └── onChange site → FiltreState.siteId (AdminSEBN only)
        ↓
DashboardPage.filtre
  ├── filtreParams → getStatsJour({ ...params, siteId }) → stats[]
  │     └── histogramme par site ← stats (AdminSEBN)
  ├── filtreParams → getHistoriqueJour({ ...params, siteId, repasType }) → historique[]
  │     └── feedPassages (filtre repasType local si SSE actif)
  └── KPI agrégés depuis stats[]
```
