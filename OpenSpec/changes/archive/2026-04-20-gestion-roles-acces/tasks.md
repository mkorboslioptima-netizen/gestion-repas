## 1. Migration base de données

- [x] 1.1 Créer la migration EF Core `AddAppUserAndAuditLog` — tables `AppUsers (Id, Email, PasswordHash, Role, IsActive, CreatedAt, CreatedBy)` et `UserAuditLog (Id, ActorId, Action, TargetUserId, Timestamp, Details)`
- [x] 1.2 Ajouter un seed de données dans la migration : compte Admin par défaut `admin@sebn.tn` avec mot de passe haché BCrypt défini dans `appsettings.Development.json`
- [x] 1.3 Appliquer la migration et vérifier les tables dans SQL Server (à exécuter manuellement : `dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API`)

## 2. Backend — Core & Infrastructure

- [x] 2.1 Créer les entités `Cantine.Core` : `AppUser` et `UserAuditLog` + enum `UserRole { AdminSEBN, ResponsableCantine, Prestataire }`
- [x] 2.2 Créer `IUserService` dans `Cantine.Core/Interfaces/` — méthodes : `GetAll`, `Create`, `UpdateRoleOrStatus`, `ResetPassword`, `GetAuditLog`
- [x] 2.3 Implémenter `UserService` dans `Cantine.Infrastructure/Services/` avec BCrypt pour le hachage des mots de passe
- [x] 2.4 Mettre à jour `AuthService.Login()` pour lire depuis `AppUsers`, vérifier `IsActive`, et émettre le claim `role` dans le JWT

## 3. Backend — Endpoints API Gestion des comptes

- [x] 3.1 Créer `UsersController` avec `GET /api/auth/users` — protégé `[Authorize(Roles = "AdminSEBN")]`
- [x] 3.2 Ajouter `POST /api/auth/users` — création de compte avec validation email unique et rôle valide
- [x] 3.3 Ajouter `PUT /api/auth/users/{id}` — modification rôle/statut avec protection auto-désactivation
- [x] 3.4 Ajouter `POST /api/auth/users/{id}/reset-password`
- [x] 3.5 Ajouter `GET /api/auth/users/audit-log` (50 dernières entrées) — protégé Admin uniquement

## 4. Backend — Endpoint récapitulatif Prestataire

- [x] 4.1 Créer `RapportsController` avec `GET /api/rapports/prestataire/mensuel?annee={y}&mois={m}` — accessible aux rôles `AdminSEBN` et `Prestataire`
- [x] 4.2 Implémenter la requête EF Core qui agrège les passages journaliers (plats chauds, sandwichs, total) pour le mois demandé

## 5. Frontend — Hook et composant de contrôle d'accès

- [x] 5.1 Créer `cantine-web/src/auth/useRole.ts` — hook retournant le claim `role` du JWT via `AuthContext`
- [x] 5.2 Créer `cantine-web/src/components/RoleGate.tsx` — composant `<RoleGate allowed={string[]}>` rendant ses enfants ou `null`
- [x] 5.3 Créer `RolePrivateRoute` (extension de `PrivateRoute`) qui redirige vers `/dashboard` si le rôle n'est pas autorisé

## 6. Frontend — Sidebar dynamique

- [x] 6.1 Mettre à jour la sidebar dans `App.tsx` pour utiliser `useRole()` et `<RoleGate>` sur chaque entrée de navigation selon la matrice de rôles (Admin : tout, Gestionnaire : Dashboard+Employés, Prestataire : Dashboard uniquement)
- [x] 6.2 Ajouter l'entrée "Gestion des comptes" dans la sidebar, visible uniquement pour `AdminSEBN`

## 7. Frontend — Page Gestion des comptes

- [x] 7.1 Créer `cantine-web/src/pages/GestionComptesPage.tsx` avec tableau des comptes (Email, Rôle, Statut, Créé le, Créé par) et onglet "Historique"
- [x] 7.2 Ajouter le modal de création de compte (champs : email, mot de passe, rôle) avec appel `POST /api/auth/users`
- [x] 7.3 Ajouter les actions dans le tableau : modifier le rôle (select inline), désactiver/réactiver (toggle), réinitialiser le mot de passe (modal)
- [x] 7.4 Ajouter la route `/comptes` dans `App.tsx` protégée par `RolePrivateRoute allowed={["AdminSEBN"]}`

## 8. Frontend — Dashboard Prestataire

- [x] 8.1 Masquer tous les boutons d'action (Supprimer, Modifier, Paramètres) sur le dashboard pour le rôle `Prestataire` via `<RoleGate>`
- [x] 8.2 Ajouter le bouton "Télécharger récapitulatif — [Mois courant]" sur le dashboard, visible uniquement pour `Prestataire` et `AdminSEBN`
- [x] 8.3 Implémenter le téléchargement Excel en appelant `GET /api/rapports/prestataire/mensuel` et déclenchant un `blob` download

## 9. Vérification & tests

- [ ] 9.1 Vérifier que le login Admin redirige vers le dashboard avec toutes les sections visibles
- [ ] 9.2 Vérifier que le login Gestionnaire masque Lecteurs, Sites, Gestion des comptes
- [ ] 9.3 Vérifier que le login Prestataire n'affiche que le dashboard sans boutons d'action
- [ ] 9.4 Vérifier que la page `/comptes` redirige les non-Admin
- [ ] 9.5 Vérifier que la création d'un compte Admin enregistre un log dans `UserAuditLog`
- [ ] 9.6 Vérifier que le téléchargement récapitulatif génère un fichier Excel valide
