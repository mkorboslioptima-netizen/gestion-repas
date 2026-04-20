## ADDED Requirements

### Requirement: Lister les comptes utilisateurs
L'API SHALL exposer un endpoint `GET /api/auth/users` retournant la liste de tous les comptes (Id, Email, Role, IsActive, CreatedAt, CreatedBy). Cet endpoint MUST être protégé par la policy `AdminSEBN` uniquement.

#### Scenario: Admin récupère la liste des comptes
- **WHEN** un utilisateur avec le rôle `AdminSEBN` appelle `GET /api/auth/users`
- **THEN** l'API retourne HTTP 200 avec un tableau JSON de tous les comptes

#### Scenario: Non-admin tente d'accéder à la liste
- **WHEN** un utilisateur avec le rôle `ResponsableCantine` ou `Prestataire` appelle `GET /api/auth/users`
- **THEN** l'API retourne HTTP 403

### Requirement: Créer un compte utilisateur
L'API SHALL exposer `POST /api/auth/users` permettant à un Admin de créer un nouveau compte avec Email, MotDePasse, et Rôle. Le mot de passe MUST être haché avec BCrypt avant stockage.

#### Scenario: Création réussie d'un compte Gestionnaire
- **WHEN** un Admin envoie `{ email, password, role: "ResponsableCantine" }` à `POST /api/auth/users`
- **THEN** l'API crée le compte, enregistre un `UserAuditLog` avec `Action: "Created"`, et retourne HTTP 201 avec l'Id du nouveau compte

#### Scenario: Email déjà utilisé
- **WHEN** un Admin tente de créer un compte avec un email déjà existant
- **THEN** l'API retourne HTTP 409 avec un message d'erreur explicite

#### Scenario: Rôle invalide
- **WHEN** un Admin envoie un rôle qui n'est pas dans `{ AdminSEBN, ResponsableCantine, Prestataire }`
- **THEN** l'API retourne HTTP 400

### Requirement: Modifier le rôle ou le statut d'un compte
L'API SHALL exposer `PUT /api/auth/users/{id}` permettant de changer le rôle ou de désactiver/réactiver un compte. Un Admin ne MUST PAS pouvoir désactiver son propre compte.

#### Scenario: Changement de rôle
- **WHEN** un Admin envoie `{ role: "Prestataire" }` pour un compte existant
- **THEN** l'API met à jour le rôle, enregistre `Action: "RoleChanged"` dans `UserAuditLog`, et retourne HTTP 200

#### Scenario: Désactivation d'un compte
- **WHEN** un Admin envoie `{ isActive: false }` pour un compte existant
- **THEN** l'API désactive le compte (l'utilisateur ne peut plus se connecter), enregistre `Action: "Deactivated"`, et retourne HTTP 200

#### Scenario: Auto-désactivation bloquée
- **WHEN** un Admin tente de désactiver son propre compte
- **THEN** l'API retourne HTTP 400 avec le message "Impossible de désactiver son propre compte"

### Requirement: Réinitialiser le mot de passe d'un compte
L'API SHALL exposer `POST /api/auth/users/{id}/reset-password` permettant à un Admin de définir un nouveau mot de passe pour n'importe quel compte.

#### Scenario: Réinitialisation réussie
- **WHEN** un Admin envoie `{ newPassword }` à `POST /api/auth/users/{id}/reset-password`
- **THEN** l'API met à jour le hash BCrypt et enregistre `Action: "PasswordReset"` dans `UserAuditLog`

### Requirement: Page de gestion des comptes dans l'interface
L'interface React SHALL afficher une page `GestionComptesPage` accessible uniquement aux utilisateurs avec le rôle `AdminSEBN`. La page MUST afficher un tableau des comptes avec actions Créer, Modifier, Désactiver.

#### Scenario: Navigation vers la page Gestion des comptes
- **WHEN** un Admin navigue vers `/comptes`
- **THEN** la page affiche un tableau avec les colonnes Email, Rôle, Statut, Créé le, Créé par

#### Scenario: Non-admin tente d'accéder à /comptes
- **WHEN** un utilisateur Gestionnaire ou Prestataire navigue vers `/comptes`
- **THEN** il est redirigé vers `/dashboard` (PrivateRoute avec vérification de rôle)

### Requirement: Audit trail des actions sur les comptes
Le système SHALL enregistrer chaque action d'administration dans la table `UserAuditLog`. Les logs MUST être immuables (pas de modification ni suppression via l'API).

#### Scenario: Consultation des logs par l'Admin
- **WHEN** un Admin ouvre la page Gestion des comptes
- **THEN** un onglet "Historique" affiche les 50 dernières entrées de `UserAuditLog` (ActorEmail, Action, TargetEmail, Timestamp)
