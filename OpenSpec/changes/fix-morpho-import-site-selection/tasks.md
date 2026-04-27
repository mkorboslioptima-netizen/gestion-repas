# Tasks — fix-morpho-import-site-selection

## T1 — ✅ Supprimer `useSite` de `EmployesPage.tsx`

Fichier : `cantine-web/src/pages/admin/EmployesPage.tsx`

- Supprimer la ligne `const { siteId, setSiteId } = useSite();` (ligne 93)
- Supprimer l'import `import { useSite } from '../../context/SiteContext';` (ligne 20)

## T2 — ✅ Corriger le sélecteur de site dans la section import

Fichier : `cantine-web/src/pages/admin/EmployesPage.tsx`

Dans le `<Select>` de la section "Import depuis MorphoManager" (vers ligne 231-241) :
- Remplacer `value={siteId ?? undefined}` par `value={filtreSite ?? undefined}`
- Remplacer `onChange={(v) => setSiteId(v)}` par `onChange={setFiltreSite}`

Le sélecteur devient ainsi synchronisé avec le filtre de la liste des employés — une seule source de vérité : `filtreSite`.

## T3 — ✅ Vérification TypeScript

- Compiler le projet : `cd cantine-web && npm run build` (ou `npx tsc --noEmit`)
- S'assurer qu'aucune erreur TypeScript n'est introduite par la suppression de `siteId`/`setSiteId`

## T4 — Test manuel

- Se connecter en tant qu'admin avec au moins 2 sites
- Sur la page Morpho :
  - Sélectionner **Site A** dans le sélecteur de la section import → la liste des employés doit afficher les employés de **Site A**
  - Sélectionner **Site B** dans le filtre de la liste → le sélecteur de la section import doit aussi passer à **Site B** (synchronisation)
  - Cliquer "Importer depuis MorphoManager" → l'import doit cibler **Site B** (le site actif dans les deux sélecteurs)
- Vérifier qu'aucun autre comportement de la page n'est régressé (export Excel, filtres texte/statut/quota, statistiques)
