## ADDED Requirements

### Requirement: Page de connexion fonctionnelle
L'application SHALL afficher une page de connexion sur la route `/login` avec : logo MealOps, champs email et mot de passe, bouton "Se connecter". En mode Development, des boutons de connexion rapide par rôle (`AdminSEBN`, `ResponsableCantine`) SHALL injecter directement le token dev sans appel API.

#### Scenario: Connexion rapide en dev
- **WHEN** l'utilisateur clique "AdminSEBN (Dev)" sur la page login
- **THEN** le token dev est injecté dans `AuthContext`, l'utilisateur est redirigé vers `/`

#### Scenario: Redirection si non authentifié
- **WHEN** un utilisateur non authentifié accède à une route protégée
- **THEN** il est redirigé vers `/login`
