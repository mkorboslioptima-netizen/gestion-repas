## MODIFIED Requirements

### Requirement: Endpoint statistiques du jour
Le système SHALL exposer `GET /api/repas/stats-jour` acceptant les paramètres optionnels `dateDebut` (YYYY-MM-DD), `dateFin` (YYYY-MM-DD), `heureDebut` (HH:mm), `heureFin` (HH:mm). Si ces paramètres sont absents, l'endpoint MUST utiliser la journée courante (00:00–23:59) comme valeur par défaut. L'endpoint retourne pour chaque site actif : nombre total de passages sur la période, répartition par type (PlatChaud, Sandwich), nombre d'employés ayant atteint leur quota journalier. Accessible aux rôles `AdminSEBN` et `ResponsableCantine`.

#### Scenario: Stats retournées pour le jour courant (comportement par défaut)
- **WHEN** `GET /api/repas/stats-jour` est appelé sans paramètres
- **THEN** le système retourne HTTP 200 avec les stats de la journée courante, identique au comportement précédent

#### Scenario: Stats retournées pour une plage de dates
- **WHEN** `GET /api/repas/stats-jour?dateDebut=2026-04-01&dateFin=2026-04-15` est appelé
- **THEN** le système retourne HTTP 200 avec les totaux agrégés sur toute la période du 1er au 15 avril

#### Scenario: Stats avec filtre horaire
- **WHEN** `GET /api/repas/stats-jour?dateDebut=2026-04-20&dateFin=2026-04-20&heureDebut=11:00&heureFin=14:00` est appelé
- **THEN** seuls les passages entre 11h00 et 14h00 sont comptabilisés

#### Scenario: Stats à zéro si aucun passage
- **WHEN** aucun `MealLog` n'existe pour la période demandée
- **THEN** toutes les valeurs numériques sont à 0, HTTP 200
