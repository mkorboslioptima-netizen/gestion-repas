## Context

Le dashboard actuel est figé sur la journée courante (minuit → maintenant) et appelle les endpoints `/api/repas/stats-jour` et `/api/repas/historique-jour` qui ne prennent aucun paramètre de date. L'export CSV est généré entièrement côté client à partir des données JSON. ClosedXML est déjà déclaré comme dépendance dans `Cantine.Infrastructure` mais n'est pas encore utilisé pour ce flow.

## Goals / Non-Goals

**Goals:**
- Panneau de filtres (DateRangePicker + TimePicker plage horaire) sur le dashboard
- Endpoints stats et historique paramétrables par `dateDebut`, `dateFin`, `heureDebut`, `heureFin`
- Nouvel endpoint `GET /api/repas/export` retournant un fichier XLSX généré par ClosedXML
- Comportement par défaut inchangé (jour courant, 00h–23h59) si aucun filtre fourni

**Non-Goals:**
- Filtres par site (déjà géré par `SiteContext`)
- Filtres par type de repas ou par employé
- Génération PDF
- Sauvegarde des filtres entre sessions

## Decisions

### D1 — Paramètres de filtre unifiés en query string ISO 8601

Les deux endpoints stats et historique acceptent `dateDebut` (YYYY-MM-DD), `dateFin` (YYYY-MM-DD), `heureDebut` (HH:mm), `heureFin` (HH:mm). Valeurs par défaut côté API : `dateDebut = dateFin = aujourd'hui`, `heureDebut = 00:00`, `heureFin = 23:59`.

> Alternatif écarté : timestamps UTC complets (`DateTime`) — plus difficile à construire côté React, les heures locales étant plus naturelles pour les filtres utilisateur.

### D2 — Export XLSX généré côté serveur (ClosedXML)

`GET /api/repas/export?dateDebut=&dateFin=&heureDebut=&heureFin=` retourne `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` avec les mêmes paramètres que les autres endpoints. Le frontend déclenche un `blob` download depuis Axios avec `responseType: 'blob'`.

> Alternatif écarté : génération XLSX côté client (SheetJS) — ajout d'une dépendance npm non nécessaire puisque ClosedXML est déjà présent.

### D3 — Filtre par défaut = journée courante

Si `dateDebut`/`dateFin` sont absents de la requête, l'API utilise `DateTime.Today`. Cela préserve le comportement existant sans migration.

### D4 — SSE désactivé quand un filtre historique est actif

Quand la plage de dates sélectionnée ne contient pas aujourd'hui, la connexion SSE est suspendue (EventSource non connecté) car les événements temps-réel ne sont pas pertinents pour une vue passée.

> Alternatif écarté : garder le SSE actif — enverrait des données non cohérentes avec le filtre affiché.

## Risks / Trade-offs

- **[Risque] Volume de données important sur une longue plage** → Limiter l'historique filtré à 500 entrées max ; le XLSX génère toutes les lignes (pas de limite).
- **[Trade-off] heureDebut/heureFin en heure locale** → L'API interprète les heures comme locales (timezone du serveur). Pour une installation mono-site (SEBN Tunisie, UTC+1), c'est acceptable sans gestion de timezone explicite.
- **[Risque] Performance EF Core sur grande plage** → Utiliser `AsNoTracking()` et s'assurer que `MealLogs.Timestamp` est indexé (déjà le cas).

## Migration Plan

1. Mettre à jour `RepasController` — endpoints existants restent compatibles (params optionnels)
2. Ajouter `GET /api/repas/export` (nouveau, pas de breaking change)
3. Déployer backend
4. Mettre à jour `DashboardPage.tsx` avec le panneau filtres
5. Déployer frontend

Rollback : supprimer les paramètres query des appels frontend → retour au comportement J courant.

## Open Questions

- Faut-il inclure dans le XLSX la colonne "Lecteur" (nom du lecteur biométrique) ou seulement Nom/Prénom/Matricule/Type/Timestamp ?
- La plage horaire s'applique-t-elle sur chaque jour de la plage de dates, ou comme une fenêtre absolue (heure de début le jour 1, heure de fin le dernier jour) ?
  - Hypothèse retenue : la plage horaire s'applique sur **chaque** jour (ex. : 11h–14h tous les jours de la semaine).
