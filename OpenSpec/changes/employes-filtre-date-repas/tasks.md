# Tasks — employes-filtre-date-repas

## T1 — Enrichir `GET /api/employes` dans `EmployesController.cs`

Fichier : `Cantine.API/Controllers/EmployesController.cs`

- [x] Ajouter `[FromQuery] string? dateDebut = null, [FromQuery] string? dateFin = null` à `GetEmployes`
- [x] Si les deux dates sont fournies et parsables (`DateOnly.TryParse`), calculer `start`/`end` et filtrer via sous-requête :
  ```
  var matriculesAvecRepas = _context.MealLogs
      .Where(m => m.SiteId == siteId && m.Timestamp >= start && m.Timestamp <= end)
      .Select(m => m.Matricule).Distinct();
  query = query.Where(e => matriculesAvecRepas.Contains(e.Matricule));
  ```

## T2 — Enrichir `GenererExportEmployesAsync` dans `ExcelExportService.cs`

Fichier : `Cantine.Infrastructure/Services/ExcelExportService.cs`

- [x] Ajouter `DateTime? dateDebut = null, DateTime? dateFin = null` à la signature
- [x] Même logique de sous-requête MealLogs si les dates sont fournies
- [x] Ajouter "Période repas : DD/MM/YYYY → DD/MM/YYYY" dans le bloc filtres du fichier Excel si dates actives

## T3 — Enrichir `ExportExcel` dans `EmployesController.cs`

Fichier : `Cantine.API/Controllers/EmployesController.cs`

- [x] Ajouter `[FromQuery] string? dateDebut = null, [FromQuery] string? dateFin = null` à `ExportExcel`
- [x] Parser les dates en `DateTime?` et les transmettre à `_excelService.GenererExportEmployesAsync`

## T4 — Enrichir `getEmployes` et `ExportEmployesParams` dans `src/api/employes.ts`

Fichier : `cantine-web/src/api/employes.ts`

- [x] Ajouter `dateDebut?: string; dateFin?: string` à `ExportEmployesParams`
- [x] Modifier `getEmployes(siteId, dateDebut?, dateFin?)` pour passer les dates en params

## T5 — Ajouter le `RangePicker` et synchroniser dans `EmployesPage.tsx`

Fichier : `cantine-web/src/pages/admin/EmployesPage.tsx`

- [x] Importer `DatePicker` depuis `antd`
- [x] Ajouter l'état `const [filtreDates, setFiltreDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)`
- [x] Ajouter `filtreDates` dans la `queryKey` et transmettre les dates formatées (`YYYY-MM-DD`) à `getEmployes`
- [x] Ajouter `<DatePicker.RangePicker>` dans la barre de filtres (après le Select Quota), `format="DD/MM/YYYY"`, `allowClear`, width 240
- [x] Mettre à jour `handleExportExcel` pour ajouter `dateDebut`/`dateFin` dans les filtres passés à `getExportEmployes`

## T6 — Test manuel

- Sélectionner une plage de dates → vérifier que seuls les employés ayant mangé dans cette période s'affichent
- Sans filtre date → vérifier que tous les employés s'affichent (comportement inchangé)
- Filtrer date + statut Actif → vérifier l'intersection correcte
- Export avec filtre date → vérifier que le fichier Excel contient uniquement les employés filtrés et que la période apparaît dans le bloc filtres
- Effacer le filtre date (allowClear) → vérifier le retour à la liste complète
