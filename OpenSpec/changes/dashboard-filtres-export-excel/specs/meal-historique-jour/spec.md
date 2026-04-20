## MODIFIED Requirements

### Requirement: Endpoint historique du jour
Le système SHALL exposer `GET /api/repas/historique-jour` acceptant les paramètres optionnels `dateDebut` (YYYY-MM-DD), `dateFin` (YYYY-MM-DD), `heureDebut` (HH:mm), `heureFin` (HH:mm), et `limit` (entier, défaut 500 en mode filtré, 50 en mode jour courant). Si ces paramètres sont absents, l'endpoint MUST utiliser la journée courante comme valeur par défaut. Chaque entrée contient : `id`, `matricule`, `nom`, `prenom`, `timestamp`, `repasType`, `lecteurNom`. Accessible aux rôles `AdminSEBN` et `ResponsableCantine`.

#### Scenario: Historique retourné pour le jour courant (comportement par défaut)
- **WHEN** `GET /api/repas/historique-jour` est appelé sans paramètres
- **THEN** le système retourne les 50 derniers passages du jour du site actif, identique au comportement précédent

#### Scenario: Historique retourné pour une plage de dates
- **WHEN** `GET /api/repas/historique-jour?dateDebut=2026-04-01&dateFin=2026-04-15` est appelé
- **THEN** le système retourne jusqu'à 500 passages triés par Timestamp décroissant sur la période entière

#### Scenario: Historique avec filtre horaire
- **WHEN** `GET /api/repas/historique-jour?dateDebut=2026-04-20&dateFin=2026-04-20&heureDebut=11:00&heureFin=14:00` est appelé
- **THEN** seuls les passages entre 11h00 et 14h00 du 20 avril sont retournés

#### Scenario: Liste vide si aucun passage sur la période
- **WHEN** aucun `MealLog` n'existe pour la période demandée
- **THEN** le système retourne HTTP 200 avec un tableau vide

### Requirement: Liste des passages dans le dashboard (avec filtre)
L'UI SHALL afficher la liste des passages correspondant aux filtres actifs dans le feed du dashboard. La limite affichée SHALL être de 50 entrées dans le feed (les données complètes sont dans l'export Excel). Les nouveaux passages reçus via SSE SHALL être insérés en tête de liste uniquement si la journée courante est incluse dans le filtre actif.

#### Scenario: Feed mis à jour avec le filtre actif
- **WHEN** l'utilisateur applique un filtre et que les données sont chargées
- **THEN** le feed affiche les passages correspondant au filtre, triés du plus récent au plus ancien, limités à 50

#### Scenario: Feed SSE actif uniquement si aujourd'hui est dans le filtre
- **WHEN** le filtre inclut la date courante
- **THEN** les nouveaux passages SSE sont insérés en tête du feed en temps réel
