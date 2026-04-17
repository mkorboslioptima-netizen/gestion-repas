## ADDED Requirements

### Requirement: Endpoint statistiques du jour
Le système SHALL exposer `GET /api/repas/stats-jour` retournant pour chaque site actif : nombre total de passages du jour, répartition par type (PlatChaud, Sandwich), nombre d'employés ayant atteint leur quota journalier. Accessible aux rôles `AdminSEBN` et `ResponsableCantine`.

#### Scenario: Stats retournées pour le jour courant
- **WHEN** `GET /api/repas/stats-jour` est appelé en cours de journée
- **THEN** le système retourne HTTP 200 avec un tableau contenant une entrée par site actif, chacune avec `totalPassages`, `platChaud`, `sandwich`, `quotaAtteint`

#### Scenario: Stats à zéro si aucun passage
- **WHEN** aucun `MealLog` n'existe pour le jour courant
- **THEN** toutes les valeurs numériques sont à 0, HTTP 200

### Requirement: Affichage cartes statistiques dans le dashboard
L'UI SHALL afficher une section de cartes Ant Design `Statistic` sur la page Dashboard avec : total passages du jour, répartition PlatChaud / Sandwich, nombre d'employés ayant atteint leur quota. Les cartes SHALL se rafraîchir à chaque événement SSE reçu.

#### Scenario: Cartes affichées au chargement
- **WHEN** la page Dashboard se charge
- **THEN** les cartes de statistiques affichent les valeurs du jour courant

#### Scenario: Rafraîchissement après événement SSE
- **WHEN** un nouvel événement SSE est reçu (nouveau passage)
- **THEN** les cartes de statistiques se mettent à jour sans rechargement de page
