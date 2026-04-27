## Architecture

Double correction : backend (enforcement de sécurité) + frontend (UX cohérente).

Le JWT de chaque utilisateur non-admin contient le claim `"siteId"` (injecté dans `AuthService.cs`). Ce claim doit être lu dans les contrôleurs et utilisé comme filtre obligatoire.

---

## Backend — RepasController.cs

### Helpers à ajouter (privés)

```csharp
private string? GetUserSiteId()
    => User.FindFirst("siteId")?.Value;

private bool IsAdmin()
    => User.IsInRole("AdminSEBN");
```

### GetHistoriqueJour — après `TryParseFiltreParams`

```csharp
// Force le site pour les non-admins
if (!IsAdmin()) siteId = GetUserSiteId();
```

Insérer juste après la vérification de `TryParseFiltreParams`, avant le `if (dateDebut is not null ...)`.
Plus précisément : dans le bloc filtré (ligne ~89), avant `var query = _context.MealLogs...`

```csharp
// Mode filtré
if (dateDebut is not null || ...)
{
    if (!IsAdmin()) siteId = GetUserSiteId(); // ← ajouter ici

    if (!TryParseFiltreParams(...))
        return BadRequest(...);
    ...
}
```

### GetStatsJour — avant `var sitesQuery`

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

Insérer juste avant `var sitesQuery = _context.Sites...` (ligne ~145).

### GetExport — avant `var bytes = await _excelService...`

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

Insérer juste après `TryParseFiltreParams` (ligne ~201).

### GetExportGlobal — avant `string? siteNom = null`

```csharp
if (!IsAdmin()) siteId = GetUserSiteId();
```

Insérer juste après `TryParseFiltreParams` (ligne ~225).

---

## Backend — RapportsController.cs

### GetRecapMensuel — ajouter filtre siteId

```csharp
[HttpGet("prestataire/mensuel")]
public async Task<IActionResult> GetRecapMensuel([FromQuery] int annee, [FromQuery] int mois)
{
    if (annee < 2020 || annee > 2100 || mois < 1 || mois > 12)
        return BadRequest(new { message = "Paramètres annee/mois invalides." });

    var debut = new DateTime(annee, mois, 1);
    var fin   = debut.AddMonths(1);

    // Extraire siteId du JWT — obligatoire pour Prestataire, optionnel pour AdminSEBN
    var userSiteId = User.FindFirst("siteId")?.Value;
    var isAdmin = User.IsInRole("AdminSEBN");

    var query = _context.MealLogs
        .AsNoTracking()
        .Where(m => m.Timestamp >= debut && m.Timestamp < fin);

    if (!isAdmin && userSiteId is not null)
        query = query.Where(m => m.SiteId == userSiteId);

    var passages = await query.ToListAsync();

    var result = passages
        .GroupBy(m => DateOnly.FromDateTime(m.Timestamp))
        .OrderBy(g => g.Key)
        .Select(g => new
        {
            date        = g.Key.ToString("yyyy-MM-dd"),
            platsChauds = g.Count(m => m.RepasType == RepasType.PlatChaud),
            sandwichs   = g.Count(m => m.RepasType == RepasType.Sandwich),
            total       = g.Count()
        })
        .ToList();

    return Ok(result);
}
```

---

## Frontend — DashboardFilters.tsx

### Initialiser siteId pour les non-admins

Ajouter `useAuth` :
```typescript
import { useAuth } from '../auth/AuthContext';
```

Dans le composant :
```typescript
const { siteId: authSiteId } = useAuth();
```

Modifier l'état initial de `siteId` :
```typescript
// AVANT
const [siteId, setSiteId] = useState<string | undefined>(undefined);

// APRÈS
const [siteId, setSiteId] = useState<string | undefined>(
  role !== 'AdminSEBN' ? (authSiteId ?? undefined) : undefined
);
```

---

## Frontend — DashboardPage.tsx

### Initialiser filtre.siteId pour les non-admins

La fonction `defaultFiltre()` est une factory appelée en `useState(defaultFiltre)` — elle est dans le module, pas dans le composant. Il faut la passer en factory dans le composant, ou utiliser une initialisation dans `useEffect`.

**Approche recommandée** : `useEffect` pour initialiser le siteId au montage.

Ajouter dans le composant, après `const [filtre, setFiltre] = useState<FiltreState>(defaultFiltre)` :

```typescript
const { roles, siteId: authSiteId } = useAuth();
const isAdmin = roles.includes('AdminSEBN');

// Initialise le filtre siteId pour les non-admins au montage
useEffect(() => {
  if (!isAdmin && authSiteId) {
    setFiltre(prev => ({ ...prev, siteId: authSiteId }));
  }
}, [isAdmin, authSiteId]);
```

Ajouter l'import `useAuth` :
```typescript
import { useAuth } from '../auth/AuthContext';
```

---

## Flux de données corrigé

```
Gestionnaire (siteId="SIEGE" dans JWT)
  → DashboardFilters initialise siteId="SIEGE" dès le montage
  → filtreParams.siteId = "SIEGE"
  → GET /api/repas/stats-jour?siteId=SIEGE
       → RepasController.GetStatsJour()
       → !IsAdmin() → siteId = "SIEGE" (forcé depuis JWT)  ← MÊME si ?siteId=PROVINCE
       → retourne stats de SIEGE uniquement ✅

  → GET /api/repas/export?siteId=SIEGE
       → !IsAdmin() → siteId = "SIEGE"
       → Excel avec données de SIEGE uniquement ✅
```
