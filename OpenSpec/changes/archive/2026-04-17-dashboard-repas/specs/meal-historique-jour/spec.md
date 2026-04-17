## ADDED Requirements

### Requirement: Endpoint historique du jour
Le système SHALL exposer `GET /api/repas/historique-jour?limit=50` retournant les N derniers `MealLog` du jour courant pour le site actif, triés par `Timestamp` décroissant. Chaque entrée contient : `id`, `matricule`, `nom`, `prenom`, `timestamp`, `repasType`, `lecteurNom`. Accessible aux rôles `AdminSEBN` et `ResponsableCantine`.

#### Scenario: Historique retourné pour le jour courant
- **WHEN** `GET /api/repas/historique-jour` est appelé
- **THEN** le système retourne les 50 derniers passages du jour du site actif, du plus récent au plus ancien

#### Scenario: Liste vide si aucun passage aujourd'hui
- **WHEN** aucun `MealLog` n'existe pour le jour courant
- **THEN** le système retourne HTTP 200 avec un tableau vide

### Requirement: Liste des passages dans le dashboard
L'UI SHALL afficher la liste des derniers passages du jour dans le dashboard : heure (format HH:mm), Nom Prénom, type de repas (PlatChaud / Sandwich), lecteur. Les nouveaux passages reçus via SSE SHALL être insérés en tête de liste. La liste SHALL être limitée à 50 entrées.

#### Scenario: Liste affichée au chargement
- **WHEN** le dashboard se charge
- **THEN** la liste affiche les derniers passages du jour dans l'ordre chronologique inverse

#### Scenario: Insertion en tête à chaque événement SSE
- **WHEN** un nouvel événement SSE est reçu
- **THEN** le passage est inséré en haut de la liste, le 51ème est supprimé si la liste dépasse 50

### Requirement: Graphique passages par heure
L'UI SHALL afficher un `BarChart` Recharts représentant le nombre de passages par heure de la journée (axe X : heures 0-23, axe Y : nombre de passages). Les données sont calculées côté client à partir de l'historique.

#### Scenario: Graphique mis à jour après événement SSE
- **WHEN** un nouvel événement SSE est reçu
- **THEN** la barre de l'heure courante est incrémentée sans rechargement
