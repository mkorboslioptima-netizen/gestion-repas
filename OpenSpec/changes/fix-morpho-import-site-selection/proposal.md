## Why

Sur la page Morpho (EmployesPage), un admin qui gère plusieurs sites peut :
1. Sélectionner **Site 2** dans la liste déroulante de la section "Import depuis MorphoManager"
2. Avoir **Site 3** sélectionné dans le filtre de la liste des employés (barre du bas)

Résultat : le bouton "Importer depuis MorphoManager" lance l'import pour **Site 3** (le site du filtre) au lieu de **Site 2** (le site choisi dans la section import). L'import s'exécute donc sur le mauvais site, silencieusement.

## What Changes

- Supprimer le double état de site dans `EmployesPage.tsx` : le sélecteur de la section "Import" doit utiliser `filtreSite` (l'état local du filtre) comme source unique de vérité, et non `siteId` du contexte global `useSite`.
- Retirer l'usage de `useSite` / `setSiteId` dans cette page (devenu inutile après correction).
- Résultat UX : quand l'admin sélectionne un site dans le sélecteur d'import, la liste des employés se met à jour sur ce même site, et l'import cible ce site. Les deux sélecteurs sont désormais synchronisés via un seul état.

## Capabilities

### Modified Capabilities
- `import-morpho-site` : Le site passé à `importDepuisMorpho()` correspond désormais au site affiché dans le sélecteur de la section import (cohérent avec `tableSiteId`).

### Removed Capabilities
- Usage de `useSite()` dans `EmployesPage` : cet état contextuel global était utilisé à tort pour contrôler le sélecteur d'import sans affecter `tableSiteId`.

## Impact

- **Frontend** : `cantine-web/src/pages/admin/EmployesPage.tsx` uniquement — correction de deux lignes dans le rendu JSX + suppression de `const { siteId, setSiteId } = useSite()`
- **Aucun changement** backend, BDD, ni autre fichier frontend
