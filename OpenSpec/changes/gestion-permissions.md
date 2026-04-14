# OpenSpec — gestion-permissions

**Statut :** 📝 En attente de validation
**Phase :** Phase 1 — MVP
**Créé le :** 2026-04-14

---

## 🎯 Objectif

Mettre en place le système d'authentification et de gestion des rôles pour le projet Cantine SEBN.
Deux profils d'accès distincts : `AdminSEBN` (accès total) et `ResponsableCantine` (lecture + export).

---

## 📋 Fonctionnalités à implémenter

### 1. Modèle utilisateur (`Cantine.Core`)
- Entité `ApplicationUser` héritant de `IdentityUser`
- Propriétés supplémentaires : `FullName`, `CreatedAt`
- Rôles fixes : `AdminSEBN`, `ResponsableCantine`

### 2. Auth JWT (`Cantine.Infrastructure` + `Cantine.API`)
- Login via `POST /api/auth/login` → retourne JWT
- Token compatible avec le projet Node.js existant (même secret, même claims)
- Claims inclus : `sub` (userId), `role`, `name`
- Expiration : 8h (durée d'un shift)
- Logout via `POST /api/auth/logout` (blacklist token en mémoire)
- `GET /api/auth/me` → retourne l'utilisateur courant

### 3. Middleware et guards
- `[Authorize(Roles = "AdminSEBN")]` sur tous les endpoints d'administration
- `[Authorize(Roles = "AdminSEBN,ResponsableCantine")]` sur dashboard et export
- Réponse `403 Forbidden` avec message clair si rôle insuffisant

### 4. Frontend React (`cantine-web`)
- Page `/login` avec formulaire Ant Design
- `AuthContext` + `useAuth()` hook
- `PrivateRoute` avec redirection vers `/login` si non authentifié
- Stockage du token : `localStorage` (clé : `cantine_token`)
- Affichage du nom et rôle dans le header

---

## 📁 Fichiers à créer / modifier

### Cantine.Core
```
Cantine.Core/
├── Entities/
│   └── ApplicationUser.cs
└── Interfaces/
    └── IAuthService.cs
```

### Cantine.Infrastructure
```
Cantine.Infrastructure/
├── Data/
│   └── CantineDbContext.cs          # Ajout IdentityDbContext
└── Services/
    └── AuthService.cs
```

### Cantine.API
```
Cantine.API/
├── Controllers/
│   └── AuthController.cs
└── Program.cs                       # Configuration Identity + JWT
```

### cantine-web
```
cantine-web/src/
├── auth/
│   ├── AuthContext.tsx
│   ├── useAuth.ts
│   └── PrivateRoute.tsx
├── pages/
│   └── Login.tsx
└── api/
    └── axios.ts                     # Interceptor JWT
```

---

## 🔒 Règles métier

1. Un `AdminSEBN` peut créer/modifier/supprimer des utilisateurs
2. Un `ResponsableCantine` peut uniquement consulter le dashboard et exporter
3. Le token JWT est identique (même secret) entre ce projet et le projet Node.js existant
4. Jamais de token dans les logs applicatifs
5. À la déconnexion : suppression du token localStorage + blacklist serveur

---

## ✅ Critères de validation (tests Playwright)

```bash
npx playwright test tests/e2e/permissions.spec.ts
```

- [ ] Login avec credentials valides → redirection vers dashboard
- [ ] Login avec credentials invalides → message d'erreur
- [ ] Accès `/admin` sans token → redirection `/login`
- [ ] Token `ResponsableCantine` sur endpoint admin → `403`
- [ ] Logout → token supprimé, redirection `/login`

---

## ⚠️ Points en attente avant apply

- [ ] **Secret JWT** du projet Node.js existant (valeur exacte)
- [ ] **Credentials admin initial** pour le premier démarrage
