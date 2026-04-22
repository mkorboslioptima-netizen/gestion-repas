# Tasks — dashboard-filtres-site-type

## T1 — ✅ Étendre `FiltreParams` dans `src/api/repas.ts`
- Ajouter `siteId?: string` et `repasType?: string` à l'interface `FiltreParams`
- Vérifier que `getStatsJour` et `getHistoriqueJour` passent bien tous les champs de `FiltreParams` en query params (déjà le cas via `{ params }`)

## T2 — ✅ Étendre `FiltreState` et mettre à jour `DashboardFilters.tsx`
- Ajouter `repasType?: 'PlatChaud' | 'Sandwich'` et `siteId?: string` à `FiltreState`
- Importer `useRole` depuis `../auth/useRole` et `getSites` depuis `../api/sites`
- Charger les sites via `useQuery({ queryKey: ['sites'], queryFn: getSites })`
- Ajouter un `<Select>` **Type de repas** (options : `undefined`→"Tous", `'PlatChaud'`→"Plat chaud", `'Sandwich'`→"Sandwich")
- Ajouter un `<Select>` **Site** conditionnel `{role === 'AdminSEBN' && ...}` (options : `undefined`→"Tous sites" + `site.siteId`/`site.nom` pour chaque site actif)
- Mettre à jour `handleApply` pour inclure `repasType` et `siteId`
- Mettre à jour `handleReset` pour réinitialiser `repasType` et `siteId` à `undefined`

## T3 — ✅ Mettre à jour `DashboardPage.tsx`
- Mettre à jour `defaultFiltre()` : `repasType: undefined, siteId: undefined`
- Mettre à jour `filtreParams` (useMemo) pour inclure `siteId: filtre.siteId` et `repasType: filtre.repasType`
- Appliquer un filtre local sur `feedPassages` : si `filtre.repasType` est défini, filtrer par `p.repasType === filtre.repasType`
- Ajouter la section histogramme **Repas par site** (voir T4) dans la grille, enveloppée dans `<RoleGate allowed={['AdminSEBN']}>`

## T4 — ✅ Histogramme "Repas par site" dans `DashboardPage.tsx`
- Calculer `siteData = stats.map(s => ({ site: s.nomSite, platChaud: s.platChaud, sandwich: s.sandwich }))`
- Ajouter un `<BarChart>` groupé avec :
  - `<Bar dataKey="platChaud" fill="#16a34a" name="Plat chaud" radius={[3,3,0,0]} />`
  - `<Bar dataKey="sandwich" fill="#7c3aed" name="Sandwich" radius={[3,3,0,0]} />`
  - `<XAxis dataKey="site" />`, `<YAxis allowDecimals={false} />`, `<Legend />`, `<Tooltip />`, `<CartesianGrid>`
- Envelopper le graphique dans une card identique aux autres graphiques du dashboard
- Envelopper la `<Col>` dans `<RoleGate allowed={['AdminSEBN']}>`

## T5 — ✅ Backend : paramètre `siteId` dans `RepasController.cs` — `GetStatsJour`
- Ajouter `[FromQuery] string? siteId = null` à la signature de `GetStatsJour`
- Filtrer la liste des sites : si `siteId` est non-null, `sites = sites.Where(s => s.SiteId == siteId).ToList()`

## T6 — ✅ Backend : paramètres `siteId` et `repasType` dans `RepasController.cs` — `GetHistoriqueJour`
- Ajouter `[FromQuery] string? siteId = null` et `[FromQuery] string? repasType = null` à la signature
- Dans la requête LINQ filtrée, ajouter :
  - `.Where(m => siteId == null || m.SiteId == siteId)`
  - `.Where(m => repasType == null || m.RepasType.ToString() == repasType)`
- Faire de même dans la requête du mode défaut (ajouter un `Where` avant `GetHistoriqueJourAsync`, ou passer le filtre à la méthode de repo si nécessaire)

## T7 — ✅ Test manuel
- Vérifier que le filtre Type repas masque / affiche les bons passages dans le feed et met à jour les KPI
- Vérifier que le filtre Site est invisible pour `ResponsableCantine` et visible pour `AdminSEBN`
- Vérifier que l'histogramme Repas par site s'affiche correctement pour `AdminSEBN` avec des barres groupées
- Vérifier que réinitialiser les filtres remet tout à l'état par défaut
