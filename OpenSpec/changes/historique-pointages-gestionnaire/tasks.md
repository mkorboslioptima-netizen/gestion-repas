# Tasks — historique-pointages-gestionnaire

## T1 — DTO `MealLogDto`

**Fichier :** `Cantine.Core/DTOs/MealLogDto.cs`

```csharp
namespace Cantine.Core.DTOs;

public record MealLogDto(
    int Id,
    string Matricule,
    string NomEmploye,
    string PrenomEmploye,
    string SiteId,
    string SiteNom,
    string LecteurNom,
    string RepasType,
    DateTime Timestamp,
    string? ShiftNom
);

public record HistoriquePageDto(
    IEnumerable<MealLogDto> Items,
    int Total,
    int Page,
    int PageSize
);

public record HistoriqueFiltresDto(
    DateTime DateDebut,
    DateTime DateFin,
    TimeSpan? HeureDebut,
    TimeSpan? HeureFin,
    string? SiteId,
    int? ShiftId,
    string? Matricule,
    string? RepasType,
    int Page,
    int PageSize
);
```

## T2 — Méthode `GenererExportHistoriqueAsync` dans `ExcelExportService`

**Fichier :** `Cantine.Infrastructure/Services/ExcelExportService.cs`

Ajouter une méthode publique :

```csharp
public async Task<byte[]> GenererExportHistoriqueAsync(
    DateTime dateDebut, DateTime dateFin,
    TimeSpan? heureDebut, TimeSpan? heureFin,
    string? siteId, string? matricule, string? repasType)
```

- Requête EF Core sur `MealLogs` avec `.Include(m => m.Employee).Include(m => m.Lecteur)` et filtre sur les paramètres.
- Colonnes XLSX : `Matricule`, `Nom`, `Prénom`, `Site`, `Lecteur`, `Type repas`, `Date` (format `dd/MM/yyyy`), `Heure` (format `HH:mm`).
- En-têtes en gras, colonne date auto-width, retourne `byte[]`.

## T3 — `HistoriqueController`

**Fichier :** `Cantine.API/Controllers/HistoriqueController.cs`

```csharp
[ApiController]
[Route("api/historique")]
[Authorize]
public class HistoriqueController(CantineDbContext db, ISiteContext siteContext, ExcelExportService excelService, IShiftService shiftService) : ControllerBase
```

**`GET /api/historique`** :
1. Lire les query params : `dateDebut` (défaut: aujourd'hui), `dateFin` (défaut: aujourd'hui), `heureDebut`, `heureFin`, `siteId`, `shiftId`, `matricule`, `repasType`, `page` (défaut: 1), `pageSize` (défaut: 50).
2. Forcer `siteId = siteContext.SiteId` si `siteContext.SiteId` non null (ResponsableCantine).
3. Si `shiftId` fourni : charger le shift via `shiftService.GetAllAsync()`, convertir en plage horaire.
4. Requête EF Core avec tous les filtres + `.Include(m => m.Employee).Include(m => m.Lecteur)`.
5. Charger les shifts actifs, calculer `ShiftNom` pour chaque `MealLog`.
6. Appliquer `skip = (page - 1) * pageSize`, `take = pageSize`.
7. Retourner `HistoriquePageDto`.

**`GET /api/historique/export`** :
1. Mêmes filtres (sans page/pageSize).
2. Appeler `excelService.GenererExportHistoriqueAsync(...)`.
3. Retourner `File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "historique.xlsx")`.

## T4 — Enregistrer `HistoriqueController` dans `Program.cs`

`HistoriqueController` n'a besoin que de services déjà enregistrés (`CantineDbContext`, `ISiteContext`, `ExcelExportService`, `IShiftService`). Vérifier qu'`ExcelExportService` est bien `AddScoped` dans `Cantine.API/Program.cs`. Si ce n'est pas le cas, l'ajouter.

## T5 — `cantine-web/src/api/historique.ts`

```typescript
import apiClient from './axios';

export interface MealLogDto {
  id: number;
  matricule: string;
  nomEmploye: string;
  prenomEmploye: string;
  siteId: string;
  siteNom: string;
  lecteurNom: string;
  repasType: 'PlatChaud' | 'Sandwich';
  timestamp: string;
  shiftNom?: string;
}

export interface HistoriquePageDto {
  items: MealLogDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HistoriqueFiltres {
  dateDebut: string;
  dateFin: string;
  heureDebut?: string;
  heureFin?: string;
  siteId?: string;
  shiftId?: number;
  matricule?: string;
  repasType?: string;
  page: number;
  pageSize: number;
}

export async function getHistorique(filtres: HistoriqueFiltres): Promise<HistoriquePageDto> {
  const { data } = await apiClient.get<HistoriquePageDto>('/api/historique', { params: filtres });
  return data;
}

export async function exportHistorique(filtres: Omit<HistoriqueFiltres, 'page' | 'pageSize'>): Promise<void> {
  const response = await apiClient.get('/api/historique/export', {
    params: filtres,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historique-${filtres.dateDebut}-${filtres.dateFin}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## T6 — `cantine-web/src/pages/HistoriquePage.tsx`

Créer la page avec :

- **Filtres** (reprendre le style `DashboardFilters`) : `DatePicker.RangePicker` (date début/fin), `Select` shift, `Select` site (AdminSEBN uniquement), `Select` type repas, `Input` matricule, bouton "Appliquer", bouton "Actualiser", bouton "Exporter Excel".
- **Tableau Ant Design** :
  - Colonnes : Timestamp (`dd/MM/yyyy HH:mm`), Matricule, Nom + Prénom, Site, Lecteur, Type (badge Tag), Shift.
  - `pagination={{ total, pageSize: 50, current: page, onChange: setPage, showTotal: t => \`${t} pointages\` }}`
  - `loading={isLoading}`
- **TanStack Query** : `useQuery({ queryKey: ['historique', filtres, page], queryFn: () => getHistorique({...filtres, page}), refetchInterval: 30_000 })`.
- **Export** : `onClick={() => exportHistorique(filtresActifs)}` sur le bouton Exporter — afficher `message.loading` puis `message.success`.

## T7 — Route et navigation dans `App.tsx`

**Fichier :** `cantine-web/src/App.tsx`

1. Importer `HistoriquePage`.
2. Ajouter route : `<Route path="/historique" element={<PrivateRoute><HistoriquePage /></PrivateRoute>} />`.
3. Ajouter item sidebar (accessible aux deux rôles, pas de restriction role) :
```typescript
{ key: '/historique', icon: <HistoryOutlined />, label: 'Historique' }
```
Importer `HistoryOutlined` depuis `@ant-design/icons`.

## T8 — Build backend

```bash
dotnet build Cantine.API/Cantine.API.csproj
```

0 erreur attendu.

## T9 — TypeScript check

```bash
cd cantine-web && npx tsc --noEmit
```

0 erreur attendu.
