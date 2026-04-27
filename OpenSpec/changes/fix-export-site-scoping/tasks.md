# Tasks — fix-export-site-scoping

## T1 — ✅ Ajouter helpers `GetUserSiteId()` et `IsAdmin()` dans `RepasController.cs`

Fichier : `Cantine.API/Controllers/RepasController.cs`

Ajouter ces deux méthodes privées juste avant le commentaire `// ── Helpers ───` ou après le constructeur :

```csharp
private string? GetUserSiteId()
    => User.FindFirst("siteId")?.Value;

private bool IsAdmin()
    => User.IsInRole("AdminSEBN");
```

## T2 — ✅ Forcer `siteId` du JWT dans `GetHistoriqueJour`

Fichier : `Cantine.API/Controllers/RepasController.cs`

Dans le bloc filtré (ligne ~89, `if (dateDebut is not null || ... || siteId is not null)`), ajouter en première ligne du bloc :

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

## T3 — ✅ Forcer `siteId` du JWT dans `GetStatsJour`

Fichier : `Cantine.API/Controllers/RepasController.cs`

Ajouter juste avant `var sitesQuery = _context.Sites.AsNoTracking()...` :

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

## T4 — ✅ Forcer `siteId` du JWT dans `GetExport`

Fichier : `Cantine.API/Controllers/RepasController.cs`

Ajouter juste après le bloc `TryParseFiltreParams` (après le `return BadRequest`), avant `var bytes = await _excelService.GenererExportPassagesAsync...` :

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

## T5 — ✅ Forcer `siteId` du JWT dans `GetExportGlobal`

Fichier : `Cantine.API/Controllers/RepasController.cs`

Ajouter juste après le bloc `TryParseFiltreParams`, avant `string? siteNom = null` :

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

## T6 — ✅ Filtrer par siteId dans `RapportsController.GetRecapMensuel`

Fichier : `Cantine.API/Controllers/RapportsController.cs`

Remplacer la requête `_context.MealLogs` actuelle (lignes 31-34) par une version filtrée :

```csharp
var userSiteId = User.FindFirst("siteId")?.Value;
var isAdmin = User.IsInRole("AdminSEBN");

var query = _context.MealLogs
    .AsNoTracking()
    .Where(m => m.Timestamp >= debut && m.Timestamp < fin);

if (!isAdmin && userSiteId is not null)
    query = query.Where(m => m.SiteId == userSiteId);

var passages = await query.ToListAsync();
```

## T7 — ✅ Initialiser `siteId` pour les non-admins dans `DashboardFilters.tsx`

Fichier : `cantine-web/src/components/DashboardFilters.tsx`

1. Ajouter l'import : `import { useAuth } from '../auth/AuthContext';`
2. Dans le composant, ajouter : `const { siteId: authSiteId } = useAuth();`
3. Modifier l'état `siteId` :

```typescript
const [siteId, setSiteId] = useState<string | undefined>(
  role !== 'AdminSEBN' ? (authSiteId ?? undefined) : undefined
);
```

## T8 — ✅ Initialiser `filtre.siteId` dans `DashboardPage.tsx`

Fichier : `cantine-web/src/pages/DashboardPage.tsx`

1. Ajouter l'import : `import { useAuth } from '../auth/AuthContext';`
2. Dans le composant, après `const [filtre, setFiltre] = useState<FiltreState>(defaultFiltre)`, ajouter :

```typescript
const { roles, siteId: authSiteId } = useAuth();
const isAdmin = roles.includes('AdminSEBN');

useEffect(() => {
  if (!isAdmin && authSiteId) {
    setFiltre(prev => ({ ...prev, siteId: authSiteId }));
  }
}, [isAdmin, authSiteId]);
```

## T9 — ✅ Vérification TypeScript

```bash
cd cantine-web && npx tsc --noEmit
```

Aucune erreur — OK.

## T10 — Test manuel

- Connecter en tant que **gestionnaire** (ResponsableCantine) :
  - La page Dashboard affiche les données de son site uniquement (stats, historique)
  - Export Excel → fichier contenant uniquement les données de son site
  - Export résumé → idem
- Connecter en tant que **prestataire** :
  - Rapport mensuel → données de son site uniquement
  - Export détaillé/résumé → données de son site uniquement
- Connecter en tant qu'**admin** :
  - Comportement inchangé — peut voir et exporter tous les sites
  - Le sélecteur de site fonctionne toujours
