## Why

Le rôle `Prestataire` est un profil lecture seule destiné au restaurateur externe. Il doit pouvoir télécharger son récapitulatif mensuel (export résumé), mais l'export Excel détaillé contient des données nominatives (matricules, noms des employés, horodatages précis) qui ne doivent pas être accessibles au prestataire pour des raisons de confidentialité et de conformité RGPD.

Actuellement, le bouton "Export détaillé" est encapsulé dans le même `RoleGate` que le bouton "Export résumé", ce qui rend les deux boutons visibles pour le rôle `Prestataire`.

## What Changes

- Le bouton "Export détaillé" dans `DashboardPage.tsx` est masqué pour le rôle `Prestataire`
- Le bouton "Export résumé" reste accessible aux trois rôles (`AdminSEBN`, `ResponsableCantine`, `Prestataire`)
- Séparation des deux boutons dans des `RoleGate` distincts

## Capabilities

### Modified Capabilities
- `role-prestataire` : Le Prestataire ne voit plus le bouton "Export détaillé" sur le dashboard

### New Capabilities
<!-- Aucune nouvelle spec -->

## Impact

- **Frontend uniquement** : modification de `cantine-web/src/pages/DashboardPage.tsx` — séparation du `RoleGate` des deux boutons d'export
- **Backend** : aucun changement (l'endpoint `/api/rapports/prestataire/mensuel` reste inchangé)
- **Sécurité** : amélioration — les données nominatives ne sont plus accessibles au Prestataire via l'UI
