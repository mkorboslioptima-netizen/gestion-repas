## ADDED Requirements

### Requirement: Liste des employés par site
Le système SHALL exposer un endpoint `GET /api/employes?siteId={siteId}` retournant la liste des employés du site (Matricule, Nom, Prénom, Actif, MaxMealsPerDay). Seuls les utilisateurs avec le rôle `AdminSEBN` peuvent accéder à cet endpoint.

#### Scenario: Liste retournée pour un site valide
- **WHEN** une requête `GET /api/employes?siteId=SEBN-TN01` est envoyée avec un token AdminSEBN valide
- **THEN** le système retourne HTTP 200 avec un tableau JSON d'employés appartenant au site `SEBN-TN01`

#### Scenario: Employés filtrés par site
- **WHEN** deux sites ont des employés et une requête filtre sur `siteId=SEBN-TN01`
- **THEN** seuls les employés dont `SiteId = SEBN-TN01` sont retournés

#### Scenario: Accès refusé sans token AdminSEBN
- **WHEN** une requête est envoyée sans token ou avec un rôle insuffisant
- **THEN** le système retourne HTTP 401 ou 403

### Requirement: Affichage tableau employés dans l'UI
L'UI SHALL afficher un tableau Ant Design des employés du site sélectionné, avec colonnes : Matricule, Nom, Prénom, Statut (Actif/Inactif), Quota (MaxMealsPerDay). Le tableau SHALL supporter le tri client et la pagination (20 par page).

#### Scenario: Tableau affiché après sélection d'un site
- **WHEN** l'AdminSEBN sélectionne un site sur la page Employés
- **THEN** le tableau se charge et affiche les employés du site avec leurs colonnes

#### Scenario: Indicateur de chargement
- **WHEN** la requête API est en cours
- **THEN** le tableau affiche un skeleton ou spinner Ant Design

#### Scenario: Tableau vide si aucun employé
- **WHEN** le site n'a aucun employé importé
- **THEN** le tableau affiche l'état vide Ant Design ("Aucun employé importé")
