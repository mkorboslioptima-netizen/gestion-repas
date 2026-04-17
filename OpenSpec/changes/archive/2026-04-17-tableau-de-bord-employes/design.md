## Context

La page Employés est aujourd'hui un formulaire d'action (import / synchro) sans retour visuel sur les données. `MorphoEmployeeImporter` et `MorphoSyncService` retournent un `ImportResultDto` mais ce résultat n'est pas persisté — il est perdu après l'appel HTTP. Il n'existe aucune table d'historique. `CantineDbContext` expose `Sites`, `Employees`, `MorphoConfigs`, `MealLogs`, `Lecteurs`.

## Goals / Non-Goals

**Goals:**
- Persister chaque résultat d'import/synchro dans une table `SyncLogs` (SiteId, date, importés, mis à jour, désactivés, ignorés, source : Manual/Auto)
- Exposer `GET /api/employes?siteId=` pour lister les employés d'un site
- Exposer `GET /api/employes/stats` pour les compteurs par site (total actifs, dernière synchro)
- Enrichir `EmployesPage.tsx` : cartes de stats par site + tableau employés + dernière synchro

**Non-Goals:**
- Pagination serveur des employés (quelques centaines max par site en Phase 1 — pagination client suffisante)
- Filtrage avancé des employés (nom, matricule) — Phase 2
- Suppression manuelle d'un employé depuis l'UI
- Export Excel des employés depuis cette page

## Decisions

### 1. Nouvelle table `SyncLogs` pour l'historique
**Choix :** Entité `SyncLog` avec `(SiteId, Source, OccurredAt, Importes, MisAJour, Desactives, Ignores)`. Source = `"Manual"` ou `"Auto"`.
**Pourquoi :** Permet d'afficher la dernière synchro sans requête agrégée coûteuse. Un seul `ORDER BY OccurredAt DESC LIMIT 1` par site suffit pour les stats.

### 2. Écriture du SyncLog dans `IMorphoEmployeeImporter` et `MorphoSyncService`
**Choix :** `MorphoEmployeeImporter.ImportAsync` reçoit un paramètre `source` (`"Manual"` par défaut) et insère le `SyncLog` dans la même transaction que l'upsert.
**Pourquoi :** Cohérence transactionnelle — si l'import réussit, le log est toujours présent. Pas de service séparé.

### 3. Endpoint `GET /api/employes/stats` — agrégation en mémoire
**Choix :** Charger les sites actifs, pour chacun compter les employés actifs + récupérer le dernier `SyncLog`. Assemblé en C# (pas de SQL complexe).
**Pourquoi :** Volume faible (2-5 sites, quelques centaines d'employés). Lisible et maintenable.

### 4. Tableau employés côté client — filtrage et tri dans le navigateur
**Choix :** `GET /api/employes?siteId=` retourne tous les employés du site. Ant Design `Table` gère tri/pagination localement.
**Pourquoi :** Évite la complexité de pagination serveur pour un volume < 1 000 employés par site.

### 5. Affichage des stats sur `EmployesPage` — cartes Ant Design `Statistic`
**Choix :** Une carte par site avec : total actifs, date dernière synchro, résumé (N nouveaux, N màj, N désactivés). En dessous : sélecteur de site + tableau des employés.
**Pourquoi :** Lecture immédiate sans navigation. L'AdminSEBN voit l'état de tous les sites en un coup d'œil.

## Risks / Trade-offs

- **Volume SyncLogs** → Croît à chaque synchro auto (toutes les 6h). Pas de purge en Phase 1 — acceptable. Phase 2 : purge des logs > 90 jours.
- **Latence stats** → Si les deux bases MorphoManager sont lentes, `GET /api/employes/stats` attendra. Mitigation : les stats ne lisent que `CantineSEBN` (pas MorphoManager).
- **SyncLog non écrit si exception** → L'import plante avant `SaveChangesAsync` → pas de log. Comportement acceptable : une synchro échouée n'est pas une synchro.

## Migration Plan

1. Créer l'entité `SyncLog` + `SyncLogConfiguration` dans `Cantine.Core` / `Cantine.Infrastructure`
2. Ajouter `DbSet<SyncLog>` dans `CantineDbContext`
3. Générer la migration EF Core : `AddSyncLogsTable`
4. Appliquer la migration sur la base de développement
5. Modifier `MorphoEmployeeImporter.ImportAsync` pour écrire le `SyncLog`
6. Modifier `MorphoSyncService.SyncAllSitesAsync` pour écrire le `SyncLog` (source = `"Auto"`)
7. Ajouter les endpoints dans `EmployesController`
8. Enrichir `EmployesPage.tsx`
