## ADDED Requirements

### Requirement: Claim siteId dans le JWT
Le JWT SHALL contenir un claim `siteId` pour les utilisateurs à périmètre limité. Pour l'AdminSEBN (périmètre global), le claim `siteId` SHALL être absent ou null. Pour AdminCantine et Prestataire, le claim `siteId` SHALL contenir l'identifiant du site assigné.

#### Scenario: Token AdminSEBN sans siteId
- **WHEN** un token JWT ne contient pas de claim `siteId`
- **THEN** l'API interprète cela comme un accès global à tous les sites (rôle `AdminSEBN` requis)

#### Scenario: Token AdminCantine avec siteId
- **WHEN** un token JWT contient `siteId: "SEBN-TN01"` et le rôle `AdminCantine`
- **THEN** toutes les requêtes de cet utilisateur sont automatiquement filtrées sur `SiteId = "SEBN-TN01"`

### Requirement: Filtrage automatique par site sur toutes les entités
Le système SHALL filtrer toutes les données retournées par l'API selon le `SiteId` de l'utilisateur authentifié. Un utilisateur avec `siteId: "SEBN-TN01"` ne SHALL jamais voir les données de `SEBN-TN02`, et inversement.

#### Scenario: Employés filtrés par site
- **WHEN** un AdminCantine SEBN-TN01 consulte la liste des employés
- **THEN** seuls les employés avec `SiteId = "SEBN-TN01"` sont retournés

#### Scenario: MealLogs filtrés par site
- **WHEN** un Prestataire SEBN-TN02 consulte les statistiques
- **THEN** seuls les MealLogs avec `SiteId = "SEBN-TN02"` sont inclus dans le calcul

#### Scenario: Accès croisé refusé
- **WHEN** un AdminCantine SEBN-TN01 tente d'accéder à un employé de SEBN-TN02 par son Matricule
- **THEN** le système retourne HTTP 404 (comme si l'employé n'existait pas)

### Requirement: Rôle Prestataire en lecture seule
Le système SHALL reconnaître le rôle `Prestataire` comme un accès en lecture seule aux endpoints de statistiques du site assigné. Un Prestataire ne SHALL pas pouvoir accéder aux endpoints de modification (import, configuration, gestion des lecteurs).

#### Scenario: Prestataire consulte les stats
- **WHEN** un utilisateur avec le rôle `Prestataire` et `siteId: "SEBN-TN01"` consulte `GET /api/stats/daily?siteId=SEBN-TN01`
- **THEN** le système retourne HTTP 200 avec les données du jour pour SEBN-TN01

#### Scenario: Prestataire tente un import
- **WHEN** un Prestataire envoie `POST /api/employes/import-morpho/SEBN-TN01`
- **THEN** le système retourne HTTP 403

### Requirement: Vue consolidée AdminSEBN
Le système SHALL permettre à l'AdminSEBN de consulter les données de tous les sites sans filtrage. L'AdminSEBN SHALL pouvoir spécifier un `siteId` optionnel dans ses requêtes pour filtrer sur un site particulier.

#### Scenario: AdminSEBN sans filtre de site
- **WHEN** un AdminSEBN consulte `GET /api/stats/daily` sans paramètre `siteId`
- **THEN** le système retourne les données agrégées de tous les sites actifs

#### Scenario: AdminSEBN filtre sur un site
- **WHEN** un AdminSEBN consulte `GET /api/stats/daily?siteId=SEBN-TN01`
- **THEN** le système retourne uniquement les données de SEBN-TN01
