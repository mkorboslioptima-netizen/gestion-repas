# Tasks — gestion-imprimantes

## T1 — ✅ Enrichir l'entité `Lecteur` et créer les DTOs

**Fichier :** `Cantine.Core/Entities/Lecteur.cs`
- Ajouter `public string? NomImprimante { get; set; }`
- Ajouter `public int PortImprimante { get; set; } = 9100;`

**Fichiers à créer :**
- `Cantine.Core/DTOs/ImprimanteDto.cs` — record avec : LecteurId, NomLecteur, SiteId, NomImprimante, PrinterIP, PortImprimante, Configuree (bool)
- `Cantine.Core/DTOs/UpdateImprimanteDto.cs` — record avec : NomImprimante, PrinterIP, PortImprimante
- `Cantine.Core/DTOs/TestImprimanteResultDto.cs` — record avec : Succes (bool), Message, LatenceMs (int?)

## T2 — ✅ Créer l'interface `IImprimanteService`

**Fichier à créer :** `Cantine.Core/Interfaces/IImprimanteService.cs`
- `Task<IEnumerable<ImprimanteDto>> GetAllAsync()`
- `Task<ImprimanteDto> UpdateAsync(int lecteurId, UpdateImprimanteDto dto)`
- `Task<TestImprimanteResultDto> TestConnexionAsync(int lecteurId)`

## T3 — ✅ Migration EF Core

Créer une nouvelle migration nommée `AddPrinterFieldsToLecteurs` :
```bash
dotnet ef migrations add AddPrinterFieldsToLecteurs --project Cantine.Infrastructure --startup-project Cantine.API
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
```
- Vérifie que la migration ajoute bien `NomImprimante` (nvarchar, nullable) et `PortImprimante` (int, non nullable, défaut 9100) sur la table `Lecteurs`

## T4 — ✅ Implémenter `ImprimanteService`

**Fichier à créer :** `Cantine.Infrastructure/Services/ImprimanteService.cs`
- `GetAllAsync()` : SELECT tous les lecteurs, triés SiteId puis Nom, mappés en `ImprimanteDto`
- `UpdateAsync(lecteurId, dto)` : FindAsync + mise à jour 3 champs + SaveChangesAsync + retour DTO
- `TestConnexionAsync(lecteurId)` : TcpClient.ConnectAsync avec timeout 3s via `.WaitAsync(TimeSpan.FromSeconds(3))`, retourne latence en ms si succès, message d'erreur si échec

Usings nécessaires : `System.Diagnostics`, `System.Net.Sockets`

## T5 — ✅ Mettre à jour `EscPosService`

**Fichier :** `Cantine.Infrastructure/Printing/EscPosService.cs`
- Supprimer la constante `private const int PrinterPort = 9100;`
- Dans `PrintTicketAsync`, remplacer `client.ConnectAsync(lecteur.PrinterIP, PrinterPort)` par :
  ```csharp
  int port = lecteur.PortImprimante > 0 ? lecteur.PortImprimante : 9100;
  await client.ConnectAsync(lecteur.PrinterIP, port);
  ```

## T6 — ✅ Créer `ImprimantesController`

**Fichier à créer :** `Cantine.API/Controllers/ImprimantesController.cs`
- `[Authorize(Roles = "AdminSEBN")]`
- `GET /api/imprimantes` → `_service.GetAllAsync()`
- `PUT /api/imprimantes/{lecteurId}` → `_service.UpdateAsync(lecteurId, dto)` — 404 si KeyNotFoundException
- `POST /api/imprimantes/{lecteurId}/test` → `_service.TestConnexionAsync(lecteurId)` — 404 si KeyNotFoundException

## T7 — ✅ Enregistrer `ImprimanteService` dans DI

**Fichier :** `Cantine.API/Program.cs`
- Ajouter avant `builder.Build()` :
  ```csharp
  builder.Services.AddScoped<IImprimanteService, ImprimanteService>();
  ```

## T8 — ✅ Créer `src/api/imprimantes.ts`

**Fichier à créer :** `cantine-web/src/api/imprimantes.ts`
- Interfaces TypeScript : `ImprimanteDto`, `UpdateImprimanteDto`, `TestImprimanteResultDto`
- Fonctions : `fetchImprimantes()`, `updateImprimante(lecteurId, dto)`, `testImprimante(lecteurId)`
- Utiliser `apiClient` importé depuis `./axios`

## T9 — ✅ Créer `ImprimantesPage.tsx`

**Fichier à créer :** `cantine-web/src/pages/admin/ImprimantesPage.tsx`

État local :
```typescript
const [modalOpen, setModalOpen] = useState(false);
const [selected, setSelected] = useState<ImprimanteDto | null>(null);
const [testingId, setTestingId] = useState<number | null>(null);
```

Query :
```typescript
const { data: imprimantes = [], isLoading } = useQuery({
  queryKey: ['imprimantes'],
  queryFn: fetchImprimantes,
});
```

Mutation mise à jour :
```typescript
const updateMutation = useMutation({
  mutationFn: ({ id, dto }: { id: number; dto: UpdateImprimanteDto }) =>
    updateImprimante(id, dto),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
    message.success('Configuration mise à jour');
    setModalOpen(false);
  },
});
```

Fonction test connexion :
```typescript
async function handleTest(imp: ImprimanteDto) {
  setTestingId(imp.lecteurId);
  try {
    const result = await testImprimante(imp.lecteurId);
    if (result.succes) {
      message.success(`${result.message} (${result.latenceMs} ms)`);
    } else {
      message.error(result.message);
    }
  } finally {
    setTestingId(null);
  }
}
```

Colonnes du tableau :
- **Pointeuse** : `nomLecteur`
- **Site** : `siteId`
- **Nom imprimante** : `nomImprimante ?? '—'`
- **Adresse IP** : `printerIP ?? '—'`
- **Port** : `portImprimante`
- **Statut** : Tag vert "Configurée" si `configuree`, Tag gris "Non configurée" sinon
- **Actions** : Bouton "Configurer" (EditOutlined) + Bouton "Tester" (ApiOutlined, disabled si !configuree, loading si testingId === lecteurId)

Modal de configuration avec `Form` Ant Design :
- Champ "Nom imprimante" (Input, optionnel)
- Champ "Adresse IP" (Input, placeholder "192.168.x.x")
- Champ "Port TCP" (InputNumber, min=1, max=65535, defaultValue=9100)
- Boutons : Annuler / Enregistrer

## T10 — ✅ Ajouter la route et l'entrée menu dans `App.tsx`

**Fichier :** `cantine-web/src/App.tsx`
- Importer `ImprimantesPage` et `PrinterOutlined`
- Ajouter dans le menu AdminSEBN :
  ```tsx
  { key: '/admin/imprimantes', icon: <PrinterOutlined />, label: 'Imprimantes' }
  ```
- Ajouter la route :
  ```tsx
  <Route path="/admin/imprimantes" element={<ImprimantesPage />} />
  ```

## T11 — ✅ Test manuel

- Naviguer vers `/admin/imprimantes` → tableau avec tous les lecteurs
- Cliquer "Configurer" sur un lecteur → modal s'ouvre avec les valeurs actuelles
- Saisir une IP (`192.168.1.50`) et un nom, enregistrer → tableau mis à jour, statut passe à "Configurée"
- Cliquer "Tester" avec une IP valide → message success avec latence
- Cliquer "Tester" avec une IP invalide → message error avec explication
- Vérifier que "Tester" est désactivé si aucune IP configurée
- Vérifier qu'un pointage biométrique imprime bien le ticket (EscPosService utilise le port configuré)
