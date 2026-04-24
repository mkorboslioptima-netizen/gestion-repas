# Tasks — employes-filtres-export-excel

## T1 — ✅ Ajouter `GenererExportEmployesAsync` dans `ExcelExportService.cs`

Fichier : `Cantine.Infrastructure/Services/ExcelExportService.cs`

Ajouter la méthode après `GenererExportPassagesAsync` :
- Requête `_context.Employees` filtrée par `siteId`, triée par Nom/Prénom
- Feuille "Employés" avec titre, date de génération, en-têtes bleus (#2563eb)
- Colonnes : Matricule, Nom, Prénom, Statut (Actif/Inactif), Quota (repas/j)
- Employés inactifs affichés en gris (`XLColor.FromArgb(148, 163, 184)`)
- `ws.Columns().AdjustToContents()` avant sauvegarde

## T2 — ✅ Ajouter l'endpoint `GET /api/employes/export` dans `EmployesController.cs`

Fichier : `Cantine.API/Controllers/EmployesController.cs`

- Injecter `ExcelExportService` dans le constructeur (déjà enregistré en DI)
- Ajouter `[HttpGet("export")]` avec `[FromQuery] string siteId`
- Valider que `siteId` n'est pas vide (retourner 400 sinon)
- Appeler `_excelService.GenererExportEmployesAsync(siteId)`
- Retourner `File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"employes-{siteId}-{DateTime.Now:yyyyMMdd}.xlsx")`

## T3 — ✅ Ajouter `getExportEmployes` dans `src/api/employes.ts`

Fichier : `cantine-web/src/api/employes.ts`

```typescript
export async function getExportEmployes(siteId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/api/employes/export', {
    params: { siteId },
    responseType: 'blob',
  });
  return data;
}
```

## T4 — ✅ Ajouter les filtres et le bouton export dans `EmployesPage.tsx`

Fichier : `cantine-web/src/pages/admin/EmployesPage.tsx`

- Importer `Input`, `useMemo` et `getExportEmployes`
- Ajouter les états : `search`, `filtreStatut`, `filtreQuota`, `exportLoading`
- Ajouter `employesFiltres` (useMemo) : filtre `employes` par texte (matricule/nom/prénom), statut (actif/inactif/tous), quota (1/2/tous)
- Ajouter avant le tableau une barre de filtres :
  - `<Input.Search placeholder="Rechercher nom, prénom, matricule..." />` (width 260)
  - `<Select>` Statut (options : Tous / Actif / Inactif, defaultValue "tous", width 130)
  - `<Select>` Quota (options : Tous / 1 repas/j / 2 repas/j, defaultValue "tous", width 140)
  - `<Button>` Export Excel (type "primary" ghost, icon DownloadOutlined, loading={exportLoading}, disabled si !tableSiteId)
- Disposition : `display: flex, gap: 8, flexWrap: wrap, alignItems: center, marginBottom: 12`
- Passer `dataSource={employesFiltres}` au tableau (au lieu de `employes`)
- Ajouter `handleExportExcel` : appelle `getExportEmployes(tableSiteId!)`, déclenche téléchargement `.xlsx`

## T5 — Test manuel

- Rechercher "BEN" → seuls les employés avec BEN dans nom/prénom/matricule s'affichent
- Filtrer Statut = Inactif → seuls les inactifs s'affichent
- Filtrer Quota = 2 repas/j → seuls les gardiens s'affichent
- Combiner plusieurs filtres → intersection correcte
- Cliquer Export Excel → fichier `employes-<siteId>-<date>.xlsx` téléchargé avec tous les employés (sans filtre)
- Vérifier que le fichier s'ouvre correctement dans Excel/LibreOffice
