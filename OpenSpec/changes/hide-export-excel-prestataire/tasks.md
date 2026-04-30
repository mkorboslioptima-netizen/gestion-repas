## 1. Modification Frontend — DashboardPage.tsx

- [x] 1.1 Dans `cantine-web/src/pages/DashboardPage.tsx` (lignes ~276-283), remplacer le `RoleGate` unique contenant les deux boutons d'export par deux `RoleGate` distincts :
  - `<RoleGate allowed={['Prestataire', 'AdminSEBN', 'ResponsableCantine']}>` → bouton "Export résumé" uniquement
  - `<RoleGate allowed={['AdminSEBN', 'ResponsableCantine']}>` → bouton "Export détaillé" uniquement

## 2. Vérification

- [ ] 2.1 Se connecter avec un compte `Prestataire` et vérifier que seul le bouton "Export résumé" est visible
- [ ] 2.2 Se connecter avec un compte `AdminSEBN` ou `ResponsableCantine` et vérifier que les deux boutons sont toujours visibles
- [ ] 2.3 Vérifier que le bouton "Export résumé" fonctionne correctement pour le Prestataire
