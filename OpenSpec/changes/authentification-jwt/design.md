## Context

L'API utilise déjà `Microsoft.AspNetCore.Authentication.JwtBearer` et `Microsoft.IdentityModel.Tokens` (configurés dans `Program.cs`). Le secret JWT est dans `appsettings.json` (`Jwt:Secret`, `Jwt:Issuer`, `Jwt:Audience`). Le frontend lit `token` et `roles` depuis `localStorage` via `AuthContext`. La config JWT est déjà correcte côté validation — il manque uniquement le mécanisme d'émission et la table `AppUsers`.

## Goals / Non-Goals

**Goals:**
- Table `AppUsers` (Email, PasswordHash BCrypt, Nom, Role, SiteId optionnel)
- `POST /api/auth/login` → JWT 8h avec claims : `sub`, `name`, `role`, `siteId`
- `GET /api/auth/me` → profil de l'utilisateur (nom, email, rôle, siteId)
- Frontend : `LoginPage` appelle l'API, `AuthContext` décode le JWT pour extraire le rôle
- Seed : 2 comptes par défaut (`admin@sebn.tn` / `Admin123!` → AdminSEBN, `responsable@sebn.tn` / `Admin123!` → ResponsableCantine)
- Suppression du DevBypass et rétablissement des `PrivateRoute`

**Non-Goals:**
- Refresh token (Phase 2)
- Réinitialisation de mot de passe par email
- OAuth / SSO
- Gestion des utilisateurs depuis l'UI (CRUD complet — Phase 2)

## Decisions

### 1. BCrypt via `BCrypt.Net-Next` NuGet
**Choix :** Package `BCrypt.Net-Next` pour le hachage des mots de passe.
**Pourquoi :** Simple, sécurisé, pas de dépendance à `Microsoft.AspNetCore.Identity` entière (qui apporterait une complexité inutile). `BCrypt.Net.BCrypt.HashPassword()` / `Verify()`.

### 2. Claims JWT : `role` + claim Microsoft pour compatibilité `[Authorize(Roles)]`
**Choix :** Émettre les deux claims : `ClaimTypes.Role` (URI Microsoft) ET `"role"` (court).
**Pourquoi :** ASP.NET Core `[Authorize(Roles = "AdminSEBN")]` utilise `ClaimTypes.Role`. Le frontend lit le claim court `"role"` depuis le JWT décodé en base64.

### 3. `AuthContext` décode le JWT localement (sans appel API)
**Choix :** `AuthContext` décode le payload JWT base64 au login pour extraire `role` et `siteId` — pas d'appel `/api/auth/me` au chargement.
**Pourquoi :** Évite une requête réseau à chaque refresh de page. `GET /api/auth/me` reste disponible pour les composants qui en ont besoin.

### 4. Seed en `HasData()` EF Core
**Choix :** Les 2 comptes par défaut sont injectés via `modelBuilder.Entity<AppUser>().HasData(...)` avec le hash BCrypt pré-calculé.
**Pourquoi :** Simple, reproductible, pas de logique conditionnelle dans `Program.cs`.

### 5. `SiteId` nullable sur `AppUser`
**Choix :** `SiteId` est nullable. `AdminSEBN` a `SiteId = null` (accès tous sites). `ResponsableCantine` a `SiteId = "SEBN-TN01"`.
**Pourquoi :** Cohérent avec `ISiteContext` et `SiteContext` frontend qui gèrent déjà ce cas.

## Risks / Trade-offs

- **`Jwt:Secret` faible** → Le secret actuel `CHANGE_ME_SECRET_KEY_32_CHARS_MIN` doit être changé avant déploiement. Commentaire `// IMPORTANT` dans `appsettings.json`.
- **Expiration 8h** → Token invalidé si le serveur redémarre (pas de blacklist). Acceptable Phase 1.
- **Seed hardcodé** → Les mots de passe du seed sont en clair dans le code source (hashés avant push). À noter dans la doc.

## Migration Plan

1. Ajouter le package `BCrypt.Net-Next`
2. Créer entité `AppUser` + configuration EF Core + seed
3. Générer et appliquer la migration `AddAppUsers`
4. Créer `IAuthService` + `AuthService` + `AuthController`
5. Supprimer le DevBypass dans `Program.cs`
6. Mettre à jour `LoginPage.tsx` pour appeler l'API
7. Mettre à jour `AuthContext` pour décoder le JWT et extraire rôle/siteId
8. Rétablir `PrivateRoute` et `isAdmin` dynamique dans la sidebar
