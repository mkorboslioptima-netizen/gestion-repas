## Why

L'application fonctionne actuellement avec un bypass d'authentification en développement (`isAdmin = true`, middleware DevBypass dans l'API). Avant toute mise en production, il faut un vrai système d'authentification JWT : des comptes utilisateurs en base, un endpoint de login, des tokens signés avec expiration, et le rétablissement des `[Authorize]` bloquants côté API et `PrivateRoute` côté frontend.

## What Changes

- Nouvelle table `AppUsers` (Id, Email, PasswordHash, Nom, Role, SiteId?) avec migration EF Core
- Endpoint `POST /api/auth/login` retournant un JWT signé avec rôle et expiration 8h
- Endpoint `GET /api/auth/me` retournant le profil de l'utilisateur connecté
- Suppression du middleware `DevBypass` dans `Cantine.API/Program.cs`
- Suppression de `isAdmin = true` dans la sidebar (`App.tsx`) — remplacement par le vrai rôle
- `LoginPage.tsx` appelle réellement `POST /api/auth/login` (plus de token hardcodé)
- Rétablissement des `PrivateRoute` sur les routes protégées
- Seed de données : 2 comptes par défaut (AdminSEBN + ResponsableCantine) pour les tests

## Capabilities

### New Capabilities

- `user-auth` : Authentification JWT — login, token signé, profil utilisateur, logout

### Modified Capabilities

*(aucun changement de comportement métier — seule la sécurité est renforcée)*

## Impact

- **Backend :** Nouvelle entité `AppUser`, `AuthController`, `IAuthService`, migration `AddAppUsers`
- **Frontend :** `LoginPage.tsx` fonctionnelle, suppression bypass, `PrivateRoute` rétabli, `AuthContext` lit le rôle depuis le JWT
- **Sécurité :** `DevBypass` middleware retiré, `Jwt:Secret` doit être changé avant déploiement
- **Aucune dépendance externe ajoutée** — BCrypt via `Microsoft.AspNetCore.Identity.Core` (déjà disponible dans .NET 8)
