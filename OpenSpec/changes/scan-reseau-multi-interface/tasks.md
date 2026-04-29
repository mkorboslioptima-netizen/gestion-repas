## Tasks

### ~~T1 — Enrichir `ImprimanteDiscoveredDto` (Core)~~ ✓
- Fichier : `Cantine.Core/DTOs/ImprimanteDiscoveredDto.cs`
- Ajouter les paramètres optionnels `SousReseau` (string?) et `Port` (int, default 9100) au record
- Vérifier la rétrocompatibilité : les constructeurs existants passent toujours (valeurs par défaut)

### ~~T2 — Refactoring `ScanNetworkAsync` (Infrastructure)~~ ✓
- Fichier : `Cantine.Infrastructure/Services/ImprimanteDiscoveryService.cs`
- Remplacer `FirstOrDefault()` par une itération sur **toutes** les NICs actives (non-loopback, IPv4)
- Dédupliquer les préfixes /24 via `.Distinct()`
- Étendre le scan aux ports `[9100, 515, 631]` pour chaque IP
- Appliquer un `CancellationTokenSource` de 30 secondes sur l'ensemble des tâches
- Déduplication post-scan : pour une même IP, conserver le port le plus prioritaire (9100 > 515 > 631)
- Peupler les champs `SousReseau` et `Port` dans les DTOs retournés

### ~~T3 — Modifier la signature de `DiscoverAsync` (Infrastructure)~~ ✓
- Fichier : `Cantine.Infrastructure/Services/ImprimanteDiscoveryService.cs`
- Changer le retour de `Task<IEnumerable<ImprimanteDiscoveredDto>>` en `Task<(IEnumerable<ImprimanteDiscoveredDto> Results, int SubnetCount)>`
- `SubnetCount` = nombre de préfixes /24 distincts détectés (avant scan)

### ~~T4 — Mettre à jour le contrôleur (API)~~ ✓
- Fichier : `Cantine.API/Controllers/ImprimantesController.cs`
- Adapter l'appel à `_discoveryService.DiscoverAsync()` pour destructurer le tuple
- Ajouter `Response.Headers["X-Scan-Subnets"] = subnetCount.ToString()` avant `Ok(results)`

### ~~T5 — Mettre à jour le frontend (React)~~ ✓
- Fichier : `cantine-web/src/pages/admin/ImprimantesPage.tsx`
- Étendre `ImprimanteDiscoveredDto` avec `sousReseau?: string` et `port?: number`
- Ajouter l'état `subnetCount` (useState)
- Lire `res.headers['x-scan-subnets']` dans `handleDiscover` et stocker dans `subnetCount`
- Mettre à jour le titre du Drawer : afficher le nombre de sous-réseaux scannés
- Dans chaque item du Drawer : afficher `imp.sousReseau` dans le Tag réseau, et afficher le port si ≠ 9100

### ~~T6 — Tests manuels~~ ✓
- Vérifier que le scan couvre bien toutes les NICs actives de la machine
- Vérifier que le header `X-Scan-Subnets` est présent dans la réponse
- Vérifier que le Drawer affiche correctement les sous-réseaux et ports
- Vérifier que le timeout de 30 s est bien respecté (simuler réseau lent)
