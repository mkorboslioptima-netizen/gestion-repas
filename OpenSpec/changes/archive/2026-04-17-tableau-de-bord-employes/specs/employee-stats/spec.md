## ADDED Requirements

### Requirement: Endpoint statistiques employés par site
Le système SHALL exposer `GET /api/employes/stats` retournant pour chaque site actif : SiteId, Nom du site, nombre d'employés actifs, date et résultats de la dernière synchronisation (ou `null` si aucune). Accessible uniquement aux `AdminSEBN`.

#### Scenario: Stats retournées pour tous les sites
- **WHEN** `GET /api/employes/stats` est appelé avec token AdminSEBN
- **THEN** le système retourne un tableau avec une entrée par site actif, chacune contenant le nombre d'employés actifs et les infos de la dernière synchro

#### Scenario: Dernière synchro null si aucun SyncLog
- **WHEN** un site n'a jamais eu de synchronisation
- **THEN** le champ `derniereSynchro` est `null` dans la réponse pour ce site

### Requirement: Affichage cartes de statistiques dans l'UI
L'UI SHALL afficher une carte Ant Design `Card` par site sur la page Employés, contenant : nombre d'employés actifs (composant `Statistic`), date de la dernière synchronisation (format relatif : "il y a 2h"), résumé de la dernière synchro ("+3 nouveaux · 1 mis à jour · 0 désactivés"). Les cartes SHALL se rafraîchir automatiquement après chaque import ou synchronisation déclenchée depuis l'UI.

#### Scenario: Carte affichée avec stats à jour
- **WHEN** la page Employés se charge
- **THEN** une carte par site est affichée avec le nombre d'employés actifs et la date de dernière synchro

#### Scenario: Carte mise à jour après import
- **WHEN** l'AdminSEBN lance un import depuis l'UI et qu'il réussit
- **THEN** la carte du site concerné se met à jour avec les nouveaux compteurs sans rechargement de page

#### Scenario: Résumé dernière synchro affiché
- **WHEN** un SyncLog existe pour le site
- **THEN** la carte affiche "+N nouveaux · N mis à jour · N désactivés" correspondant au dernier SyncLog
