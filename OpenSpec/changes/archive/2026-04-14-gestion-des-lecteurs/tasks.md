## 1. Couche Core — Entité et Interfaces

- [x] 1.1 Créer `Cantine.Core/Entities/Lecteur.cs` (Id, Nom, AdresseIP, Actif)
- [x] 1.2 Créer `Cantine.Core/Interfaces/ILecteurRepository.cs` (GetAllAsync, GetByIdAsync, GetByIpAsync, AddAsync, UpdateAsync, DeleteAsync)
- [x] 1.3 Créer `Cantine.Core/Interfaces/ILecteurService.cs` (même contrat + méthodes métier)
- [x] 1.4 Créer `Cantine.Core/DTOs/LecteurDto.cs` et `CreateLecteurDto.cs` / `UpdateLecteurDto.cs`

## 2. Couche Infrastructure — EF Core et Repository

- [x] 2.1 Créer `Cantine.Infrastructure/Data/Configurations/LecteurConfiguration.cs` (Fluent API : PK, unicité AdresseIP, longueurs)
- [x] 2.2 Ajouter `DbSet<Lecteur>` dans `CantineDbContext` et appliquer la configuration
- [x] 2.3 Générer la migration EF Core `AddLecteursTable` (`dotnet ef migrations add AddLecteursTable`)
- [x] 2.4 Implémenter `Cantine.Infrastructure/Repositories/LecteurRepository.cs`

## 3. Couche API — Service et Controller

- [x] 3.1 Implémenter `Cantine.API/Services/LecteurService.cs` avec validation d'unicité IP et règle de suppression
- [x] 3.2 Créer `Cantine.API/Controllers/LecteursController.cs` (GET, POST, PUT, DELETE) avec `[Authorize(Roles = "AdminSEBN")]`
- [x] 3.3 Enregistrer `ILecteurRepository`, `ILecteurService` et `LecteurRepository` dans `Program.cs`
- [x] 3.4 Vérifier que les endpoints retournent les codes HTTP corrects (200, 201, 204, 400, 403, 404, 409)

## 4. Frontend React — Page et Composants

- [x] 4.1 Créer `src/api/lecteurs.ts` avec les fonctions `fetchLecteurs`, `createLecteur`, `updateLecteur`, `deleteLecteur` via `axios.ts`
- [x] 4.2 Créer `src/pages/admin/LecteursPage.tsx` avec le tableau Ant Design (`Table`) et `useQuery` TanStack Query
- [x] 4.3 Ajouter le composant modal `LecteurFormModal.tsx` (formulaire Ajout/Édition avec validation IP regex)
- [x] 4.4 Brancher les mutations `useMutation` pour Créer, Modifier, Supprimer avec invalidation du cache
- [x] 4.5 Ajouter la route `/admin/lecteurs` dans le router et l'entrée de menu dans la navigation (visible `AdminSEBN` uniquement)

## 5. Validation et Tests Manuels

- [x] 5.1 Appliquer la migration et vérifier la création de la table `Lecteurs` en base
- [x] 5.2 Tester les endpoints API avec un outil REST (ajout, doublon IP → 409, suppression, modification)
- [x] 5.3 Vérifier l'affichage, l'ajout, la modification et la désactivation d'un lecteur depuis l'interface web
- [ ] 5.4 Vérifier le comportement du service TCP : trame depuis une IP enregistrée (acceptée) vs IP inconnue (ignorée + log)
