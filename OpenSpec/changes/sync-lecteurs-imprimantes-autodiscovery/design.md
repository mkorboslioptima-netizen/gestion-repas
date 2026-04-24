## Architecture

Pas de nouvelle table BDD (colonnes déjà créées par la migration précédente). Les changements portent sur :
- Enrichissement des DTOs Lecteur existants
- Extension de `LecteurService` pour mapper les champs imprimante
- Nouveau service de découverte `ImprimanteDiscoveryService`
- Nouveau endpoint `POST /api/imprimantes/discover`
- Mise à jour des composants React

---

## Backend

### `Cantine.Core/DTOs/LecteurDto.cs` — enrichissement

```csharp
public class LecteurDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public string? NomImprimante { get; set; }
    public string? PrinterIP { get; set; }
    public int PortImprimante { get; set; }
    public bool ImprimanteConfiguree { get; set; }
}

public class UpdateLecteurDto
{
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public string? NomImprimante { get; set; }
    public string? PrinterIP { get; set; }
    public int PortImprimante { get; set; } = 9100;
}
```

### `Cantine.Core/DTOs/ImprimanteDiscoveredDto.cs` — nouveau DTO

```csharp
public record ImprimanteDiscoveredDto(
    string AdresseIP,
    string? NomImprimante,
    string Source   // "windows" | "reseau"
);
```

### `LecteurService` — mapping enrichi

Dans `GetAllAsync()` et `GetByIdAsync()`, mapper les nouveaux champs :
```csharp
new LecteurDto
{
    Id = l.Id,
    Nom = l.Nom,
    AdresseIP = l.AdresseIP,
    Actif = l.Actif,
    NomImprimante = l.NomImprimante,
    PrinterIP = l.PrinterIP,
    PortImprimante = l.PortImprimante,
    ImprimanteConfiguree = !string.IsNullOrWhiteSpace(l.PrinterIP)
}
```

Dans `UpdateAsync()`, persister les champs imprimante :
```csharp
lecteur.NomImprimante = dto.NomImprimante;
lecteur.PrinterIP = dto.PrinterIP;
lecteur.PortImprimante = dto.PortImprimante > 0 ? dto.PortImprimante : 9100;
```

---

### `Cantine.Infrastructure/Services/ImprimanteDiscoveryService.cs` — nouveau service

Deux mécanismes combinés :

**Source 1 — Imprimantes Windows (WMI)**
```csharp
private static IEnumerable<ImprimanteDiscoveredDto> DiscoverWindowsPrinters()
{
    var results = new List<ImprimanteDiscoveredDto>();
    try
    {
        using var searcher = new ManagementObjectSearcher(
            "SELECT Name, HostAddress FROM Win32_TCPIPPrinterPort");
        foreach (ManagementObject port in searcher.Get())
        {
            var ip = port["HostAddress"]?.ToString();
            var name = port["Name"]?.ToString();
            if (!string.IsNullOrWhiteSpace(ip))
                results.Add(new ImprimanteDiscoveredDto(ip, name, "windows"));
        }
    }
    catch { /* WMI non disponible — ignorer silencieusement */ }
    return results;
}
```

Requires NuGet : `System.Management` (déjà disponible sur .NET pour Windows)

**Source 2 — Scan réseau port 9100**
```csharp
private static async Task<IEnumerable<ImprimanteDiscoveredDto>> ScanNetworkAsync()
{
    // Détecter le sous-réseau local depuis les interfaces réseau
    var localIP = NetworkInterface.GetAllNetworkInterfaces()
        .Where(n => n.OperationalStatus == OperationalStatus.Up
                 && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
        .SelectMany(n => n.GetIPProperties().UnicastAddresses)
        .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork
                          && !IPAddress.IsLoopback(a.Address));

    if (localIP == null) return [];

    var parts = localIP.Address.ToString().Split('.');
    var prefix = $"{parts[0]}.{parts[1]}.{parts[2]}";

    // Scanner 1-254 en parallèle avec timeout 300 ms
    var tasks = Enumerable.Range(1, 254).Select(async i =>
    {
        var ip = $"{prefix}.{i}";
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(ip, 9100).WaitAsync(TimeSpan.FromMilliseconds(300));
            return new ImprimanteDiscoveredDto(ip, null, "reseau");
        }
        catch { return null; }
    });

    var results = await Task.WhenAll(tasks);
    return results.Where(r => r != null).Cast<ImprimanteDiscoveredDto>();
}
```

**Méthode publique combinée :**
```csharp
public async Task<IEnumerable<ImprimanteDiscoveredDto>> DiscoverAsync()
{
    var windows = DiscoverWindowsPrinters();
    var network = await ScanNetworkAsync();

    // Dédupliquer par IP, Windows prioritaire (a le nom)
    var all = windows.Concat(network)
        .GroupBy(d => d.AdresseIP)
        .Select(g => g.OrderBy(d => d.Source == "windows" ? 0 : 1).First())
        .OrderBy(d => d.AdresseIP)
        .ToList();

    return all;
}
```

---

### `ImprimantesController` — ajout endpoint discover

```csharp
// POST /api/imprimantes/discover
[HttpPost("discover")]
public async Task<IActionResult> Discover()
{
    var results = await _discoveryService.DiscoverAsync();
    return Ok(results);
}
```

Injecter `ImprimanteDiscoveryService` dans le constructeur.

---

## Frontend

### `src/api/lecteurs.ts` — mise à jour types

Ajouter à `LecteurDto` :
```typescript
nomImprimante: string | null;
printerIP: string | null;
portImprimante: number;
imprimanteConfiguree: boolean;
```

Ajouter à `UpdateLecteurDto` :
```typescript
nomImprimante?: string | null;
printerIP?: string | null;
portImprimante?: number;
```

---

### `LecteurFormModal.tsx` — section imprimante

Ajouter après le champ Adresse IP (toujours visible, pas seulement en édition) :

```tsx
<Form.Item label="Imprimante" style={{ marginBottom: 0 }}>
  <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '12px 12px 0', marginBottom: 16 }}>
    <Form.Item name="nomImprimante" label="Nom imprimante">
      <Input placeholder="Ex: IMP-ENTREE-A" />
    </Form.Item>
    <Form.Item name="printerIP" label="Adresse IP imprimante">
      <Input placeholder="192.168.x.x" />
    </Form.Item>
    <Form.Item name="portImprimante" label="Port TCP" initialValue={9100}>
      <InputNumber min={1} max={65535} style={{ width: '100%' }} />
    </Form.Item>
  </div>
</Form.Item>
```

Dans `useEffect`, peupler aussi ces champs :
```typescript
nomImprimante: initialValues.nomImprimante ?? '',
printerIP: initialValues.printerIP ?? '',
portImprimante: initialValues.portImprimante ?? 9100,
```

---

### `LecteursPage.tsx` — colonne imprimante + invalidation

**Nouvelle colonne :**
```tsx
{
  title: 'Imprimante',
  key: 'imprimante',
  render: (_, record) => (
    <div>
      {record.imprimanteConfiguree ? (
        <>
          <Tag color="green" style={{ marginBottom: 2 }}>Configurée</Tag>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {record.nomImprimante ?? record.printerIP}
          </div>
        </>
      ) : (
        <Tag color="default">Non configurée</Tag>
      )}
    </div>
  ),
}
```

**Invalidation croisée dans `updateMutation.onSuccess` :**
```typescript
queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
```

---

### `ImprimantesPage.tsx` — bouton Découvrir + drawer

**Nouveau DTO côté frontend :**
```typescript
interface ImprimanteDiscoveredDto {
  adresseIP: string;
  nomImprimante: string | null;
  source: 'windows' | 'reseau';
}
```

**Fonction discovery :**
```typescript
async function handleDiscover() {
  setDiscovering(true);
  try {
    const { data } = await apiClient.post<ImprimanteDiscoveredDto[]>('/api/imprimantes/discover');
    setDiscovered(data);
    setDrawerOpen(true);
  } catch {
    message.error('Erreur lors de la découverte');
  } finally {
    setDiscovering(false);
  }
}
```

**Drawer de résultats :**
```tsx
<Drawer title="Imprimantes découvertes" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}>
  {discovered.map(imp => (
    <div key={imp.adresseIP} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Tag color={imp.source === 'windows' ? 'blue' : 'cyan'}>
        {imp.source === 'windows' ? 'Windows' : 'Réseau'}
      </Tag>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{imp.adresseIP}</div>
        {imp.nomImprimante && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{imp.nomImprimante}</div>}
      </div>
      <Select
        placeholder="Associer à..."
        style={{ width: 160 }}
        size="small"
        onChange={(lecteurId) => handleAssociate(imp, lecteurId)}
      >
        {imprimantes.map(l => (
          <Select.Option key={l.lecteurId} value={l.lecteurId}>{l.nomLecteur}</Select.Option>
        ))}
      </Select>
    </div>
  ))}
</Drawer>
```

**Fonction association :**
```typescript
async function handleAssociate(imp: ImprimanteDiscoveredDto, lecteurId: number) {
  await updateImprimante(lecteurId, {
    nomImprimante: imp.nomImprimante,
    printerIP: imp.adresseIP,
    portImprimante: 9100,
  });
  queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
  queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
  message.success(`Imprimante ${imp.adresseIP} associée`);
}
```

**Invalidation croisée dans `updateMutation.onSuccess` :**
```typescript
queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
```

**Bouton Découvrir dans l'en-tête :**
```tsx
<Button icon={<SearchOutlined />} loading={discovering} onClick={handleDiscover}>
  Découvrir
</Button>
```

---

## Flux de données

```
LecteursPage / ImprimantesPage
  ├── Modification Lecteur (avec config imprimante)
  │     → PUT /api/lecteurs/{id} (UpdateLecteurDto enrichi)
  │     → LecteurService.UpdateAsync() → sauvegarde NomImprimante + PrinterIP + PortImprimante
  │     → Invalide ['lecteurs'] + ['imprimantes'] → les deux pages se rafraîchissent
  │
  ├── Modification Imprimante
  │     → PUT /api/imprimantes/{lecteurId}
  │     → Invalide ['imprimantes'] + ['lecteurs'] → les deux pages se rafraîchissent
  │
  └── Bouton Découvrir
        → POST /api/imprimantes/discover
        → ImprimanteDiscoveryService.DiscoverAsync()
              ├── WMI Win32_TCPIPPrinterPort → imprimantes Windows avec IP
              └── Scan réseau 192.168.x.1-254 port 9100 (parallèle, timeout 300 ms)
        → Drawer avec liste découverte + Select "Associer à..."
        → Association → PUT /api/imprimantes/{lecteurId} → invalide les deux caches
```

## Enregistrement DI

```csharp
builder.Services.AddScoped<ImprimanteDiscoveryService>();
```
