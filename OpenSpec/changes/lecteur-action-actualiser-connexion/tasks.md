# Tasks — lecteur-action-actualiser-connexion

## T1 — Créer `ISupervisionChecker` dans `Cantine.Core`

**Fichier :** `Cantine.Core/Interfaces/ISupervisionChecker.cs`

```csharp
using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public record CheckLecteurResult(EquipmentStatusDto Lecteur, EquipmentStatusDto? Imprimante);

public interface ISupervisionChecker
{
    Task<CheckLecteurResult?> CheckLecteurAsync(int lecteurId, CancellationToken ct = default);
}
```

## T2 — Créer `SupervisionChecker` dans `Cantine.Infrastructure`

**Fichier :** `Cantine.Infrastructure/Services/SupervisionChecker.cs`

- Injecte `CantineDbContext` et `ISupervisionStore`.
- Implémente `CheckLecteurAsync` :
  1. Charge le lecteur depuis la BDD (`AsNoTracking`). Retourne `null` si introuvable.
  2. S'assure que le lecteur est enregistré dans le store (`Register`).
  3. Appelle `CheckConnectivityAsync(adresseIP, 11020)` → met à jour le store → récupère le DTO lecteur.
  4. Si `PrinterIP` non vide : même chose pour l'imprimante (port 9100 ou `PortImprimante`).
  5. Retourne `CheckLecteurResult(lecteurDto, imprimanteDto?)`.
- Méthode privée statique `CheckConnectivityAsync(host, port, ct)` : ping ICMP timeout 1s, fallback TCP timeout 2s (reprendre le code de `SupervisionBackgroundService`).

## T3 — Refactoriser `SupervisionBackgroundService` pour utiliser `ISupervisionChecker`

**Fichier :** `Cantine.Infrastructure/Services/SupervisionBackgroundService.cs`

- Injecter `ISupervisionChecker` via le scope (dans `CheckAllEquipmentsAsync`) plutôt que d'appeler `TcpPingAsync`/`CheckConnectivityAsync` directement.
- Appeler `checker.CheckLecteurAsync(l.Id, ct)` pour chaque lecteur actif dans la boucle.
- Supprimer la méthode statique `CheckConnectivityAsync` du `SupervisionBackgroundService`.
- Supprimer la logique `_initialized` / `Register` qui est maintenant dans `SupervisionChecker`.

**Note :** Le register doit être géré par `SupervisionChecker` ou rester dans `CheckAllEquipmentsAsync` — s'assurer que les équipements sont bien enregistrés au premier cycle.

## T4 — Nouveau endpoint `POST /api/supervision/check/{lecteurId}`

**Fichier :** `Cantine.API/Controllers/SupervisionController.cs`

Ajouter dans la classe `SupervisionController` :

```csharp
private readonly ISupervisionChecker _checker;

// Mettre à jour le constructeur primary :
public SupervisionController(ISupervisionStore store, ISupervisionChecker checker)
{
    // ...
}

[HttpPost("check/{lecteurId:int}")]
public async Task<IActionResult> CheckNow(int lecteurId, CancellationToken ct)
{
    var result = await _checker.CheckLecteurAsync(lecteurId, ct);
    if (result is null) return NotFound();
    return Ok(new { lecteur = result.Lecteur, imprimante = result.Imprimante });
}
```

## T5 — Enregistrer `ISupervisionChecker` dans `Cantine.API/Program.cs`

**Fichier :** `Cantine.API/Program.cs`

Après `builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();` :

```csharp
builder.Services.AddScoped<ISupervisionChecker, SupervisionChecker>();
```

## T6 — Ajouter `checkLecteur` dans `cantine-web/src/api/supervision.ts`

```typescript
export async function checkLecteur(lecteurId: number): Promise<{
  lecteur: EquipmentStatusDto;
  imprimante?: EquipmentStatusDto;
}> {
  const { data } = await apiClient.post(`/api/supervision/check/${lecteurId}`);
  return data;
}
```

## T7 — Bouton "Actualiser" dans `LecteursPage.tsx`

**Fichier :** `cantine-web/src/pages/admin/LecteursPage.tsx`

1. Ajouter import : `ReloadOutlined` depuis `@ant-design/icons`, `checkLecteur` depuis `../../api/supervision`.
2. Ajouter state : `const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());`
3. Ajouter handler :
```typescript
const handleCheck = async (lecteurId: number) => {
  setCheckingIds(prev => new Set(prev).add(lecteurId));
  try {
    const result = await checkLecteur(lecteurId);
    setSupervisionStatuses(prev => {
      const updated = prev.filter(
        s => s.id !== result.lecteur.id && s.id !== result.imprimante?.id
      );
      return [...updated, result.lecteur, ...(result.imprimante ? [result.imprimante] : [])];
    });
  } catch {
    message.error('Impossible de vérifier la connexion');
  } finally {
    setCheckingIds(prev => { const s = new Set(prev); s.delete(lecteurId); return s; });
  }
};
```
4. Dans la colonne Actions, ajouter le bouton :
```typescript
<Button
  icon={<ReloadOutlined />}
  size="small"
  loading={checkingIds.has(record.id)}
  onClick={() => handleCheck(record.id)}
  title="Vérifier la connexion"
/>
```

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
