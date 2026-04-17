## Context

Le projet dispose déjà du pattern SSE dans `LecteursController` (response streaming `text/event-stream`). `MealLog` contient `SiteId`, `Matricule`, `LecteurId`, `Timestamp`, `RepasType`. `IMealLogRepository` n'expose que `AddAsync` et `GetCountTodayAsync`. `ISiteContext` filtre par site via le header `X-Site-Id`. L'interface admin bypasse l'auth en dev (`isAdmin = true`, middleware DevBypass).

## Goals / Non-Goals

**Goals:**
- Dashboard page par défaut (`/`) avec stats du jour par site
- Flux SSE pour voir les nouveaux pointages en temps réel sans polling
- Historique des 50 derniers passages du jour (liste)
- Graphique Recharts : passages par heure (barres)

**Non-Goals:**
- Statistiques historiques multi-jours (Phase 2)
- Filtrage par type de repas ou lecteur dans l'UI (Phase 2)
- Export du dashboard (export Excel séparé — autre change)
- Notifications push navigateur

## Decisions

### 1. Enrichissement de `IMealLogRepository` plutôt que nouveau service
**Choix :** Ajouter `GetStatsJourAsync` et `GetHistoriqueJourAsync` directement sur `IMealLogRepository` + `MealLogRepository`.
**Pourquoi :** Les deux méthodes sont de la pure lecture sur `MealLogs`. Créer un service intermédiaire serait de l'over-engineering pour des requêtes sans logique métier.

### 2. SSE via `Response.Body` dans `RepasController`
**Choix :** Endpoint `GET /api/repas/flux` qui maintient la connexion ouverte et émet des événements via `IRepasFluxPublisher` (singleton). Chaque nouveau `MealLog` (écrit par `TcpListener`) déclenche une publication.
**Pourquoi :** Cohérent avec le pattern SSE existant. `IRepasFluxPublisher` découple le publisher (TcpListener) du subscriber (controller HTTP).

### 3. `IRepasFluxPublisher` singleton partagé entre TcpListener et API
**Choix :** Interface `IRepasFluxPublisher` dans `Cantine.Core`, implémentation `RepasFluxPublisher` dans `Cantine.Infrastructure` enregistrée en Singleton. Le `TcpListener` appelle `Publish()` après chaque `MealLog` inséré.
**Pourquoi :** Le TcpListener et l'API partagent le même process en Phase 1 (voir `Cantine.TcpListener` qui référence `Cantine.Infrastructure`). Un singleton en mémoire suffit.

### 4. Stats jour : agrégation en mémoire sur résultats EF Core
**Choix :** `GetStatsJourAsync` retourne `IReadOnlyList<MealLog>` du jour filtré par site, agrégé en C# (pas de GROUP BY SQL).
**Pourquoi :** Volume faible (< 500 passages/jour par site). Maintenable et testable facilement.

### 5. Graphique horaire : `BarChart` Recharts, données côté client
**Choix :** Le frontend agrège les passages par heure à partir de l'historique retourné par l'API. Pas d'endpoint dédié.
**Pourquoi :** Évite un endpoint spécialisé pour un calcul trivial. Le volume de données (50 entrées max) est négligeable.

## Risks / Trade-offs

- **SSE et scalabilité** → `RepasFluxPublisher` en mémoire ne fonctionne pas en multi-instance. Acceptable Phase 1 (déploiement mono-serveur).
- **Connexions SSE orphelines** → Si le client se déconnecte sans fermer proprement, la connexion reste ouverte jusqu'au timeout. Géré par `CancellationToken` sur `HttpContext.RequestAborted`.
- **Stats non temps-réel** → `GET /api/repas/stats-jour` est un snapshot. Le client interroge les stats au chargement + après chaque événement SSE reçu pour rester à jour.

## Migration Plan

1. Enrichir `IMealLogRepository` + `MealLogRepository`
2. Créer `IRepasFluxPublisher` + `RepasFluxPublisher` (singleton)
3. Modifier `TcpListenerBackgroundService` pour appeler `IRepasFluxPublisher.Publish()` après chaque `MealLog`
4. Créer `RepasController` avec les 3 endpoints
5. Enregistrer les services dans `Program.cs` (API et TcpListener)
6. Créer `DashboardPage.tsx` avec cartes stats + liste historique + graphique + SSE
