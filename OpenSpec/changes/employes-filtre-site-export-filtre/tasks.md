# Tasks — employes-filtre-site-export-filtre

## T1 — ✅ Enrichir `GenererExportEmployesAsync` dans `ExcelExportService.cs`

Fichier : `Cantine.Infrastructure/Services/ExcelExportService.cs`

- Ajouter les paramètres `string? search = null`, `bool? actif = null`, `int? maxMealsPerDay = null`
- Ajouter les `.Where()` LINQ pour `actif` et `maxMealsPerDay` avant `ToListAsync()`
- Ajouter le filtre en mémoire pour `search` (matricule/nom/prénom, insensible à la casse) après `ToListAsync()`
- Ajouter un bloc "Filtres appliqués" dans la feuille (lignes 1-3) si au moins un filtre est actif : afficher Site, Statut, Quota, Recherche selon les valeurs non-null

## T2 — ✅ Enrichir l'endpoint `GET /api/employes/export` dans `EmployesController.cs`

Fichier : `Cantine.API/Controllers/EmployesController.cs`

- Ajouter `[FromQuery] string? search = null`, `[FromQuery] bool? actif = null`, `[FromQuery] int? maxMealsPerDay = null` à la signature de `ExportExcel`
- Passer ces paramètres à `_excelService.GenererExportEmployesAsync(siteId, search, actif, maxMealsPerDay)`

## T3 — ✅ Enrichir `getExportEmployes` dans `src/api/employes.ts`

Fichier : `cantine-web/src/api/employes.ts`

- Ajouter l'interface `ExportEmployesParams { search?: string; actif?: boolean; maxMealsPerDay?: number; }`
- Modifier `getExportEmployes(siteId: string, filtres?: ExportEmployesParams)` pour passer `{ siteId, ...filtres }` en params

## T4 — ✅ Ajouter le filtre Site et synchroniser l'export dans `EmployesPage.tsx`

Fichier : `cantine-web/src/pages/admin/EmployesPage.tsx`

- Ajouter l'état `const [filtreSite, setFiltreSite] = useState<string | null>(null)`
- Ajouter un `useEffect` pour initialiser `filtreSite` sur `sites[0].siteId` quand les sites sont chargés et `filtreSite === null`
- Remplacer `tableSiteId` : `isAdmin ? (filtreSite ?? sites[0]?.siteId ?? null) : (authSiteId ?? null)`
- Ajouter dans la barre de filtres (en premier, conditionnel `isAdmin`) un `<Select>` Site avec les options de `sites`
- Mettre à jour `handleExportExcel` pour passer `{ search: search || undefined, actif: filtreStatut === 'tous' ? undefined : filtreStatut === 'actif', maxMealsPerDay: filtreQuota === 'tous' ? undefined : Number(filtreQuota) }` à `getExportEmployes`
- Supprimer la dépendance à `useSite()` pour `tableSiteId` (garder `setSiteId` uniquement pour le sélecteur d'import si nécessaire)

## T5 — Test manuel

- Se connecter en AdminSEBN → vérifier que le Select Site apparaît dans la barre de filtres
- Changer de site → vérifier que le tableau se recharge avec les employés du nouveau site
- Appliquer filtre Statut = Inactif + Quota = 2 → export Excel → vérifier que le fichier contient uniquement les inactifs avec quota 2
- Rechercher "BEN" + export Excel → vérifier que seuls les employés correspondant sont dans le fichier
- Se connecter en ResponsableCantine → vérifier que le Select Site n'apparaît pas
