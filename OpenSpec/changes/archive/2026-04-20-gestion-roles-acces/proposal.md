## Why

L'application de gestion des repas est actuellement accessible sans distinction de responsabilités : tous les utilisateurs connectés voient et peuvent modifier toutes les fonctionnalités. Il est nécessaire de structurer les accès pour que chaque profil (administrateur interne, gestionnaire opérationnel, restaurateur prestataire) ne voie et n'agisse que dans son périmètre.

## What Changes

- Ajout d'un troisième rôle `Prestataire` (lecture seule : dashboard temps réel + export mensuel) en complément des rôles existants `AdminSEBN` et `ResponsableCantine` (renommé `Gestionnaire`)
- Création d'une page de gestion des comptes utilisateurs (réservée Admin) : créer, modifier le rôle, réinitialiser le mot de passe, désactiver un compte
- Sécurisation dynamique des menus et boutons dans l'interface React selon le rôle JWT décodé (éléments invisibles ou désactivés)
- Ajout d'une table `UserAuditLog` pour tracer les créations/modifications de comptes (qui, quoi, quand)
- Endpoint API sécurisé `POST /api/auth/users` (Admin uniquement) pour la gestion des comptes

## Capabilities

### New Capabilities
- `gestion-comptes`: Interface Admin de création/modification/désactivation des comptes utilisateurs avec audit trail
- `controle-acces-role`: Protection dynamique des routes React et masquage conditionnel des éléments UI selon le rôle JWT
- `role-prestataire`: Définition du rôle Prestataire — dashboard lecture seule et export récapitulatif mensuel

### Modified Capabilities
<!-- Aucune spec existante à modifier -->

## Impact

- **Backend** : `Cantine.Core` — ajout entité `ApplicationUser` enrichie (rôle, actif/inactif) + `UserAuditLog` ; `Cantine.Infrastructure` — migration EF Core ; `Cantine.API` — nouveaux endpoints `/api/auth/users` protégés par policy `AdminSEBN`
- **Frontend** : `src/auth/` — enrichissement du context JWT pour exposer le rôle ; `src/components/` — hook `useRole()` + composant `RoleGate` ; `src/pages/` — nouvelle page `GestionComptesPage`
- **Sécurité** : aucune élévation de privilège possible côté client — toutes les vérifications de rôle sont doublées côté API
