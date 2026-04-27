## Architecture

Correction purement côté client dans `EmployesPage.tsx`. Aucune modification backend, BDD, ni API.

**Cause racine :**

```
États actuels (BUGUÉ) :
  siteId      ← useSite() contexte global  ← sélecteur import (section du haut)
  filtreSite  ← useState local             ← sélecteur filtre (barre du bas)
  tableSiteId ← dérivé de filtreSite       ← handleImport() ← importDepuisMorpho()

Résultat : le site affiché dans le sélecteur d'import ≠ le site utilisé pour l'import
```

```
État corrigé (SOURCE UNIQUE) :
  filtreSite  ← useState local  ← sélecteur import (section du haut)
                                ← sélecteur filtre (barre du bas)
  tableSiteId ← dérivé de filtreSite ← handleImport() ← importDepuisMorpho()

Résultat : les deux sélecteurs sont synchronisés, l'import cible le bon site
```

## Composants modifiés

### `EmployesPage.tsx` — 3 changements chirurgicaux

**Changement 1 — Supprimer `useSite` (ligne 93)**

```typescript
// AVANT
const { siteId, setSiteId } = useSite();

// APRÈS
// (ligne supprimée)
```

**Changement 2 — Supprimer l'import `useSite` (ligne 20) si plus utilisé**

```typescript
// AVANT
import { useSite } from '../../context/SiteContext';

// APRÈS
// (ligne supprimée)
```

**Changement 3 — Sélecteur de la section import (lignes 234-235)**

```tsx
// AVANT
value={siteId ?? undefined}
onChange={(v) => setSiteId(v)}

// APRÈS
value={filtreSite ?? undefined}
onChange={setFiltreSite}
```

## Flux de données corrigé

```
Admin sélectionne "Site 2" dans le sélecteur import
  → setFiltreSite("site-2")
  → filtreSite = "site-2"
  → tableSiteId = "site-2"
  → Liste employés recharge pour Site 2
  → handleImport() → importDepuisMorpho("site-2") ✅

Admin avait "Site 3" dans le filtre avant
  → Les deux sélecteurs étaient désynchronisés (BUG)
  → Après correction : changer l'un change l'autre (même état)
```

## Aucun changement de comportement pour les cas nominaux

- Un admin avec un seul site : `filtreSite` est initialisé au premier site, aucune confusion possible
- Un gestionnaire (non-admin) : ne voit pas le sélecteur du tout, code non affecté (`tableSiteId = authSiteId ?? null`)
