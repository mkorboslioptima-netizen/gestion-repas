## ADDED Requirements

### Requirement: Endpoint de login
Le système SHALL exposer `POST /api/auth/login` acceptant `{ email, password }` et retournant `{ token, nom, role, siteId? }`. Le token SHALL être un JWT signé HS256, valide 8 heures, contenant les claims `sub` (email), `name` (nom), `role` (rôle), `siteId` (nullable), `iss`, `aud`.

#### Scenario: Login réussi avec credentials valides
- **WHEN** `POST /api/auth/login` est appelé avec email et password corrects
- **THEN** le système retourne HTTP 200 avec un JWT valide et les informations utilisateur

#### Scenario: Login échoué avec credentials invalides
- **WHEN** `POST /api/auth/login` est appelé avec email inconnu ou mot de passe incorrect
- **THEN** le système retourne HTTP 401 avec message `"Email ou mot de passe incorrect"`

#### Scenario: Champs manquants
- **WHEN** `POST /api/auth/login` est appelé sans email ou sans password
- **THEN** le système retourne HTTP 400

### Requirement: Endpoint profil utilisateur
Le système SHALL exposer `GET /api/auth/me` retournant `{ nom, email, role, siteId? }` pour l'utilisateur authentifié par JWT.

#### Scenario: Profil retourné pour token valide
- **WHEN** `GET /api/auth/me` est appelé avec un JWT valide
- **THEN** le système retourne HTTP 200 avec le profil de l'utilisateur

#### Scenario: Accès refusé sans token
- **WHEN** `GET /api/auth/me` est appelé sans Authorization header
- **THEN** le système retourne HTTP 401

### Requirement: Page de connexion fonctionnelle
L'UI SHALL appeler réellement `POST /api/auth/login` au clic "Se connecter". En cas de succès, le JWT SHALL être stocké dans `localStorage` et l'utilisateur redirigé vers `/`. En cas d'échec, un message d'erreur SHALL être affiché.

#### Scenario: Connexion réussie depuis l'UI
- **WHEN** l'utilisateur saisit un email/mot de passe valides et clique "Se connecter"
- **THEN** il est redirigé vers le dashboard avec le bon rôle affiché dans la sidebar

#### Scenario: Message d'erreur sur credentials invalides
- **WHEN** l'utilisateur saisit des credentials incorrects
- **THEN** un message d'erreur "Email ou mot de passe incorrect" s'affiche sous le formulaire

### Requirement: Protection des routes par rôle
Les routes `/admin/employes` et `/admin/sites` SHALL être accessibles uniquement aux utilisateurs avec le rôle `AdminSEBN`. Un utilisateur `ResponsableCantine` SHALL voir uniquement le Dashboard.

#### Scenario: Redirection non authentifié
- **WHEN** un utilisateur non connecté accède à `/admin/employes`
- **THEN** il est redirigé vers `/login`

#### Scenario: Redirection rôle insuffisant
- **WHEN** un utilisateur `ResponsableCantine` accède à `/admin/employes`
- **THEN** il est redirigé vers `/unauthorized`
