## ADDED Requirements

### Requirement: Persistance des résultats de synchronisation
Le système SHALL enregistrer chaque opération d'import ou de synchronisation dans une table `SyncLogs` contenant : SiteId, OccurredAt (UTC), Source (`"Manual"` ou `"Auto"`), Importes, MisAJour, Desactives, Ignores. L'écriture SHALL être effectuée dans la même transaction que l'upsert des employés.

#### Scenario: SyncLog créé après import manuel réussi
- **WHEN** `POST /api/employes/import-morpho/{siteId}` réussit
- **THEN** un `SyncLog` est inséré avec `Source = "Manual"`, les compteurs corrects et `OccurredAt` en UTC

#### Scenario: SyncLog créé après synchronisation automatique
- **WHEN** `MorphoSyncService.SyncAllSitesAsync` traite un site avec succès
- **THEN** un `SyncLog` est inséré avec `Source = "Auto"` pour ce site

#### Scenario: Pas de SyncLog si import échoue
- **WHEN** la connexion à MorphoManager échoue et une exception est levée
- **THEN** aucun `SyncLog` n'est persisté pour cette tentative

### Requirement: Endpoint historique de synchronisation
Le système SHALL exposer `GET /api/employes/sync-logs/{siteId}` retournant les N derniers `SyncLog` d'un site (N = 10 par défaut), triés par `OccurredAt` décroissant. Accessible uniquement aux `AdminSEBN`.

#### Scenario: Historique retourné pour un site
- **WHEN** `GET /api/employes/sync-logs/SEBN-TN01` est appelé avec token AdminSEBN
- **THEN** le système retourne les 10 derniers SyncLogs du site, triés du plus récent au plus ancien

#### Scenario: Liste vide si aucune synchro effectuée
- **WHEN** aucun SyncLog n'existe pour le site
- **THEN** le système retourne HTTP 200 avec un tableau vide
