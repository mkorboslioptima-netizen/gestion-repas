## Why

L'application ne dispose d'aucune page d'accueil : l'AdminSEBN et le ResponsableCantine n'ont aucune visibilité sur l'activité de la journée (passages en cours, quotas atteints, répartition par type de repas) sans consulter la base directement. Un dashboard en temps réel via SSE permet un suivi opérationnel immédiat sans rafraîchissement manuel.

## What Changes

- Ajouter une page Dashboard (`/`) accessible à tous les rôles authentifiés
- Exposer `GET /api/repas/stats-jour` : statistiques agrégées du jour par site (total passages, PlatChaud, Sandwich, quota atteint)
- Exposer `GET /api/repas/flux` : flux SSE émettant un événement à chaque nouveau pointage
- Exposer `GET /api/repas/historique-jour` : liste des 50 derniers passages du jour (Nom, Prénom, heure, type, lecteur)
- Afficher les stats en cartes Ant Design `Statistic`, le flux live en liste et un graphique horaire via Recharts

## Capabilities

### New Capabilities

- `meal-stats-jour` : Statistiques agrégées du jour par site — total passages, répartition PlatChaud/Sandwich, nombre d'employés ayant atteint leur quota
- `meal-flux-sse` : Flux Server-Sent Events émettant chaque nouveau `MealLog` en temps réel vers le dashboard
- `meal-historique-jour` : Liste des N derniers passages du jour avec détail (employé, heure, type de repas, lecteur)

### Modified Capabilities

*(aucune)*

## Impact

- **Backend :** Nouveau `RepasController` avec 3 endpoints ; `IMealLogRepository` enrichi de 2 méthodes de requête ; flux SSE via `Response.Body` (pattern existant dans le projet)
- **Frontend :** Nouvelle page `DashboardPage.tsx` en route `/` ; composant `RepasFluxLive.tsx` avec `EventSource` natif ; graphique `Recharts` (`BarChart` passages par heure)
- **Dépendances :** Recharts déjà présent dans `package.json` ; aucune nouvelle dépendance backend
- **Rôles :** Page accessible à `AdminSEBN` et `ResponsableCantine` (pas de restriction de données en Phase 1 — filtrage par site via `ISiteContext`)
