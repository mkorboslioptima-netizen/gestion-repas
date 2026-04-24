## Architecture

Pas de nouvelle table BDD. L'imprimante reste 1:1 avec un lecteur (une pointeuse = une imprimante). On enrichit l'entité `Lecteur` avec deux champs et on expose un contrôleur dédié `ImprimantesController` pour séparer la gestion des imprimantes de celle des lecteurs.

## Schéma BDD — Migration EF Core

```sql
ALTER TABLE Lecteurs
  ADD NomImprimante NVARCHAR(100) NULL,
      PortImprimante INT NOT NULL DEFAULT 9100;
```

Migration nommée : `AddPrinterFieldsToLecteurs`

## Composants modifiés / créés

---

### `Cantine.Core/Entities/Lecteur.cs` — ajout champs

```csharp
public string? NomImprimante { get; set; }
public int PortImprimante { get; set; } = 9100;
```

---

### `Cantine.Core/DTOs/ImprimanteDto.cs` — nouveau DTO lecture

```csharp
public record ImprimanteDto(
    int LecteurId,
    string NomLecteur,
    string SiteId,
    string? NomImprimante,
    string? PrinterIP,
    int PortImprimante,
    bool Configuree   // true si PrinterIP non vide
);
```

### `Cantine.Core/DTOs/UpdateImprimanteDto.cs` — nouveau DTO écriture

```csharp
public record UpdateImprimanteDto(
    string? NomImprimante,
    string? PrinterIP,
    int PortImprimante
);
```

### `Cantine.Core/DTOs/TestImprimanteResultDto.cs` — résultat test connexion

```csharp
public record TestImprimanteResultDto(
    bool Succes,
    string Message,
    int? LatenceMs
);
```

---

### `Cantine.Core/Interfaces/IImprimanteService.cs` — interface service

```csharp
public interface IImprimanteService
{
    Task<IEnumerable<ImprimanteDto>> GetAllAsync();
    Task<ImprimanteDto> UpdateAsync(int lecteurId, UpdateImprimanteDto dto);
    Task<TestImprimanteResultDto> TestConnexionAsync(int lecteurId);
}
```

---

### `Cantine.Infrastructure/Services/ImprimanteService.cs` — implémentation

```csharp
public class ImprimanteService : IImprimanteService
{
    private readonly CantineDbContext _context;
    private readonly ILogger<ImprimanteService> _logger;

    public ImprimanteService(CantineDbContext context, ILogger<ImprimanteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<ImprimanteDto>> GetAllAsync()
    {
        var lecteurs = await _context.Lecteurs
            .AsNoTracking()
            .OrderBy(l => l.SiteId).ThenBy(l => l.Nom)
            .ToListAsync();

        return lecteurs.Select(l => new ImprimanteDto(
            l.Id, l.Nom, l.SiteId,
            l.NomImprimante, l.PrinterIP, l.PortImprimante,
            !string.IsNullOrWhiteSpace(l.PrinterIP)
        ));
    }

    public async Task<ImprimanteDto> UpdateAsync(int lecteurId, UpdateImprimanteDto dto)
    {
        var lecteur = await _context.Lecteurs.FindAsync(lecteurId)
            ?? throw new KeyNotFoundException($"Lecteur {lecteurId} introuvable");

        lecteur.NomImprimante = dto.NomImprimante;
        lecteur.PrinterIP = dto.PrinterIP;
        lecteur.PortImprimante = dto.PortImprimante > 0 ? dto.PortImprimante : 9100;

        await _context.SaveChangesAsync();

        return new ImprimanteDto(
            lecteur.Id, lecteur.Nom, lecteur.SiteId,
            lecteur.NomImprimante, lecteur.PrinterIP, lecteur.PortImprimante,
            !string.IsNullOrWhiteSpace(lecteur.PrinterIP)
        );
    }

    public async Task<TestImprimanteResultDto> TestConnexionAsync(int lecteurId)
    {
        var lecteur = await _context.Lecteurs
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lecteurId)
            ?? throw new KeyNotFoundException($"Lecteur {lecteurId} introuvable");

        if (string.IsNullOrWhiteSpace(lecteur.PrinterIP))
            return new TestImprimanteResultDto(false, "Aucune adresse IP configurée", null);

        var sw = Stopwatch.StartNew();
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(lecteur.PrinterIP, lecteur.PortImprimante)
                .WaitAsync(TimeSpan.FromSeconds(3));
            sw.Stop();
            return new TestImprimanteResultDto(true,
                $"Connexion réussie à {lecteur.PrinterIP}:{lecteur.PortImprimante}",
                (int)sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning("[Test imprimante] Lecteur {Id}: {Message}", lecteurId, ex.Message);
            return new TestImprimanteResultDto(false,
                $"Impossible de joindre {lecteur.PrinterIP}:{lecteur.PortImprimante} — {ex.Message}",
                null);
        }
    }
}
```

---

### `Cantine.Infrastructure/Printing/EscPosService.cs` — remplacement port fixe

Remplacer la constante `PrinterPort = 9100` par `lecteur.PortImprimante` :

```csharp
// Avant :
await client.ConnectAsync(lecteur.PrinterIP, PrinterPort);

// Après :
int port = lecteur.PortImprimante > 0 ? lecteur.PortImprimante : 9100;
await client.ConnectAsync(lecteur.PrinterIP, port);
```

Supprimer la constante `private const int PrinterPort = 9100;`.

---

### `Cantine.API/Controllers/ImprimantesController.cs` — nouveau controller

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AdminSEBN")]
public class ImprimantesController : ControllerBase
{
    private readonly IImprimanteService _service;

    public ImprimantesController(IImprimanteService service)
    {
        _service = service;
    }

    // GET /api/imprimantes
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    // PUT /api/imprimantes/{lecteurId}
    [HttpPut("{lecteurId:int}")]
    public async Task<IActionResult> Update(int lecteurId, [FromBody] UpdateImprimanteDto dto)
    {
        try
        {
            var result = await _service.UpdateAsync(lecteurId, dto);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // POST /api/imprimantes/{lecteurId}/test
    [HttpPost("{lecteurId:int}/test")]
    public async Task<IActionResult> Test(int lecteurId)
    {
        try
        {
            var result = await _service.TestConnexionAsync(lecteurId);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
```

---

### `cantine-web/src/api/imprimantes.ts` — nouveau fichier API

```typescript
import apiClient from './axios';

export interface ImprimanteDto {
  lecteurId: number;
  nomLecteur: string;
  siteId: string;
  nomImprimante: string | null;
  printerIP: string | null;
  portImprimante: number;
  configuree: boolean;
}

export interface UpdateImprimanteDto {
  nomImprimante: string | null;
  printerIP: string | null;
  portImprimante: number;
}

export interface TestImprimanteResultDto {
  succes: boolean;
  message: string;
  latenceMs: number | null;
}

export async function fetchImprimantes(): Promise<ImprimanteDto[]> {
  const { data } = await apiClient.get<ImprimanteDto[]>('/api/imprimantes');
  return data;
}

export async function updateImprimante(lecteurId: number, dto: UpdateImprimanteDto): Promise<ImprimanteDto> {
  const { data } = await apiClient.put<ImprimanteDto>(`/api/imprimantes/${lecteurId}`, dto);
  return data;
}

export async function testImprimante(lecteurId: number): Promise<TestImprimanteResultDto> {
  const { data } = await apiClient.post<TestImprimanteResultDto>(`/api/imprimantes/${lecteurId}/test`);
  return data;
}
```

---

### `cantine-web/src/pages/admin/ImprimantesPage.tsx` — nouvelle page

**Interface cible :**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Imprimantes thermiques                                              │
│  ┌──────────┬──────────────┬──────────────┬──────────┬───────────┐  │
│  │ Pointeuse│ Nom impr.    │ Adresse IP   │ Port     │ Actions   │  │
│  ├──────────┼──────────────┼──────────────┼──────────┼───────────┤  │
│  │ Entrée A │ IMP-ENTREE-A │ 192.168.1.50 │ 9100     │[Config][T]│  │
│  │ Entrée B │ —            │ —            │ —        │[Config][T]│  │
│  └──────────┴──────────────┴──────────────┴──────────┴───────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Colonne Statut** : Badge `<Tag>` basé sur `configuree` :
- `configuree: true` → Tag vert "Configurée"
- `configuree: false` → Tag gris "Non configurée"

**Modal de configuration** (drawer ou modal Ant Design) avec 3 champs :
- Nom imprimante (Input, optionnel)
- Adresse IP (Input, placeholder "192.168.x.x", optionnel)
- Port TCP (InputNumber, min 1, max 65535, défaut 9100)

**Bouton Tester** :
- Déclenche `testImprimante(lecteurId)`
- Affiche `message.success(...)` ou `message.error(...)` avec latence si succès
- Désactivé si `!configuree`
- Loading spinner pendant l'appel

---

### `cantine-web/src/App.tsx` — ajout route et menu

Ajouter dans le menu AdminSEBN :
```tsx
{ key: '/admin/imprimantes', icon: <PrinterOutlined />, label: 'Imprimantes' }
```

Ajouter la route :
```tsx
<Route path="/admin/imprimantes" element={<ImprimantesPage />} />
```

---

## Flux de données

```
ImprimantesPage
  ├── fetchImprimantes() → GET /api/imprimantes
  │     → ImprimanteService.GetAllAsync()
  │     → SELECT * FROM Lecteurs (avec NomImprimante, PrinterIP, PortImprimante)
  │
  ├── Bouton Configurer → modal → updateImprimante(lecteurId, dto)
  │     → PUT /api/imprimantes/{lecteurId}
  │     → ImprimanteService.UpdateAsync() → UPDATE Lecteurs SET ...
  │
  └── Bouton Tester → testImprimante(lecteurId)
        → POST /api/imprimantes/{lecteurId}/test
        → ImprimanteService.TestConnexionAsync()
        → TcpClient.ConnectAsync(PrinterIP, PortImprimante) timeout 3s
        → Retourne { succes, message, latenceMs }

Pointage (TcpListener) :
  EscPosService.PrintTicketAsync()
    → lecteur.PortImprimante (configurable, sinon 9100 par défaut)
    → TcpClient.ConnectAsync(lecteur.PrinterIP, port)
```

## Enregistrement DI

Dans `Program.cs` :
```csharp
builder.Services.AddScoped<IImprimanteService, ImprimanteService>();
```
