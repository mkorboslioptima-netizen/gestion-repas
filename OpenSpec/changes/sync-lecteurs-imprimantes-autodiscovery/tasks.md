# Tasks — sync-lecteurs-imprimantes-autodiscovery

## T1 — ✅ Enrichir `LecteurDto` et `UpdateLecteurDto`

**Fichier :** `Cantine.Core/DTOs/LecteurDto.cs`

Ajouter dans `LecteurDto` :
```csharp
public string? NomImprimante { get; set; }
public string? PrinterIP { get; set; }
public int PortImprimante { get; set; }
public bool ImprimanteConfiguree { get; set; }
```

Ajouter dans `UpdateLecteurDto` :
```csharp
public string? NomImprimante { get; set; }
public string? PrinterIP { get; set; }
public int PortImprimante { get; set; } = 9100;
```

## T2 — ✅ Créer `ImprimanteDiscoveredDto`

**Fichier à créer :** `Cantine.Core/DTOs/ImprimanteDiscoveredDto.cs`

```csharp
namespace Cantine.Core.DTOs;

public record ImprimanteDiscoveredDto(
    string AdresseIP,
    string? NomImprimante,
    string Source
);
```

## T3 — ✅ Mettre à jour `LecteurService` pour mapper les champs imprimante

**Fichier :** `Cantine.Infrastructure/Services/LecteurService.cs` (ou équivalent)

- Dans `GetAllAsync()` et `GetByIdAsync()` : mapper `NomImprimante`, `PrinterIP`, `PortImprimante`, `ImprimanteConfiguree = !string.IsNullOrWhiteSpace(l.PrinterIP)`
- Dans `UpdateAsync()` : ajouter avant `SaveChangesAsync()` :
  ```csharp
  lecteur.NomImprimante = dto.NomImprimante;
  lecteur.PrinterIP = dto.PrinterIP;
  lecteur.PortImprimante = dto.PortImprimante > 0 ? dto.PortImprimante : 9100;
  ```

## T4 — ✅ Créer `ImprimanteDiscoveryService`

**Fichier à créer :** `Cantine.Infrastructure/Services/ImprimanteDiscoveryService.cs`

Usings requis :
```csharp
using System.Management;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Cantine.Core.DTOs;
using Microsoft.Extensions.Logging;
```

Méthodes :
- `DiscoverWindowsPrinters()` : WMI `Win32_TCPIPPrinterPort` → `ImprimanteDiscoveredDto` avec Source = "windows"
- `ScanNetworkAsync()` : détecte le subnet local, scanne 1-254 port 9100 en parallèle (timeout 300 ms), Source = "reseau"
- `DiscoverAsync()` : combine les deux, déduplique par IP (Windows prioritaire), tri par IP

NuGet à ajouter dans `Cantine.Infrastructure.csproj` :
```xml
<PackageReference Include="System.Management" Version="9.0.0" />
```

## T5 — ✅ Ajouter endpoint `POST /api/imprimantes/discover`

**Fichier :** `Cantine.API/Controllers/ImprimantesController.cs`

- Injecter `ImprimanteDiscoveryService` dans le constructeur
- Ajouter :
```csharp
[HttpPost("discover")]
public async Task<IActionResult> Discover()
{
    var results = await _discoveryService.DiscoverAsync();
    return Ok(results);
}
```

## T6 — ✅ Enregistrer `ImprimanteDiscoveryService` dans DI

**Fichier :** `Cantine.API/Program.cs`

```csharp
builder.Services.AddScoped<ImprimanteDiscoveryService>();
```

## T7 — ✅ Mettre à jour `src/api/lecteurs.ts`

**Fichier :** `cantine-web/src/api/lecteurs.ts`

Ajouter dans l'interface `LecteurDto` :
```typescript
nomImprimante: string | null;
printerIP: string | null;
portImprimante: number;
imprimanteConfiguree: boolean;
```

Ajouter dans l'interface `UpdateLecteurDto` :
```typescript
nomImprimante?: string | null;
printerIP?: string | null;
portImprimante?: number;
```

## T8 — ✅ Mettre à jour `LecteurFormModal.tsx`

**Fichier :** `cantine-web/src/components/LecteurFormModal.tsx`

- Importer `InputNumber` depuis antd
- Dans `useEffect`, peupler les champs imprimante depuis `initialValues` :
  ```typescript
  nomImprimante: initialValues.nomImprimante ?? '',
  printerIP: initialValues.printerIP ?? '',
  portImprimante: initialValues.portImprimante ?? 9100,
  ```
- Ajouter après le champ `adresseIP` une section "Imprimante" avec bordure contenant :
  - `nomImprimante` : Input "Ex: IMP-ENTREE-A" (optionnel)
  - `printerIP` : Input "192.168.x.x" (optionnel)
  - `portImprimante` : InputNumber min=1 max=65535 initialValue=9100
- La section est visible aussi bien en création qu'en édition

## T9 — ✅ Mettre à jour `LecteursPage.tsx`

**Fichier :** `cantine-web/src/pages/admin/LecteursPage.tsx`

- Ajouter une colonne **Imprimante** entre "Adresse IP" et "Statut" :
  - Si `imprimanteConfiguree` : Tag vert "Configurée" + texte `nomImprimante ?? printerIP` en dessous (fontSize 11)
  - Sinon : Tag gris "Non configurée"
- Dans `updateMutation.onSuccess` : ajouter `queryClient.invalidateQueries({ queryKey: ['imprimantes'] })`
- Dans `createMutation.onSuccess` : pareil

## T10 — ✅ Mettre à jour `ImprimantesPage.tsx`

**Fichier :** `cantine-web/src/pages/admin/ImprimantesPage.tsx`

**Nouveaux états :**
```typescript
const [discovering, setDiscovering] = useState(false);
const [discovered, setDiscovered] = useState<ImprimanteDiscoveredDto[]>([]);
const [drawerOpen, setDrawerOpen] = useState(false);
```

**Interface locale :**
```typescript
interface ImprimanteDiscoveredDto {
  adresseIP: string;
  nomImprimante: string | null;
  source: 'windows' | 'reseau';
}
```

**Imports à ajouter :** `Drawer`, `SearchOutlined` depuis antd/icons

**Fonction `handleDiscover` :** POST `/api/imprimantes/discover`, stocke résultats, ouvre drawer

**Fonction `handleAssociate(imp, lecteurId)` :** appelle `updateImprimante(lecteurId, {...})`, invalide `['imprimantes']` + `['lecteurs']`, `message.success`

**Bouton Découvrir** dans l'en-tête de la card (à côté du titre) :
```tsx
<Button icon={<SearchOutlined />} loading={discovering} onClick={handleDiscover} size="small">
  Découvrir
</Button>
```

**Drawer** : liste les `discovered` avec source Tag (bleu=Windows / cyan=Réseau), IP en gras, nom si disponible, Select pour choisir le lecteur cible

**Invalidation croisée** dans `updateMutation.onSuccess` : invalider aussi `['lecteurs']`

## T11 — ✅ Vérification build

```bash
dotnet build
cd cantine-web && npx tsc --noEmit
```

0 erreur attendu.

## T12 — ✅ Test manuel

- Page Lecteurs : colonne "Imprimante" visible avec badge Configurée/Non configurée
- Modifier un lecteur → section imprimante dans le modal → enregistrer → badge mis à jour dans Lecteurs ET Imprimantes
- Page Imprimantes → Bouton "Découvrir" → drawer s'ouvre avec liste des imprimantes (Windows + réseau)
- Cliquer "Associer à..." → sélectionner une pointeuse → badge "Configurée" apparaît dans les deux pages
