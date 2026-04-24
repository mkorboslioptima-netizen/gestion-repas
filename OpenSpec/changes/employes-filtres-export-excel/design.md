## Architecture

Aucune modification de schéma BDD. Les filtres sont 100% côté client (la liste complète des employés d'un site est déjà chargée). L'export Excel suit le même pattern que `GenererExportPassagesAsync` dans `ExcelExportService`.

## Composants modifiés / créés

### `EmployesPage.tsx` — barre de filtres + bouton export

**État local à ajouter :**
```typescript
const [search, setSearch]       = useState('');
const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'inactif'>('tous');
const [filtreQuota, setFiltreQuota]   = useState<'tous' | '1' | '2'>('tous');
const [exportLoading, setExportLoading] = useState(false);
```

**Liste filtrée côté client :**
```typescript
const employesFiltres = useMemo(() => {
  return employes.filter(e => {
    const q = search.toLowerCase();
    const matchTexte = !q || e.matricule.toLowerCase().includes(q)
      || e.nom.toLowerCase().includes(q)
      || e.prenom.toLowerCase().includes(q);
    const matchStatut = filtreStatut === 'tous'
      || (filtreStatut === 'actif' && e.actif)
      || (filtreStatut === 'inactif' && !e.actif);
    const matchQuota  = filtreQuota === 'tous'
      || e.maxMealsPerDay === Number(filtreQuota);
    return matchTexte && matchStatut && matchQuota;
  });
}, [employes, search, filtreStatut, filtreQuota]);
```

**Disposition UI :**
```
[🔍 Recherche nom/matricule...] [Statut ▾] [Quota ▾]   [Export Excel ↓]
─────────────────────────────────────────────────────────────────────────
[ Tableau des employés filtrés ]
```

Les filtres et le bouton export sont placés dans une `div` flexbox avant le tableau, avec `justifyContent: 'space-between'`.

**Bouton export :**
```typescript
async function handleExportExcel() {
  if (!tableSiteId) return;
  setExportLoading(true);
  try {
    const blob = await getExportEmployes(tableSiteId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employes-${tableSiteId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    notification.error({ message: 'Erreur lors de l\'export Excel' });
  } finally {
    setExportLoading(false);
  }
}
```

Le tableau reçoit `dataSource={employesFiltres}` au lieu de `dataSource={employes}`.

### `src/api/employes.ts` — nouvelle fonction export

```typescript
export async function getExportEmployes(siteId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/api/employes/export', {
    params: { siteId },
    responseType: 'blob',
  });
  return data;
}
```

### `ExcelExportService.cs` — nouvelle méthode

```csharp
public async Task<byte[]> GenererExportEmployesAsync(string siteId)
{
    var employes = await _context.Employees
        .AsNoTracking()
        .Where(e => e.SiteId == siteId)
        .OrderBy(e => e.Nom).ThenBy(e => e.Prenom)
        .ToListAsync();

    var site = await _context.Sites.AsNoTracking()
        .FirstOrDefaultAsync(s => s.SiteId == siteId);

    using var wb = new XLWorkbook();
    var ws = wb.Worksheets.Add("Employés");

    // En-tête titre
    ws.Cell(1, 1).Value = $"Liste des employés — {site?.Nom ?? siteId}";
    ws.Cell(1, 1).Style.Font.Bold = true;
    ws.Cell(1, 1).Style.Font.FontSize = 13;
    ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromArgb(37, 99, 235);
    ws.Cell(2, 1).Value = $"Généré le {DateTime.Now:dd/MM/yyyy à HH:mm}";
    ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);

    // En-têtes colonnes
    string[] headers = ["Matricule", "Nom", "Prénom", "Statut", "Quota (repas/j)"];
    for (int i = 0; i < headers.Length; i++)
    {
        var cell = ws.Cell(4, i + 1);
        cell.Value = headers[i];
        cell.Style.Font.Bold = true;
        cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
        cell.Style.Font.FontColor = XLColor.White;
    }

    int row = 5;
    foreach (var e in employes)
    {
        ws.Cell(row, 1).Value = e.Matricule;
        ws.Cell(row, 2).Value = e.Nom;
        ws.Cell(row, 3).Value = e.Prenom;
        ws.Cell(row, 4).Value = e.Actif ? "Actif" : "Inactif";
        ws.Cell(row, 5).Value = e.MaxMealsPerDay;
        if (!e.Actif)
            ws.Row(row).Style.Font.FontColor = XLColor.FromArgb(148, 163, 184);
        row++;
    }

    ws.Columns().AdjustToContents();

    using var ms = new MemoryStream();
    wb.SaveAs(ms);
    return ms.ToArray();
}
```

### `EmployesController.cs` — nouvel endpoint export

```csharp
// GET /api/employes/export?siteId=
[HttpGet("export")]
public async Task<IActionResult> ExportExcel([FromQuery] string siteId)
{
    if (string.IsNullOrWhiteSpace(siteId))
        return BadRequest(new { message = "siteId requis" });

    var bytes = await _excelService.GenererExportEmployesAsync(siteId);
    var fileName = $"employes-{siteId}-{DateTime.Now:yyyyMMdd}.xlsx";
    return File(bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName);
}
```

`ExcelExportService` est injecté via le constructeur (déjà enregistré dans DI).

## Flux de données

```
EmployesPage
  ├── employes (API, déjà chargés)
  │     ↓ useMemo
  ├── employesFiltres (client-side: texte + statut + quota)
  │     ↓
  ├── Table (dataSource={employesFiltres})
  └── Bouton Export Excel
        → getExportEmployes(siteId) → GET /api/employes/export?siteId=
              → ExcelExportService.GenererExportEmployesAsync()
              → retourne .xlsx (tous les employés du site, sans filtre côté serveur)
```

Note : l'export Excel retourne **tous** les employés du site (sans filtre texte/statut/quota) car ces filtres sont UI-only. C'est le comportement attendu — l'export est la liste de référence complète du site.
