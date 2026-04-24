## Architecture

Pas de changement de schéma BDD. La jointure utilise `MealLogs` existant. Quand `dateDebut`/`dateFin` sont fournis, le backend ne retourne que les employés ayant au moins un `MealLog` dans la période pour le site concerné.

## Composants modifiés

### `EmployesController.cs` — `GetEmployes` enrichi

```csharp
[HttpGet]
public async Task<IActionResult> GetEmployes(
    [FromQuery] string siteId,
    [FromQuery] string? dateDebut = null,
    [FromQuery] string? dateFin = null)
{
    var query = _context.Employees
        .AsNoTracking()
        .Where(e => e.SiteId == siteId);

    if (!string.IsNullOrWhiteSpace(dateDebut) && !string.IsNullOrWhiteSpace(dateFin)
        && DateOnly.TryParse(dateDebut, out var dDebut)
        && DateOnly.TryParse(dateFin, out var dFin))
    {
        var start = dDebut.ToDateTime(TimeOnly.MinValue);
        var end   = dFin.ToDateTime(TimeOnly.MaxValue);

        var matriculesAvecRepas = _context.MealLogs
            .AsNoTracking()
            .Where(m => m.SiteId == siteId && m.Timestamp >= start && m.Timestamp <= end)
            .Select(m => m.Matricule)
            .Distinct();

        query = query.Where(e => matriculesAvecRepas.Contains(e.Matricule));
    }

    var employes = await query
        .Select(e => new EmployeeDto
        {
            Matricule = e.Matricule,
            Nom = e.Nom,
            Prenom = e.Prenom,
            Actif = e.Actif,
            MaxMealsPerDay = e.MaxMealsPerDay
        })
        .OrderBy(e => e.Nom).ThenBy(e => e.Prenom)
        .ToListAsync();

    return Ok(employes);
}
```

### `ExcelExportService.cs` — `GenererExportEmployesAsync` enrichi

Ajouter `DateTime? dateDebut = null, DateTime? dateFin = null` à la signature.

Si ces paramètres sont fournis, ajouter la même logique de sous-requête `matriculesAvecRepas` avant le `ToListAsync()` :

```csharp
if (dateDebut.HasValue && dateFin.HasValue)
{
    var matriculesAvecRepas = _context.MealLogs
        .AsNoTracking()
        .Where(m => m.SiteId == siteId && m.Timestamp >= dateDebut.Value && m.Timestamp <= dateFin.Value)
        .Select(m => m.Matricule)
        .Distinct();

    query = query.Where(e => matriculesAvecRepas.Contains(e.Matricule));
}
```

Ajouter "Période repas" dans le bloc filtres du fichier Excel si les dates sont fournies.

### `EmployesController.cs` — `ExportExcel` enrichi

Ajouter `[FromQuery] string? dateDebut = null, [FromQuery] string? dateFin = null`.

Parser les dates et les transmettre à `GenererExportEmployesAsync` :
```csharp
DateTime? dtDebut = null, dtFin = null;
if (!string.IsNullOrWhiteSpace(dateDebut) && DateOnly.TryParse(dateDebut, out var dd))
    dtDebut = dd.ToDateTime(TimeOnly.MinValue);
if (!string.IsNullOrWhiteSpace(dateFin) && DateOnly.TryParse(dateFin, out var df))
    dtFin = df.ToDateTime(TimeOnly.MaxValue);

var bytes = await _excelService.GenererExportEmployesAsync(siteId, search, actif, maxMealsPerDay, dtDebut, dtFin);
```

### `src/api/employes.ts`

Ajouter `dateDebut?: string; dateFin?: string` à `ExportEmployesParams`.

Modifier `getEmployes` pour accepter les dates :
```typescript
export async function getEmployes(siteId: string, dateDebut?: string, dateFin?: string): Promise<EmployeeDto[]> {
  const { data } = await apiClient.get<EmployeeDto[]>('/api/employes', {
    params: { siteId, dateDebut, dateFin },
  });
  return data;
}
```

### `EmployesPage.tsx`

**Import à ajouter :** `DatePicker` depuis `antd`, `dayjs` déjà importé.

**État local :**
```typescript
const [filtreDates, setFiltreDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
```

**Requête enrichie :**
```typescript
const { data: employes = [], isLoading: employesLoading } = useQuery({
  queryKey: ['employes', tableSiteId, filtreDates],
  queryFn: () => getEmployes(
    tableSiteId!,
    filtreDates?.[0]?.format('YYYY-MM-DD'),
    filtreDates?.[1]?.format('YYYY-MM-DD'),
  ),
  enabled: !!tableSiteId,
});
```

**RangePicker dans la barre de filtres** (après le Select Quota) :
```tsx
<DatePicker.RangePicker
  value={filtreDates}
  onChange={setFiltreDates}
  format="DD/MM/YYYY"
  allowClear
  placeholder={['Date début', 'Date fin']}
  style={{ width: 240 }}
/>
```

**Export enrichi :**
```typescript
const blob = await getExportEmployes(tableSiteId, {
  search: search || undefined,
  actif: filtreStatut === 'tous' ? undefined : filtreStatut === 'actif',
  maxMealsPerDay: filtreQuota === 'tous' ? undefined : Number(filtreQuota),
  dateDebut: filtreDates?.[0]?.format('YYYY-MM-DD'),
  dateFin: filtreDates?.[1]?.format('YYYY-MM-DD'),
});
```

## Flux de données

```
EmployesPage
  ├── filtreSite + filtreDates + search + filtreStatut + filtreQuota
  │       ↓
  ├── useQuery getEmployes(siteId, dateDebut, dateFin)
  │       → GET /api/employes?siteId=&dateDebut=&dateFin=
  │       → Employees JOIN MealLogs (si dates) → liste filtrée par date de repas
  │       ↓
  ├── employesFiltres (useMemo — search + statut + quota côté client)
  │       ↓
  ├── Table
  │
  └── Export Excel
        → getExportEmployes(siteId, { search, actif, maxMealsPerDay, dateDebut, dateFin })
        → GET /api/employes/export?siteId=&...&dateDebut=&dateFin=
        → GenererExportEmployesAsync(..., dtDebut, dtFin)
```

## Comportement sans filtre date

Quand `filtreDates` est null → `dateDebut` et `dateFin` ne sont pas envoyés → API retourne tous les employés du site (comportement inchangé).
