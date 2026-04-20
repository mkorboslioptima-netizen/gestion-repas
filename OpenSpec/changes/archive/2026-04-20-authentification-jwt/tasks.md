## 1. Backend — Entité AppUser et migration

- [x] 1.1 Ajouter le package `BCrypt.Net-Next` dans `Cantine.Infrastructure/Cantine.Infrastructure.csproj`
- [x] 1.2 Créer `Cantine.Core/Entities/AppUser.cs` (`Id`, `Email`, `PasswordHash`, `Nom`, `Role`, `SiteId?`)
- [x] 1.3 Créer `Cantine.Infrastructure/Data/Configurations/AppUserConfiguration.cs` (index unique sur Email)
- [x] 1.4 Ajouter `DbSet<AppUser> AppUsers` dans `CantineDbContext` + `ApplyConfiguration`
- [x] 1.5 Ajouter le seed dans `AppUserConfiguration` : 2 comptes par défaut avec hash BCrypt pré-calculé
- [x] 1.6 Générer la migration EF Core `AddAppUsers` et l'appliquer

## 2. Backend — Service et controller d'authentification

- [x] 2.1 Créer `Cantine.Core/DTOs/LoginDto.cs` (`Email`, `Password`) et `LoginResultDto` (`Token`, `Nom`, `Role`, `SiteId?`)
- [x] 2.2 Créer `Cantine.Core/Interfaces/IAuthService.cs` avec `LoginAsync(LoginDto) : Task<LoginResultDto?>`
- [x] 2.3 Créer `Cantine.Infrastructure/Services/AuthService.cs` : vérifie email + BCrypt, génère le JWT avec les claims
- [x] 2.4 Créer `Cantine.API/Controllers/AuthController.cs` avec `POST /api/auth/login` et `GET /api/auth/me`
- [x] 2.5 Enregistrer `IAuthService → AuthService` (Scoped) dans `Cantine.API/Program.cs`

## 3. Backend — Suppression du DevBypass

- [x] 3.1 Supprimer le middleware `DevBypass` de `Cantine.API/Program.cs`

## 4. Frontend — AuthContext amélioré

- [x] 4.1 Mettre à jour `AuthContext.tsx` : décoder le payload JWT base64 au login pour extraire `role` et `siteId` et les stocker dans le state
- [x] 4.2 Exposer `siteId` depuis `AuthContext` (en plus de `token` et `roles`)

## 5. Frontend — LoginPage fonctionnelle

- [x] 5.1 Mettre à jour `LoginPage.tsx` : appeler `POST /api/auth/login` via axios au clic "Se connecter"
- [x] 5.2 Afficher le message d'erreur API en cas d'échec (401 → "Email ou mot de passe incorrect")
- [x] 5.3 Supprimer les boutons "Connexion rapide dev" (`import.meta.env.DEV`) — ou les remplacer par un pré-remplissage des champs
- [x] 5.4 Créer `cantine-web/src/api/auth.ts` avec la fonction `login(email, password)` via axios

## 6. Frontend — Rétablissement de la sécurité

- [x] 6.1 Rétablir `isAdmin = roles.includes('AdminSEBN')` dans la sidebar (`App.tsx`) — supprimer `isAdmin = true`
- [x] 6.2 Rétablir les `PrivateRoute` sur `/admin/employes` et `/admin/sites` dans `App.tsx`
- [x] 6.3 Ajouter une redirection `/login` si non authentifié dans `App.tsx` (guard global)

## 7. Vérification

- [x] 7.1 Vérifier que `POST /api/auth/login` retourne un JWT valide pour `admin@sebn.tn` / `Admin123!`
- [x] 7.2 Vérifier que `POST /api/auth/login` retourne 401 pour des credentials invalides
- [x] 7.3 Vérifier que les routes `/admin/employes` retournent 401 sans token et 403 pour `ResponsableCantine`
- [x] 7.4 Vérifier que la page Login se connecte et redirige vers le dashboard
- [x] 7.5 Vérifier que le nom et rôle s'affichent correctement dans la sidebar après connexion
