## Context

L'application dispose d'une authentification JWT fonctionnelle avec deux rôles (`AdminSEBN`, `ResponsableCantine`). Les rôles sont encodés dans le token et lus par `AuthContext` côté React. Côté API, les policies `[Authorize(Roles = "AdminSEBN")]` existent déjà sur certains endpoints.

Il faut ajouter un troisième rôle (`Prestataire`), une interface de gestion des comptes, et une protection UI systématique basée sur le rôle décodé depuis le JWT.

## Goals / Non-Goals

**Goals:**
- Trois rôles distincts avec périmètres définis : Admin, Gestionnaire (`ResponsableCantine`), Prestataire
- Page de gestion des comptes (Admin uniquement) avec audit trail
- Masquage/désactivation des éléments UI non autorisés selon le rôle
- Traçabilité des créations et modifications de comptes

**Non-Goals:**
- SSO / intégration Active Directory (Phase 2)
- Authentification multi-facteur
- Granularité fine des permissions (permissions individuelles) — on reste sur des rôles coarses

## Decisions

### D1 — Rôles exprimés comme chaînes dans le claim JWT `role`

Valeurs : `"AdminSEBN"` | `"ResponsableCantine"` | `"Prestataire"`. Compatibilité ascendante avec les tokens existants — seul `Prestataire` est nouveau.

> Alternatif écarté : enum entier dans le claim — moins lisible dans les logs et les policies ASP.NET Core.

### D2 — Gestion des comptes via `ApplicationUser` dans la BDD (pas dans un fichier config)

Entité `AppUser { Id, Email, PasswordHash (BCrypt), Role, IsActive, CreatedAt, CreatedBy }`. Migration EF Core dédiée `AddAppUserAndAuditLog`.

> Alternatif écarté : stocker les comptes dans `appsettings.json` — pas scalable, pas auditable.

### D3 — Hook `useRole()` + composant `<RoleGate>` côté React

`useRole()` lit le claim `role` du JWT stocké dans `AuthContext`. `<RoleGate allowed={["AdminSEBN"]}>` rend ses enfants visible seulement si le rôle correspond, sinon `null` (invisible) — jamais une erreur de navigation.

> Alternatif écarté : dupliquer la logique de rôle dans chaque composant — pas maintenable.

### D4 — Endpoints de gestion des comptes protégés par policy `AdminOnly`

`POST /api/auth/users` (créer), `PUT /api/auth/users/{id}` (modifier rôle/statut), `GET /api/auth/users` (lister). Aucune de ces routes n'est accessible au Gestionnaire ou Prestataire — vérification côté API, pas uniquement côté UI.

### D5 — Audit log minimal dans `UserAuditLog`

Colonnes : `Id, ActorId, Action (Created|RoleChanged|Deactivated|PasswordReset), TargetUserId, Timestamp, Details (JSON)`. Lecture seule — pas de DELETE sur les logs.

## Risks / Trade-offs

- **[Risque] Migration `AppUser` en base existante** → La table `AspNetUsers` d'Identity n'est pas utilisée ; on crée une table `AppUsers` indépendante pour éviter de coupler au framework Identity. La migration est additive (aucune table existante modifiée).
- **[Risque] Token JWT existant sans claim `role` correct** → Au login, si l'utilisateur n'a pas de rôle en BDD, retourner 401 avec message explicite. Prévoir un seed Admin initial dans la migration.
- **[Trade-off] `<RoleGate>` masque mais ne protège pas** → La protection réelle est côté API. Le masquage UI est UX only ; il ne remplace pas les guards API.

## Migration Plan

1. Créer migration EF Core `AddAppUserAndAuditLog` — tables `AppUsers` + `UserAuditLog`
2. Ajouter seed : un compte Admin par défaut (`admin@sebn.tn` / mot de passe temporaire dans `appsettings.Development.json`)
3. Mettre à jour `AuthService.Login()` pour lire depuis `AppUsers` et émettre le claim `role`
4. Déployer API (zero downtime — ajout de tables uniquement)
5. Déployer Frontend avec `RoleGate` actif

## Open Questions

- Quel est le mot de passe Admin initial à définir pour la mise en production ? (à confirmer avec SEBN avant déploiement)
- Le Prestataire a-t-il accès aux données multi-sites ou uniquement à son site attribué ? (hypothèse : site unique, à confirmer)
