# Tasks — supervision-status-lecteurs-imprimantes

## [x] T1 — Améliorer `SupervisionBackgroundService` : ping ICMP + TCP

**Fichier :** `Cantine.TcpListener/SupervisionBackgroundService.cs`

Remplacer `TcpPingAsync` par une méthode `CheckConnectivityAsync` qui combine ping ICMP et TCP :

```csharp
private static async Task<bool> CheckConnectivityAsync(string host, int port, CancellationToken ct)
{
    // Tentative ping ICMP (timeout 1s)
    try
    {
        using var ping = new System.Net.NetworkInformation.Ping();
        var reply = await ping.SendPingAsync(host, 1000);
        if (reply.Status == System.Net.NetworkInformation.IPStatus.Success)
            return true;
    }
    catch { /* ICMP peut être filtré — on tente TCP */ }

    // Fallback TCP connect (timeout 2s)
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(2));
    try
    {
        using var client = new TcpClient();
        await client.ConnectAsync(host, port, cts.Token);
        return true;
    }
    catch { return false; }
}
```

Mettre à jour `CheckAllEquipmentsAsync` pour appeler `CheckConnectivityAsync(l.AdresseIP, 11020, ct)` pour les lecteurs et `CheckConnectivityAsync(l.PrinterIP, port, ct)` pour les imprimantes.

## T2 — Enregistrer `SupervisionBackgroundService` dans `Cantine.API/Program.cs`

**Fichier :** `Cantine.API/Program.cs`

Après la ligne `builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();`, ajouter :

```csharp
builder.Services.AddHostedService<SupervisionBackgroundService>();
```

Ajouter le using si nécessaire :
```csharp
using Cantine.TcpListener;
```

**Pourquoi :** Le Singleton `ISupervisionStore` de l'API doit être peuplé par un service qui tourne dans le processus API. Sans cela, `GET /api/supervision/status` retourne toujours `[]`.

## T3 — Mettre à jour `LecteursPage.tsx` : SSE live au lieu du polling

**Fichier :** `cantine-web/src/pages/admin/LecteursPage.tsx`

Remplacer le `useQuery` avec `refetchInterval` par un `EventSource` sur `/api/supervision/stream` :

```typescript
const [supervisionStatuses, setSupervisionStatuses] = useState<EquipmentStatusDto[]>([]);
const esRef = useRef<EventSource | null>(null);
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Chargement initial
useEffect(() => {
  getSupervisionStatus().then(setSupervisionStatuses).catch(() => {});
}, []);

// SSE pour mises à jour live
useEffect(() => {
  const token = localStorage.getItem('token') ?? '';
  const es = new EventSource(`${API_BASE}/api/supervision/stream`);
  esRef.current = es;
  es.onmessage = (event) => {
    try {
      const dto: EquipmentStatusDto = JSON.parse(event.data);
      setSupervisionStatuses(prev =>
        prev.some(s => s.id === dto.id)
          ? prev.map(s => s.id === dto.id ? dto : s)
          : [...prev, dto]
      );
    } catch { /* ignore */ }
  };
  return () => { es.close(); esRef.current = null; };
}, [API_BASE]);
```

Ajouter les imports : `useEffect, useRef, useState` depuis react, `getSupervisionStatus` depuis `../../api/supervision`.

## T4 — Colonne imprimante avec statut dans `LecteursPage.tsx`

**Fichier :** `cantine-web/src/pages/admin/LecteursPage.tsx`

Enrichir la colonne "Imprimante" existante pour afficher le statut de l'imprimante :

```typescript
{
  title: 'Imprimante',
  key: 'imprimante',
  render: (_, record) => {
    const impStatus = supervisionStatuses.find(
      s => s.type === 'imprimante' && s.adresseIP === record.printerIP
    );
    return record.imprimanteConfiguree ? (
      <Tooltip title={`${record.printerIP} : ${record.portImprimante}`}>
        <div>
          <Tag color="green" style={{ marginBottom: 2 }}>Configurée</Tag>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
            {record.nomImprimante ?? record.printerIP}
          </div>
          {impStatus && (
            <Tag
              color={impStatus.connecte ? 'green' : 'red'}
              style={{ fontSize: 10, marginTop: 2 }}
            >
              {impStatus.connecte ? 'Imprimante OK' : 'Hors ligne'}
            </Tag>
          )}
        </div>
      </Tooltip>
    ) : (
      <Tag color="default">Non configurée</Tag>
    );
  },
},
```

## T5 — Vérification build backend

```bash
dotnet build Cantine.API/Cantine.API.csproj
```

Vérifier : 0 erreur. Le `using Cantine.TcpListener` doit résoudre `SupervisionBackgroundService`.

**Note :** `Cantine.API.csproj` doit référencer `Cantine.TcpListener` ou le `SupervisionBackgroundService` doit être déplacé dans `Cantine.Infrastructure`. Si référence circulaire → déplacer le service dans `Cantine.Infrastructure/Services/`.

## T6 — Déplacer `SupervisionBackgroundService` dans `Cantine.Infrastructure` (si T5 échoue)

Si `Cantine.API` ne peut pas référencer `Cantine.TcpListener` (référence circulaire), déplacer le fichier :

- Copier `Cantine.TcpListener/SupervisionBackgroundService.cs` → `Cantine.Infrastructure/Services/SupervisionBackgroundService.cs`
- Mettre à jour le namespace : `Cantine.Infrastructure.Services`
- Mettre à jour l'import dans `Cantine.API/Program.cs` : `using Cantine.Infrastructure.Services;`
- Mettre à jour l'import dans `Cantine.TcpListener/Program.cs` : `using Cantine.Infrastructure.Services;`

## T7 — Vérification TypeScript frontend

```bash
cd cantine-web && npx tsc --noEmit
```

0 erreur attendu.

## T8 — Test manuel

- Démarrer l'API → attendre 30 secondes → ouvrir `/admin/supervision` → les lecteurs et imprimantes apparaissent avec leur statut réel.
- Page Lecteurs → colonne "Connexion" affiche Connecté/Déconnecté en temps réel.
- Couper le réseau d'un lecteur → dans les 30 s, badge passe au rouge dans LecteursPage ET SupervisionPage.
- Reconnecter → badge revient vert en moins de 30 s.
- Imprimante associée → badge "Imprimante OK" ou "Hors ligne" visible sous la colonne Imprimante.
