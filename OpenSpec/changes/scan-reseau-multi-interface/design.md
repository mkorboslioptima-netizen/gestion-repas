## Architecture

Aucune nouvelle couche n'est introduite. La modification est contenue dans :
- `Cantine.Core` : enrichissement du DTO
- `Cantine.Infrastructure` : refactoring du service de découverte
- `Cantine.API` : ajout d'un header HTTP dans la réponse
- `cantine-web` : adaptation UI du drawer

## Backend

### `ImprimanteDiscoveredDto.cs` — Cantine.Core

Ajout de deux champs optionnels :

```csharp
public record ImprimanteDiscoveredDto(
    string AdresseIP,
    string? NomImprimante,
    string Source,
    string? SousReseau = null,   // ex: "192.168.10.x"
    int Port = 9100               // port sur lequel l'imprimante a répondu
);
```

### `ImprimanteDiscoveryService.cs` — Cantine.Infrastructure

Refactoring de `ScanNetworkAsync()` :

```csharp
private async Task<IEnumerable<ImprimanteDiscoveredDto>> ScanNetworkAsync()
{
    // Collecter tous les préfixes /24 uniques de toutes les NICs actives
    var prefixes = NetworkInterface.GetAllNetworkInterfaces()
        .Where(n => n.OperationalStatus == OperationalStatus.Up
                 && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
        .SelectMany(n => n.GetIPProperties().UnicastAddresses)
        .Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork
                 && !IPAddress.IsLoopback(a.Address))
        .Select(a => {
            var p = a.Address.ToString().Split('.');
            return $"{p[0]}.{p[1]}.{p[2]}";
        })
        .Distinct()
        .ToList();

    if (prefixes.Count == 0)
    {
        _logger.LogWarning("[Discovery] Aucune interface réseau active détectée");
        return [];
    }

    _logger.LogInformation("[Discovery] Scan sur {Count} sous-réseau(x) : {Prefixes}",
        prefixes.Count, string.Join(", ", prefixes.Select(p => p + ".0/24")));

    int[] ports = [9100, 515, 631];
    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

    var allTasks = prefixes.SelectMany(prefix =>
        Enumerable.Range(1, 254).SelectMany(i =>
            ports.Select(async port =>
            {
                var ip = $"{prefix}.{i}";
                try
                {
                    using var client = new TcpClient();
                    await client.ConnectAsync(ip, port)
                        .WaitAsync(TimeSpan.FromMilliseconds(300), cts.Token);
                    return new ImprimanteDiscoveredDto(ip, null, "reseau",
                        SousReseau: $"{prefix}.x", Port: port);
                }
                catch { return null; }
            })
        )
    );

    var results = await Task.WhenAll(allTasks);
    // Une IP peut répondre sur plusieurs ports — on garde la priorité 9100 > 515 > 631
    return results
        .Where(r => r is not null)
        .Cast<ImprimanteDiscoveredDto>()
        .GroupBy(r => r.AdresseIP)
        .Select(g => g.OrderBy(r => Array.IndexOf(ports, r.Port)).First());
}
```

**Propriété exposée pour le header :**

```csharp
public int GetPrefixCount() => /* retourner le nombre de préfixes détectés */
```

Plutôt que d'exposer un état interne, `DiscoverAsync()` retourne un tuple :

```csharp
public async Task<(IEnumerable<ImprimanteDiscoveredDto> Results, int SubnetCount)> DiscoverAsync()
```

### `ImprimantesController.cs` — Cantine.API

```csharp
[HttpPost("discover")]
public async Task<IActionResult> Discover()
{
    var (results, subnetCount) = await _discoveryService.DiscoverAsync();
    Response.Headers["X-Scan-Subnets"] = subnetCount.ToString();
    return Ok(results);
}
```

## Frontend

### `ImprimantesPage.tsx`

**Interface DTO mise à jour :**
```ts
interface ImprimanteDiscoveredDto {
  adresseIP: string;
  nomImprimante: string | null;
  source: 'windows' | 'reseau';
  sousReseau?: string;
  port?: number;
}
```

**État supplémentaire :**
```ts
const [subnetCount, setSubnetCount] = useState<number>(0);
```

**Handler discover mis à jour :**
```ts
const handleDiscover = async () => {
  setDiscovering(true);
  try {
    const res = await apiClient.post<ImprimanteDiscoveredDto[]>('/api/imprimantes/discover');
    const count = parseInt(res.headers['x-scan-subnets'] ?? '1', 10);
    setSubnetCount(count);
    setDiscovered(res.data);
    setDrawerOpen(true);
    if (res.data.length === 0)
      message.info(`Aucune imprimante trouvée sur ${count} sous-réseau(x) scanné(s).`);
  } catch {
    message.error('Erreur lors de la découverte des imprimantes');
  } finally {
    setDiscovering(false);
  }
};
```

**Bouton Découvrir mis à jour :**
```tsx
<Button
  icon={<SearchOutlined />}
  size="small"
  loading={discovering}
  onClick={handleDiscover}
>
  {discovering ? `Scan en cours...` : 'Découvrir'}
</Button>
```

**Drawer — titre et badge sous-réseau :**
```tsx
<Drawer
  title={`Imprimantes découvertes (${discovered.length}) — ${subnetCount} sous-réseau(x) scanné(s)`}
  ...
>
  {discovered.map(imp => (
    <div key={imp.adresseIP} ...>
      <Tag color={imp.source === 'windows' ? 'blue' : 'cyan'}>
        {imp.source === 'windows' ? 'Windows' : imp.sousReseau ?? 'Réseau'}
      </Tag>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{imp.adresseIP}</div>
        {imp.nomImprimante && <div style={{ fontSize: 11 }}>{imp.nomImprimante}</div>}
        {imp.port && imp.port !== 9100 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Port {imp.port} ({imp.port === 515 ? 'LPD' : 'IPP'})
          </div>
        )}
      </div>
      {/* Select associer inchangé */}
    </div>
  ))}
</Drawer>
```

## Requirements

- R1: SHALL scan all active non-loopback network interfaces on the server
- R2: SHALL deduplicate /24 prefixes when multiple NICs share the same subnet
- R3: SHALL scan ports 9100, 515, and 631 for each IP address
- R4: SHALL apply a global timeout of 30 seconds to the entire network scan
- R5: SHALL return the `X-Scan-Subnets` response header with the count of subnets scanned
- R6: SHALL keep per-IP connection timeout at 300 ms
- R7: SHALL preserve WMI Windows printer discovery unchanged
- R8: MUST NOT introduce breaking changes to `ImprimanteDiscoveredDto` (new fields are optional/defaulted)
- R9: SHALL display subnet count and detected port in the frontend discovery drawer
