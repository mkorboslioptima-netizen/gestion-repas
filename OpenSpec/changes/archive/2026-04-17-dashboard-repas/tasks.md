## 1. Core — DTOs et interfaces

- [x] 1.1 Créer `Cantine.Core/DTOs/RepasStatsDto.cs` (`SiteId`, `NomSite`, `TotalPassages`, `PlatChaud`, `Sandwich`, `QuotaAtteint`)
- [x] 1.2 Créer `Cantine.Core/DTOs/PassageDto.cs` (`Id`, `Matricule`, `Nom`, `Prenom`, `Timestamp`, `RepasType`, `LecteurNom`)
- [x] 1.3 Ajouter `GetHistoriqueJourAsync(DateOnly date, int limit)` dans `IMealLogRepository`
- [x] 1.4 Ajouter `GetAllTodayAsync(DateOnly date)` dans `IMealLogRepository` (pour calcul stats)
- [x] 1.5 Ajouter `GetAfterIdAsync(int lastId, DateOnly date)` dans `IMealLogRepository` (pour SSE polling)

## 2. Infrastructure — Repository

- [x] 2.1 Implémenter `GetHistoriqueJourAsync` dans `MealLogRepository` — jointure Employees + Lecteurs, trié par `Timestamp DESC`, limité à `limit`
- [x] 2.2 Implémenter `GetAllTodayAsync` dans `MealLogRepository` — tous les logs du jour filtrés par site via `ISiteContext`
- [x] 2.3 Implémenter `GetAfterIdAsync` dans `MealLogRepository` — logs du jour avec `Id > lastId`, triés par `Id ASC`

## 3. API — RepasController

- [x] 3.1 Créer `Cantine.API/Controllers/RepasController.cs` avec `[Authorize]`
- [x] 3.2 Ajouter `GET /api/repas/stats-jour` — appelle `GetAllTodayAsync`, agrège en `RepasStatsDto` (totalPassages, platChaud, sandwich, quotaAtteint par site)
- [x] 3.3 Ajouter `GET /api/repas/historique-jour?limit=50` — appelle `GetHistoriqueJourAsync`, retourne `IEnumerable<PassageDto>`
- [x] 3.4 Ajouter `GET /api/repas/flux` — endpoint SSE (DB polling 1s) : émet les `PassageDto` dont `Id > lastId` jusqu'à `RequestAborted`

## 4. Frontend — API client

- [x] 4.1 Créer `cantine-web/src/api/repas.ts` avec `getStatsJour()` et `getHistoriqueJour(limit?)` via axios
- [x] 4.2 Ajouter interfaces TypeScript `RepasStatsDto`, `PassageDto`

## 5. Frontend — DashboardPage

- [x] 5.1 Créer `cantine-web/src/pages/DashboardPage.tsx` avec 3 sections : cartes stats, liste passages, graphique horaire
- [x] 5.2 Section cartes : `Statistic` Ant Design (Total, PlatChaud, Sandwich, QuotaAtteint) — une rangée par site via `getStatsJour()`
- [x] 5.3 Section liste : 50 derniers passages (heure · Nom Prénom · type · lecteur) — chargés via `getHistoriqueJour()`
- [x] 5.4 Section graphique : `BarChart` Recharts passages par heure (0-23), calculé côté client depuis l'historique
- [x] 5.5 Connexion `EventSource` à `/api/repas/flux` au montage, fermée au démontage — chaque événement insère en tête de liste + rafraîchit les stats via `queryClient.invalidateQueries`
- [x] 5.6 Ajouter la route `/` → `<DashboardPage />` dans `App.tsx` (remplace la redirection vers `/admin/lecteurs`)
- [x] 5.7 Ajouter l'entrée Dashboard dans le menu latéral (`DashboardOutlined`)

## 6. Vérification

- [x] 6.1 Vérifier que `GET /api/repas/stats-jour` retourne les bons compteurs
- [x] 6.2 Vérifier que `GET /api/repas/historique-jour` retourne les passages triés par heure décroissante
- [x] 6.3 Vérifier que `GET /api/repas/flux` établit la connexion SSE et émet des événements au polling
- [x] 6.4 Vérifier que le dashboard affiche stats + liste + graphique correctement
