# Tasks — phase2-shifts-supervision

---

## PARTIE A — MOTEUR DE SHIFTS

---

## T1 — Créer l'entité `ShiftConfig` et son DTO

**Fichier à créer :** `Cantine.Core/Entities/ShiftConfig.cs`

```csharp
namespace Cantine.Core.Entities;

public class ShiftConfig
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public TimeOnly HeureDebut { get; set; }
    public TimeOnly HeureFin { get; set; }
    public bool Actif { get; set; } = true;
}
```

**Fichier à créer :** `Cantine.Core/DTOs/ShiftDto.cs`

```csharp
namespace Cantine.Core.DTOs;

public record ShiftDto(
    int Id,
    string Nom,
    TimeOnly HeureDebut,
    TimeOnly HeureFin,
    bool Actif,
    bool EnCours
);

public record UpdateShiftDto(
    TimeOnly HeureDebut,
    TimeOnly HeureFin,
    bool Actif
);
```

---

## T2 — Configuration EF Core + migration + seed

**Fichier à créer :** `Cantine.Infrastructure/Data/Configurations/ShiftConfiguration.cs`

```csharp
using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<ShiftConfig>
{
    public void Configure(EntityTypeBuilder<ShiftConfig> builder)
    {
        builder.ToTable("ShiftConfigs");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Nom).IsRequired().HasMaxLength(50);
        builder.HasData(
            new ShiftConfig { Id = 1, Nom = "Matin",         HeureDebut = new TimeOnly(8,  0), HeureFin = new TimeOnly(12, 0), Actif = true  },
            new ShiftConfig { Id = 2, Nom = "Administration", HeureDebut = new TimeOnly(12, 0), HeureFin = new TimeOnly(14, 0), Actif = true  },
            new ShiftConfig { Id = 3, Nom = "Après-midi",    HeureDebut = new TimeOnly(16, 0), HeureFin = new TimeOnly(21, 0), Actif = true  },
            new ShiftConfig { Id = 4, Nom = "Nuit",          HeureDebut = new TimeOnly(0,  0), HeureFin = new TimeOnly(4,  0),  Actif = false }
        );
    }
}
```

**Ajouter dans `CantineDbContext.cs` :**
```csharp
public DbSet<ShiftConfig> ShiftConfigs => Set<ShiftConfig>();
```

**Ajouter dans `OnModelCreating` :**
```csharp
modelBuilder.ApplyConfiguration(new ShiftConfiguration());
```

**Générer la migration :**
```bash
dotnet ef migrations add AddShiftConfigs --project Cantine.Infrastructure --startup-project Cantine.API
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
```

---

## T3 — Créer `IShiftService` et `ShiftService`

**Fichier à créer :** `Cantine.Core/Interfaces/IShiftService.cs`

```csharp
using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IShiftService
{
    Task<IEnumerable<ShiftDto>> GetAllAsync();
    Task<ShiftDto?> GetCurrentAsync(DateTime now);
    Task<ShiftDto> UpdateAsync(int id, UpdateShiftDto dto);
}
```

**Fichier à créer :** `Cantine.Infrastructure/Services/ShiftService.cs`

```csharp
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Services;

public class ShiftService(CantineDbContext db) : IShiftService
{
    public async Task<IEnumerable<ShiftDto>> GetAllAsync()
    {
        var now = TimeOnly.FromDateTime(DateTime.Now);
        return await db.ShiftConfigs
            .OrderBy(s => s.HeureDebut)
            .Select(s => new ShiftDto(
                s.Id, s.Nom, s.HeureDebut, s.HeureFin, s.Actif,
                s.Actif && s.HeureDebut <= now && now < s.HeureFin))
            .ToListAsync();
    }

    public async Task<ShiftDto?> GetCurrentAsync(DateTime now)
    {
        var time = TimeOnly.FromDateTime(now);
        var shift = await db.ShiftConfigs
            .Where(s => s.Actif && s.HeureDebut <= time && time < s.HeureFin)
            .FirstOrDefaultAsync();
        if (shift is null) return null;
        return new ShiftDto(shift.Id, shift.Nom, shift.HeureDebut, shift.HeureFin, true, true);
    }

    public async Task<ShiftDto> UpdateAsync(int id, UpdateShiftDto dto)
    {
        var shift = await db.ShiftConfigs.FindAsync(id)
            ?? throw new KeyNotFoundException($"Shift {id} introuvable");
        shift.HeureDebut = dto.HeureDebut;
        shift.HeureFin = dto.HeureFin;
        shift.Actif = dto.Actif;
        await db.SaveChangesAsync();
        return new ShiftDto(shift.Id, shift.Nom, shift.HeureDebut, shift.HeureFin, shift.Actif, false);
    }
}
```

---

## T4 — Mettre à jour `MealEligibilityService` pour vérifier le shift

**Fichier :** `Cantine.Infrastructure/Services/MealEligibilityService.cs` (ou équivalent)

- Injecter `IShiftService` dans le constructeur.
- Après la vérification du quota, ajouter :

```csharp
var currentShift = await _shiftService.GetCurrentAsync(DateTime.Now);
if (currentShift is null)
    return new EligibilityResult(false, "Hors créneau horaire");
```

- Retourner la vérification de shift dans le motif de refus.

---

## T5 — Créer `ShiftsController`

**Fichier à créer :** `Cantine.API/Controllers/ShiftsController.cs`

```csharp
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/shifts")]
[Authorize]
public class ShiftsController(IShiftService shiftService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await shiftService.GetAllAsync());

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent() =>
        Ok(await shiftService.GetCurrentAsync(DateTime.Now));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "AdminSEBN")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateShiftDto dto)
    {
        try { return Ok(await shiftService.UpdateAsync(id, dto)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
```

---

## T6 — Enregistrer `ShiftService` dans DI

**Fichier :** `Cantine.API/Program.cs`

```csharp
builder.Services.AddScoped<IShiftService, ShiftService>();
```

---

## T7 — Frontend : API client shifts

**Fichier à créer :** `cantine-web/src/api/shifts.ts`

```typescript
import apiClient from './axios';

export interface ShiftDto {
  id: number;
  nom: string;
  heureDebut: string;
  heureFin: string;
  actif: boolean;
  enCours: boolean;
}

export interface UpdateShiftDto {
  heureDebut: string;
  heureFin: string;
  actif: boolean;
}

export async function getShifts(): Promise<ShiftDto[]> {
  const { data } = await apiClient.get<ShiftDto[]>('/api/shifts');
  return data;
}

export async function getCurrentShift(): Promise<ShiftDto | null> {
  const { data } = await apiClient.get<ShiftDto | null>('/api/shifts/current');
  return data;
}

export async function updateShift(id: number, dto: UpdateShiftDto): Promise<ShiftDto> {
  const { data } = await apiClient.put<ShiftDto>(`/api/shifts/${id}`, dto);
  return data;
}
```

---

## T8 — Frontend : Page `ShiftsPage.tsx`

**Fichier à créer :** `cantine-web/src/pages/admin/ShiftsPage.tsx`

- Utiliser TanStack Query pour `getShifts()`.
- Tableau Ant Design avec colonnes : Nom, Heure début, Heure fin, Statut (En cours / Actif / Inactif), Actions.
- Tag vert "En cours" si `enCours`, tag bleu "Actif" si `actif && !enCours`, tag gris "Inactif" sinon.
- Bouton "Modifier" par ligne → modal avec `TimePicker` pour `HeureDebut`/`HeureFin` et Switch pour `Actif`.
- `useMutation` → `updateShift(id, dto)` → `queryClient.invalidateQueries(['shifts'])` → `message.success`.
- Accès réservé `AdminSEBN` (wrapper `PrivateRoute` ou guard dans `App.tsx`).

---

## T9 — Frontend : Widget shift dans le Dashboard

**Fichier :** `cantine-web/src/pages/DashboardPage.tsx` (ou équivalent)

- Ajouter une query `getCurrentShift()` avec `refetchInterval: 60_000`.
- Afficher dans l'en-tête du dashboard :
  - Si shift en cours : Badge vert + `"🕐 {nom} — {heureDebut}–{heureFin}"`.
  - Sinon : Badge orange `"Hors créneau — aucun repas servi"`.

---

## T10 — Ajouter "Shifts" dans la navigation

**Fichier :** `cantine-web/src/App.tsx` (ou composant Sidebar/Layout)

- Ajouter la route `/admin/shifts` → `<ShiftsPage />`.
- Ajouter l'entrée de menu "Shifts" avec icône `ClockCircleOutlined`, visible uniquement pour `AdminSEBN`.

---

---

## PARTIE B — SUPERVISION DES CONNEXIONS

---

## T11 — Créer `ISupervisionStore` et les DTOs

**Fichier à créer :** `Cantine.Core/DTOs/SupervisionDto.cs`

```csharp
namespace Cantine.Core.DTOs;

public record EquipmentStatusDto(
    string Id,
    string Nom,
    string AdresseIP,
    string Type,        // "lecteur" | "imprimante"
    bool Connecte,
    DateTime DernierCheck
);

public record SupervisionStatusDto(
    IEnumerable<EquipmentStatusDto> Equipements
);
```

**Fichier à créer :** `Cantine.Core/Interfaces/ISupervisionStore.cs`

```csharp
using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface ISupervisionStore
{
    void UpdateStatus(string id, bool connecte);
    IEnumerable<EquipmentStatusDto> GetAll();
    void Register(string id, string nom, string ip, string type);
    event Action<EquipmentStatusDto>? OnStatusChanged;
}
```

---

## T12 — Implémenter `SupervisionStore` (Singleton)

**Fichier à créer :** `Cantine.Infrastructure/Services/SupervisionStore.cs`

- `ConcurrentDictionary<string, EquipmentStatusDto>` en interne.
- `Register(id, nom, ip, type)` : insère ou met à jour l'entrée avec `Connecte = false` initial.
- `UpdateStatus(id, connecte)` : si l'état change → met à jour + déclenche `OnStatusChanged`.
- `GetAll()` : retourne les valeurs du dictionnaire.

---

## T13 — Créer `SupervisionBackgroundService`

**Fichier à créer :** `Cantine.TcpListener/SupervisionBackgroundService.cs`

- Hérite de `BackgroundService`.
- Injecter `ISupervisionStore`, `IServiceScopeFactory` (pour `CantineDbContext`), `ILogger`.
- Au démarrage : charger les lecteurs et imprimantes depuis la BDD via scope, les enregistrer dans `ISupervisionStore`.
- Boucle `PeriodicTimer` de 30 s :
  - Pour chaque lecteur actif : `TcpClient.ConnectAsync(ip, port, CancellationToken(2s))` → `UpdateStatus`.
  - Pour chaque imprimante configurée : même vérification sur port 9100.
- Logger les changements d'état avec `[Supervision]` préfixe.

---

## T14 — Créer `SupervisionController`

**Fichier à créer :** `Cantine.API/Controllers/SupervisionController.cs`

```csharp
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/supervision")]
[Authorize]
public class SupervisionController(ISupervisionStore store) : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus() => Ok(store.GetAll());

    [HttpGet("stream")]
    public async Task Stream(CancellationToken ct)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        void OnChange(Core.DTOs.EquipmentStatusDto dto)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(dto);
            Response.WriteAsync($"data: {json}\n\n", ct);
            Response.Body.FlushAsync(ct);
        }

        store.OnStatusChanged += OnChange;
        try { await Task.Delay(Timeout.Infinite, ct); }
        finally { store.OnStatusChanged -= OnChange; }
    }
}
```

---

## T15 — Enregistrer la supervision dans DI

**Fichier :** `Cantine.API/Program.cs`

```csharp
builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();
```

**Fichier :** `Cantine.TcpListener/Program.cs`

```csharp
builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();
builder.Services.AddHostedService<SupervisionBackgroundService>();
```

---

## T16 — Frontend : API client supervision

**Fichier à créer :** `cantine-web/src/api/supervision.ts`

```typescript
import apiClient from './axios';

export interface EquipmentStatusDto {
  id: string;
  nom: string;
  adresseIP: string;
  type: 'lecteur' | 'imprimante';
  connecte: boolean;
  dernierCheck: string;
}

export async function getSupervisionStatus(): Promise<EquipmentStatusDto[]> {
  const { data } = await apiClient.get<EquipmentStatusDto[]>('/api/supervision/status');
  return data;
}
```

---

## T17 — Frontend : Page `SupervisionPage.tsx`

**Fichier à créer :** `cantine-web/src/pages/admin/SupervisionPage.tsx`

- Query `getSupervisionStatus()` + `refetchInterval: 30_000`.
- `EventSource` sur `/api/supervision/stream` : met à jour l'état en temps réel.
- Grille Ant Design `Row/Col` : une `Card` par équipement.
  - Card titre : nom + IP.
  - Badge vert "Connecté" ou rouge "Déconnecté".
  - Sous-titre type : Tag "Lecteur" bleu ou "Imprimante" violet.
  - Texte "Vérifié il y a X s" (dayjs relative).
- Accès `AdminSEBN` uniquement.

---

## T18 — Frontend : Colonne "Connexion" dans `LecteursPage.tsx`

**Fichier :** `cantine-web/src/pages/admin/LecteursPage.tsx`

- Ajouter une query `getSupervisionStatus()` avec `refetchInterval: 30_000`.
- Enrichir les colonnes du tableau avec une colonne "Connexion" :
  - Tag vert "Connecté" si le lecteur a un statut `connecte: true` dans le store de supervision.
  - Tag rouge "Déconnecté" sinon.
  - Clé de matching : `lecteur.adresseIP === status.adresseIP && status.type === 'lecteur'`.

---

## T19 — Ajouter "Supervision" dans la navigation

**Fichier :** `cantine-web/src/App.tsx`

- Ajouter la route `/admin/supervision` → `<SupervisionPage />`.
- Ajouter l'entrée de menu "Supervision" avec icône `WifiOutlined`, visible pour `AdminSEBN`.

---

## T20 — Vérification build

```bash
dotnet build
cd cantine-web && npx tsc --noEmit
```

0 erreur attendu.

---

## T21 — Tests manuels

**Shifts :**
- Ouvrir `/admin/shifts` → 4 shifts affichés, le shift "En cours" est mis en évidence.
- Modifier l'heure d'un shift → sauvegarde → tableau mis à jour.
- Désactiver un shift → pointage pendant ce créneau → refus "Hors créneau horaire" dans les logs.
- Dashboard → badge shift affiché en en-tête.

**Supervision :**
- Ouvrir `/admin/supervision` → lecteurs et imprimantes listés avec statut initial.
- Déconnecter un lecteur (couper le réseau) → badge rouge apparaît dans les 30 s.
- Reconnecter → badge revient vert.
- Page Lecteurs → colonne "Connexion" reflète le même état.
