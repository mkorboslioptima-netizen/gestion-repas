## 1. Core — Entités et interfaces

- [x] 1.1 Créer `Cantine.Core/Entities/Site.cs` (`SiteId` string PK, `Nom`, `Actif` bool)
- [x] 1.2 Créer `Cantine.Core/Entities/MorphoConfig.cs` (`SiteId` PK FK → Site, `ConnectionString`, `Query`, `CommandTimeout` int)
- [x] 1.3 Ajouter `SiteId` string sur `Employee.cs` (partie de la PK composite avec `Matricule`)
- [x] 1.4 Ajouter `SiteId` string FK → Site sur `Lecteur.cs`
- [x] 1.5 Ajouter `SiteId` string FK → Site sur `MealLog.cs`
- [x] 1.6 Créer `Cantine.Core/Interfaces/ISiteContext.cs` (propriété `string? SiteId`)
- [x] 1.7 Créer `Cantine.Core/DTOs/SiteDto.cs` (`SiteId`, `Nom`, `Actif`)
- [x] 1.8 Créer `Cantine.Core/DTOs/MorphoConfigDto.cs` (`SiteId`, `ConnectionString`, `Query`, `CommandTimeout`)

## 2. Infrastructure — Configuration EF Core et migration

- [x] 2.1 Créer `Cantine.Infrastructure/Data/Configurations/SiteConfiguration.cs` (PK, MaxLength, seed SEBN-TN01 et SEBN-TN02)
- [x] 2.2 Créer `Cantine.Infrastructure/Data/Configurations/MorphoConfigConfiguration.cs` (PK, FK → Site, MaxLength ConnectionString/Query)
- [x] 2.3 Mettre à jour `EmployeeConfiguration.cs` : PK composite `(SiteId, Matricule)`, FK SiteId → Sites
- [x] 2.4 Mettre à jour `LecteurConfiguration.cs` : ajouter FK `SiteId` → Sites
- [x] 2.5 Mettre à jour `MealLogConfiguration.cs` : ajouter `SiteId`, FK composite vers Employee `(SiteId, Matricule)`
- [x] 2.6 Mettre à jour `CantineDbContext.cs` : ajouter `DbSet<Site>` et `DbSet<MorphoConfig>`
- [x] 2.7 Générer la migration EF Core `AddMultiSiteSupport` et vérifier le SQL généré
- [x] 2.8 Appliquer la migration et vérifier le seed (SEBN-TN01, SEBN-TN02 présents)

## 3. Infrastructure — Repositories mis à jour

- [x] 3.1 Mettre à jour `EmployeeRepository` : filtrer par `SiteId` sur toutes les méthodes (GetByMatricule, etc.)
- [x] 3.2 Mettre à jour `LecteurRepository` : filtrer par `SiteId`
- [x] 3.3 Mettre à jour `MealLogRepository` : filtrer par `SiteId`
- [x] 3.4 Mettre à jour `MealEligibilityService` : propager `SiteId` dans les vérifications de quota

## 4. API — SiteContext et SitesController

- [x] 4.1 Créer `Cantine.API/Services/HttpSiteContext.cs` implémentant `ISiteContext` : lit le claim `siteId` du JWT (null = AdminSEBN global)
- [x] 4.2 Enregistrer `ISiteContext` → `HttpSiteContext` (Scoped) dans `Program.cs`
- [x] 4.3 Créer `Cantine.API/Controllers/SitesController.cs` avec `[Authorize(Roles = "AdminSEBN")]`
- [x] 4.4 Ajouter `GET /api/sites` → liste tous les sites (SiteDto)
- [x] 4.5 Ajouter `GET /api/sites/{siteId}/morpho-config` → retourne MorphoConfigDto ou 404
- [x] 4.6 Ajouter `PUT /api/sites/{siteId}/morpho-config` → crée ou met à jour la config MorphoManager

## 5. Frontend React — Sélecteur de site et adaptation des pages

- [x] 5.1 Créer `cantine-web/src/api/sites.ts` : `getSites()` et `getMorphoConfig(siteId)`, `updateMorphoConfig(siteId, data)`
- [x] 5.2 Créer `cantine-web/src/context/SiteContext.tsx` : contexte React qui stocke le `siteId` sélectionné (AdminSEBN peut switcher, les autres ont un site fixe issu du JWT)
- [x] 5.3 Ajouter un sélecteur de site dans la Sider de `App.tsx` (visible uniquement si AdminSEBN et au moins 2 sites)
- [x] 5.4 Créer `cantine-web/src/pages/admin/SitesPage.tsx` : liste des sites + configuration MorphoManager par site (accès AdminSEBN)
- [x] 5.5 Ajouter la route `/admin/sites` dans `App.tsx` protégée par `PrivateRoute` rôle `AdminSEBN`
- [x] 5.6 Ajouter le lien "Sites" dans le menu de navigation (visible AdminSEBN uniquement)

## 6. Vérification manuelle

- [ ] 6.1 Vérifier que la migration s'applique proprement et que les sites SEBN-TN01 / SEBN-TN02 sont seedés
- [ ] 6.2 Vérifier que `GET /api/sites` retourne 403 sans token AdminSEBN
- [ ] 6.3 Vérifier que `GET /api/sites` retourne les deux sites avec un token AdminSEBN valide
- [ ] 6.4 Vérifier qu'un token avec `siteId: "SEBN-TN01"` ne retourne que les données TN01
- [ ] 6.5 Vérifier que l'UI affiche le sélecteur de site pour AdminSEBN et le menu Sites

