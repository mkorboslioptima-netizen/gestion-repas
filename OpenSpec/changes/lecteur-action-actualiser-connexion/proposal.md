## Why

La page Lecteurs vérifie la connectivité automatiquement toutes les 30 secondes via `SupervisionBackgroundService`. Mais l'opérateur n'a aucun moyen de forcer une vérification immédiate après avoir rebranché une pointeuse ou corrigé une configuration réseau. Il doit attendre jusqu'à 30 secondes sans feedback. Si la pointeuse est sur un réseau flaky, il peut rater la fenêtre.

Un bouton "Actualiser" par pointeuse permet de déclencher manuellement et immédiatement le test ICMP + TCP pour un équipement donné et d'afficher le résultat en temps réel.

## What Changes

### Bouton "Actualiser" dans la colonne Actions de LecteursPage

- Nouveau bouton icône `<ReloadOutlined />` dans la colonne Actions de chaque ligne lecteur.
- Au clic : appel `POST /api/supervision/check/{lecteurId}`.
- Pendant l'appel : le bouton affiche un spinner (loading), les badges Connexion et Imprimante passent en état "Vérification…".
- Après la réponse : les badges se mettent à jour immédiatement avec le nouveau statut (sans attendre le prochain cycle SSE).

### Endpoint backend `POST /api/supervision/check/{lecteurId}`

- Charge le lecteur depuis la BDD.
- Lance `CheckConnectivityAsync(adresseIP, 11020)` pour le lecteur.
- Si imprimante configurée : lance `CheckConnectivityAsync(printerIP, port)`.
- Met à jour le store via `ISupervisionStore.UpdateStatus(...)`.
- Retourne `{ lecteur: EquipmentStatusDto, imprimante: EquipmentStatusDto? }`.

### Service `ISupervisionChecker`

- Interface `ISupervisionChecker` dans `Cantine.Core/Interfaces/` avec méthode `CheckLecteurAsync(int lecteurId, CancellationToken ct)`.
- Implémentation `SupervisionChecker` dans `Cantine.Infrastructure/Services/`.
- La méthode `CheckConnectivityAsync` (ICMP + TCP) est extraite dans `SupervisionChecker` (plus de duplication avec `SupervisionBackgroundService`).
- `SupervisionBackgroundService` délègue à `ISupervisionChecker`.

## Capabilities

### New Capabilities
- `supervision-check-manuel` : `POST /api/supervision/check/{lecteurId}` — vérifie immédiatement la connectivité d'un lecteur et de son imprimante.
- `supervision-checker-service` : `ISupervisionChecker` + `SupervisionChecker` — logique de ping extraite en service réutilisable.

### Modified Capabilities
- `lecteur-actions-column` : bouton "Actualiser" ajouté dans la colonne Actions de LecteursPage.
- `supervision-background-service` : délègue `CheckConnectivityAsync` à `ISupervisionChecker` (refactoring interne).

## Impact

- **Cantine.Core/Interfaces/ISupervisionChecker.cs** : nouvelle interface.
- **Cantine.Infrastructure/Services/SupervisionChecker.cs** : nouvelle implémentation avec `CheckConnectivityAsync`.
- **Cantine.Infrastructure/Services/SupervisionBackgroundService.cs** : injecte `ISupervisionChecker`, supprime `CheckConnectivityAsync` dupliqué.
- **Cantine.API/Controllers/SupervisionController.cs** : nouveau endpoint `POST /api/supervision/check/{lecteurId}`.
- **Cantine.API/Program.cs** : enregistrer `ISupervisionChecker → SupervisionChecker` (Scoped).
- **cantine-web/src/api/supervision.ts** : ajouter `checkLecteur(lecteurId: number)`.
- **cantine-web/src/pages/admin/LecteursPage.tsx** : bouton Actualiser dans Actions, gestion loading + mise à jour locale du statut.
- **Aucune migration BDD**.
