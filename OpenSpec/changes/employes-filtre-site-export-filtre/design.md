## Architecture

Pas de changement de schéma BDD. Le filtre site devient un état local dans `EmployesPage` (décorrélé du `SiteContext`). Les paramètres de filtre sont transmis au backend pour l'export.

## Composants modifiés

### `EmployesPage.tsx`

**Nouvel état :**
```typescript
const [filtreSite, setFiltreSite] = useState<string | null>(null);
```

**`tableSiteId` piloté par `filtreSite` :**
```typescript
// Pour admin : filtreSite ou premier site disponible
// Pour gestionnaire : toujours son propre site (authSiteId)
const tableSiteId = isAdmin
  ? (filtreSite ?? (sites.length > 0 ? sites[0].siteId : null))
  : (authSiteId ?? null);
```

Initialiser `filtreSite` au premier chargement des sites :
```typescript
useEffect(() => {
  if (isAdmin && sites.length > 0 && filtreSite === null) {
    setFiltreSite(sites[0].siteId);
  }
}, [isAdmin, sites, filtreSite]);
```

**Select Site dans la barre de filtres (AdminSEBN uniquement) :**
```tsx
{isAdmin && (
  <Select
    value={filtreSite ?? undefined}
    onChange={setFiltreSite}
    style={{ width: 160 }}
    placeholder="Site..."
  >
    {sites.map(s => (
      <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
    ))}
  </Select>
)}
```

Placer ce Select en premier dans la barre de filtres (avant la recherche texte).

**`handleExportExcel` enrichi — passage des filtres actifs :**
```typescript
async function handleExportExcel() {
  if (!tableSiteId) return;
  setExportLoading(true);
  try {
    const blob = await getExportEmployes(tableSiteId, {
      search: search || undefined,
      actif: filtreStatut === 'tous' ? undefined : filtreStatut === 'actif',
      maxMealsPerDay: filtreQuota === 'tous' ? undefined : Number(filtreQuota),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employes-${tableSiteId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    notification.error({ message: "Erreur lors de l'export Excel" });
  } finally {
    setExportLoading(false);
  }
}
```

### `src/api/employes.ts`

**Interface des filtres d'export :**
```typescript
export interface ExportEmployesParams {
  search?: string;
  actif?: boolean;
  maxMealsPerDay?: number;
}

export async function getExportEmployes(siteId: string, filtres?: ExportEmployesParams): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/api/employes/export', {
    params: { siteId, ...filtres },
    responseType: 'blob',
  });
  return data;
}
```

### `ExcelExportService.cs`

**Signature enrichie :**
```csharp
public async Task<byte[]> GenererExportEmployesAsync(
    string siteId,
    string? search = null,
    bool? actif = null,
    int? maxMealsPerDay = null)
```

**Filtres LINQ :**
```csharp
var query = _context.Employees
    .AsNoTracking()
    .Where(e => e.SiteId == siteId);

if (actif.HasValue)
    query = query.Where(e => e.Actif == actif.Value);

if (maxMealsPerDay.HasValue)
    query = query.Where(e => e.MaxMealsPerDay == maxMealsPerDay.Value);

var employes = await query.OrderBy(e => e.Nom).ThenBy(e => e.Prenom).ToListAsync();

// Filtre search en mémoire (matricule/nom/prénom)
if (!string.IsNullOrWhiteSpace(search))
{
    var q = search.ToLowerInvariant();
    employes = employes
        .Where(e => e.Matricule.ToLowerInvariant().Contains(q)
                 || e.Nom.ToLowerInvariant().Contains(q)
                 || e.Prenom.ToLowerInvariant().Contains(q))
        .ToList();
}
```

Ajouter un bloc "Filtres appliqués" dans la feuille Excel (comme `GenererExportGlobalAsync`) si des filtres sont actifs.

### `EmployesController.cs`

**Signature enrichie :**
```csharp
[HttpGet("export")]
public async Task<IActionResult> ExportExcel(
    [FromQuery] string siteId,
    [FromQuery] string? search = null,
    [FromQuery] bool? actif = null,
    [FromQuery] int? maxMealsPerDay = null)
{
    if (string.IsNullOrWhiteSpace(siteId))
        return BadRequest(new { message = "siteId requis" });

    var bytes = await _excelService.GenererExportEmployesAsync(siteId, search, actif, maxMealsPerDay);
    var fileName = $"employes-{siteId}-{DateTime.Now:yyyyMMdd}.xlsx";
    return File(bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName);
}
```

## Flux de données

```
EmployesPage (AdminSEBN)
  ├── filtreSite (état local) ──→ tableSiteId ──→ useQuery getEmployes(tableSiteId)
  │         ↓
  │   Select Site [filtre bar] + Select Statut + Select Quota + Input Recherche
  │         ↓
  ├── employesFiltres (useMemo — client-side) ──→ Table
  │
  └── Bouton Export Excel
        → getExportEmployes(tableSiteId, { search, actif, maxMealsPerDay })
        → GET /api/employes/export?siteId=&search=&actif=&maxMealsPerDay=
        → GenererExportEmployesAsync(siteId, search, actif, maxMealsPerDay)
        → .xlsx avec uniquement les employés filtrés
```

## Règles de visibilité

| Élément | AdminSEBN | ResponsableCantine |
|---------|-----------|-------------------|
| Select Site (filtre bar) | ✅ | ❌ |
| Recherche texte | ✅ | ✅ |
| Filtre Statut | ✅ | ✅ |
| Filtre Quota | ✅ | ✅ |
| Bouton Export Excel | ✅ | ❌ (page réservée admin) |
