## ADDED Requirements

### Requirement: Hook useRole expose le rôle courant
L'interface React SHALL fournir un hook `useRole()` retournant le rôle extrait du JWT stocké dans `AuthContext`. Le hook MUST retourner `null` si aucun token valide n'est présent.

#### Scenario: Utilisateur connecté en tant qu'Admin
- **WHEN** `useRole()` est appelé avec un token JWT valide contenant `role: "AdminSEBN"`
- **THEN** le hook retourne `"AdminSEBN"`

#### Scenario: Aucun token présent
- **WHEN** `useRole()` est appelé sans token (utilisateur non connecté)
- **THEN** le hook retourne `null`

### Requirement: Composant RoleGate masque le contenu non autorisé
L'interface React SHALL fournir un composant `<RoleGate allowed={string[]}>` qui rend ses enfants uniquement si le rôle courant est inclus dans `allowed`. Si le rôle n'est pas autorisé, le composant SHALL rendre `null` (invisible, sans message d'erreur).

#### Scenario: Admin voit un bouton protégé par RoleGate
- **WHEN** un Admin est connecté et qu'un `<RoleGate allowed={["AdminSEBN"]}>` entoure un bouton
- **THEN** le bouton est visible et cliquable

#### Scenario: Gestionnaire ne voit pas un bouton Admin
- **WHEN** un Gestionnaire est connecté et qu'un `<RoleGate allowed={["AdminSEBN"]}>` entoure un bouton
- **THEN** le bouton est absent du DOM (null rendu)

### Requirement: Sidebar dynamique selon le rôle
La sidebar SHALL afficher uniquement les entrées de navigation autorisées pour le rôle connecté. Les entrées non autorisées MUST être absentes du DOM (pas simplement grisées).

#### Scenario: Sidebar Admin
- **WHEN** un Admin est connecté
- **THEN** la sidebar affiche toutes les sections : Dashboard, Lecteurs, Employés, Sites, Gestion des comptes

#### Scenario: Sidebar Gestionnaire
- **WHEN** un Gestionnaire (`ResponsableCantine`) est connecté
- **THEN** la sidebar affiche : Dashboard, Employés — et MUST masquer : Lecteurs, Sites, Gestion des comptes

#### Scenario: Sidebar Prestataire
- **WHEN** un Prestataire est connecté
- **THEN** la sidebar affiche uniquement : Dashboard (lecture seule)

### Requirement: Route /comptes protégée par rôle
La route `/comptes` SHALL être accessible uniquement aux utilisateurs avec le rôle `AdminSEBN`. Toute tentative d'accès direct par URL SHALL rediriger vers `/dashboard`.

#### Scenario: Redirection d'un non-Admin
- **WHEN** un utilisateur avec le rôle `Prestataire` ou `ResponsableCantine` accède directement à `/comptes` via l'URL
- **THEN** il est redirigé automatiquement vers `/dashboard`

### Requirement: Boutons d'action conditionnels dans les pages
Les boutons d'action destructive (Supprimer un employé, Modifier un lecteur, Modifier un site) SHALL être enveloppés dans `<RoleGate>` et MUST être invisibles pour les rôles non autorisés.

#### Scenario: Prestataire ne voit pas de boutons de modification
- **WHEN** un Prestataire navigue vers le dashboard
- **THEN** aucun bouton "Supprimer", "Modifier" ou "Paramètres" n'est visible dans l'interface
