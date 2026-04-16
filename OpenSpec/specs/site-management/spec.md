## ADDED Requirements

### Requirement: Liste des sites
Le système SHALL exposer un endpoint `GET /api/sites` retournant la liste de tous les sites avec leur identifiant, nom et statut actif. Seul un utilisateur avec le rôle `AdminSEBN` peut accéder à cet endpoint.

#### Scenario: AdminSEBN consulte les sites
- **WHEN** un utilisateur `AdminSEBN` envoie `GET /api/sites` avec un token valide
- **THEN** le système retourne HTTP 200 avec la liste `[{ siteId, nom, actif }]` de tous les sites

#### Scenario: Accès refusé sans rôle AdminSEBN
- **WHEN** un utilisateur sans rôle `AdminSEBN` envoie `GET /api/sites`
- **THEN** le système retourne HTTP 403

### Requirement: Configuration MorphoManager par site
Le système SHALL stocker la configuration MorphoManager de chaque site (ConnectionString, Query SQL, CommandTimeout) dans la table `MorphoConfigs` en base de données. Un AdminSEBN SHALL pouvoir lire et mettre à jour cette configuration via `GET /api/sites/{siteId}/morpho-config` et `PUT /api/sites/{siteId}/morpho-config`.

#### Scenario: Lecture de la configuration MorphoManager
- **WHEN** un AdminSEBN envoie `GET /api/sites/SEBN-TN01/morpho-config`
- **THEN** le système retourne HTTP 200 avec `{ siteId, connectionString, query, commandTimeout }`

#### Scenario: Mise à jour de la configuration MorphoManager
- **WHEN** un AdminSEBN envoie `PUT /api/sites/SEBN-TN01/morpho-config` avec un body valide
- **THEN** le système persiste les nouvelles valeurs et retourne HTTP 200

#### Scenario: Configuration absente
- **WHEN** un AdminSEBN consulte la config d'un site qui n'a pas encore de config MorphoManager
- **THEN** le système retourne HTTP 404

### Requirement: Seed initial des sites SEBN-TN01 et SEBN-TN02
Le système SHALL insérer automatiquement les sites SEBN-TN01 (nom : "SEBN Tunis 01") et SEBN-TN02 (nom : "SEBN Tunis 02") lors de la migration EF Core initiale, avec `Actif = true`.

#### Scenario: Migration appliquée sur base vide
- **WHEN** la migration `AddMultiSiteSupport` est appliquée sur une base vide
- **THEN** la table `Sites` contient exactement deux lignes : SEBN-TN01 et SEBN-TN02 avec `Actif = true`
