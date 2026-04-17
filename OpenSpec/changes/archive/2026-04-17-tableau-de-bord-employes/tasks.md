## 1. Core — Entité SyncLog

- [x] 1.1 Créer `Cantine.Core/Entities/SyncLog.cs` (`SiteId`, `OccurredAt`, `Source`, `Importes`, `MisAJour`, `Desactives`, `Ignores`)
- [x] 1.2 Créer `Cantine.Core/DTOs/SyncLogDto.cs` (même champs + `NomSite`)
- [x] 1.3 Créer `Cantine.Core/DTOs/EmployeeSiteStatsDto.cs` (`SiteId`, `NomSite`, `TotalActifs`, `DerniereSynchro` : `SyncLogDto?`)
- [x] 1.4 Créer `Cantine.Core/DTOs/EmployeeDto.cs` (`Matricule`, `Nom`, `Prenom`, `Actif`, `MaxMealsPerDay`)

## 2. Infrastructure — Persistance SyncLog

- [x] 2.1 Créer `Cantine.Infrastructure/Data/Configurations/SyncLogConfiguration.cs` (table `SyncLogs`, PK auto-incrémentée, FK sur `Sites`)
- [x] 2.2 Ajouter `DbSet<SyncLog> SyncLogs` dans `CantineDbContext`
- [x] 2.3 Générer la migration EF Core : `dotnet ef migrations add AddSyncLogsTable --project Cantine.Infrastructure --startup-project Cantine.API`
- [x] 2.4 Appliquer la migration : `dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API`
- [x] 2.5 Modifier `MorphoEmployeeImporter.ImportAsync` — ajouter paramètre `string source = "Manual"` et insérer un `SyncLog` dans `SaveChangesAsync`
- [x] 2.6 Modifier `MorphoSyncService.SyncAllSitesAsync` — appeler `ImportAsync(..., source: "Auto")` pour propager la source

## 3. API — Nouveaux endpoints

- [x] 3.1 Ajouter `GET /api/employes?siteId=` dans `EmployesController` — retourne `IEnumerable<EmployeeDto>` filtrés par site
- [x] 3.2 Ajouter `GET /api/employes/stats` dans `EmployesController` — retourne `IEnumerable<EmployeeSiteStatsDto>` (un par site actif)
- [x] 3.3 Ajouter `GET /api/employes/sync-logs/{siteId}` dans `EmployesController` — retourne les 10 derniers `SyncLogDto` du site

## 4. Frontend — API client

- [x] 4.1 Ajouter `getEmployes(siteId: string)` dans `cantine-web/src/api/employes.ts`
- [x] 4.2 Ajouter `getEmployeStats()` dans `cantine-web/src/api/employes.ts`
- [x] 4.3 Ajouter les interfaces TypeScript `EmployeeDto`, `SyncLogDto`, `EmployeeSiteStatsDto`

## 5. Frontend — Page Employés enrichie

- [x] 5.1 Ajouter la section cartes de statistiques en haut de `EmployesPage.tsx` — une `Card` Ant Design par site avec `Statistic` (total actifs) et résumé dernière synchro
- [x] 5.2 Afficher la date de dernière synchro en format relatif (ex : "il y a 2h") via `dayjs`
- [x] 5.3 Afficher le résumé dernière synchro : "+N nouveaux · N mis à jour · N désactivés"
- [x] 5.4 Invalider le cache TanStack Query `["employe-stats"]` après chaque import ou sync réussi (rafraîchissement automatique des cartes)
- [x] 5.5 Ajouter le tableau Ant Design des employés sous les cartes — colonnes : Matricule, Nom, Prénom, Statut, Quota
- [x] 5.6 Le tableau se charge en fonction du site sélectionné dans le `SiteContext` (ou le premier site si null)
- [x] 5.7 Afficher l'état vide Ant Design si aucun employé (`locale={{ emptyText: "Aucun employé importé" }}`)

## 6. Vérification

- [x] 6.1 Vérifier que `GET /api/employes/stats` retourne les bons compteurs après un import
- [x] 6.2 Vérifier que la carte se met à jour après un import depuis l'UI sans rechargement
- [x] 6.3 Vérifier que `GET /api/employes/sync-logs/SEBN-TN01` retourne les SyncLogs avec `Source = "Manual"`
- [x] 6.4 Vérifier que le tableau des employés affiche les données avec tri et pagination fonctionnels
