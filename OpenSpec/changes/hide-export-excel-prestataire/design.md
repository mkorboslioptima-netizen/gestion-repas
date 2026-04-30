## Context

`DashboardPage.tsx` affiche une barre d'actions avec deux boutons d'export (lignes 276-283) :

```tsx
<RoleGate allowed={['Prestataire', 'AdminSEBN', 'ResponsableCantine']}>
  <Button onClick={handleExportGlobal} ...>Export résumé</Button>
  <Button onClick={handleExportExcel} ...>Export détaillé</Button>
</RoleGate>
```

Le composant `RoleGate` (`src/components/RoleGate.tsx`) rend ses enfants visibles uniquement si le rôle JWT de l'utilisateur figure dans la liste `allowed`. Il suffit de séparer les deux boutons dans des `RoleGate` distincts avec des listes `allowed` différentes.

## Goals / Non-Goals

**Goals:**
- Masquer "Export détaillé" pour le rôle `Prestataire`
- Conserver "Export résumé" accessible aux trois rôles
- Aucun changement backend

**Non-Goals:**
- Sécurisation côté API de l'endpoint d'export détaillé (hors scope — le Prestataire n'a pas accès à cet endpoint de toute façon via les policies API existantes)
- Modification du comportement pour `AdminSEBN` ou `ResponsableCantine`

## Decisions

### D1 — Séparation en deux `RoleGate` indépendants

Chaque bouton est enveloppé dans son propre `RoleGate` :

```tsx
{/* Export résumé — accessible à tous les rôles */}
<RoleGate allowed={['Prestataire', 'AdminSEBN', 'ResponsableCantine']}>
  <Button onClick={handleExportGlobal} loading={exportGlobalLoading} type="primary" ghost>
    Export résumé
  </Button>
</RoleGate>

{/* Export détaillé — masqué pour Prestataire */}
<RoleGate allowed={['AdminSEBN', 'ResponsableCantine']}>
  <Button onClick={handleExportExcel} loading={exportLoading} type="primary" ghost>
    Export détaillé
  </Button>
</RoleGate>
```

> Alternatif écarté : conditionnel inline `{role !== 'Prestataire' && <Button>}` — moins cohérent avec le pattern `RoleGate` déjà établi dans le projet.

## Risks / Trade-offs

- **Risque nul** : changement purement UI, aucune logique métier touchée
- **Trade-off** : si un quatrième rôle est ajouté dans le futur, il faudra penser à mettre à jour les deux `RoleGate` séparément

## Migration Plan

1. Modifier `DashboardPage.tsx` — séparer le bloc `RoleGate` unique en deux blocs distincts
2. Vérifier visuellement en se connectant avec un compte Prestataire
