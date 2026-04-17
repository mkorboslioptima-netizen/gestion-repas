## ADDED Requirements

### Requirement: Synchronisation automatique toutes les 6 heures
Le système SHALL déclencher automatiquement une synchronisation des employés depuis MorphoManager pour chaque site actif ayant une `MorphoConfig` configurée, toutes les 6 heures, sans intervention humaine.

#### Scenario: Synchro automatique — site accessible
- **WHEN** le timer de 6 heures se déclenche et la base MorphoManager de SEBN-TN01 est accessible
- **THEN** le système importe les nouveaux employés, met à jour les existants, désactive les absents et logue le résumé

#### Scenario: Synchro automatique — site inaccessible
- **WHEN** le timer se déclenche et la connexion MorphoManager d'un site échoue
- **THEN** le système logue un WARNING et passe au site suivant sans interrompre la synchro des autres sites

#### Scenario: Résultat zéro employé — désactivation bloquée
- **WHEN** la requête MorphoManager retourne 0 résultats
- **THEN** le système n'applique aucune désactivation et logue un WARNING "Résultat vide — désactivation ignorée"

### Requirement: Désactivation automatique des employés absents de MorphoManager
Lors d'une synchronisation automatique, le système SHALL désactiver (`Actif = false`) tout employé présent dans CantineSEBN mais absent de la liste retournée par MorphoManager pour le même site. Les employés désactivés ne doivent pas être supprimés.

#### Scenario: Employé parti — désactivé automatiquement
- **WHEN** la synchro auto s'exécute et un employé de SEBN-TN01 n'est plus dans MorphoManager
- **THEN** l'employé reçoit `Actif = false` dans CantineSEBN et ne peut plus pointer

#### Scenario: Employé désactivé ne peut plus pointer
- **WHEN** une trame TCP arrive avec le matricule d'un employé dont `Actif = false`
- **THEN** le système retourne `éligible = false` avec le motif "Employé inactif"

#### Scenario: Import manuel ne désactive pas les absents
- **WHEN** l'AdminSEBN déclenche un import manuel depuis l'UI
- **THEN** aucun employé n'est désactivé, même s'il est absent de MorphoManager

### Requirement: Déclenchement manuel de la synchronisation depuis l'UI
Le système SHALL exposer un bouton "Synchroniser" dans la page Employés permettant à l'AdminSEBN de déclencher immédiatement la synchronisation de tous les sites configurés.

#### Scenario: Synchronisation manuelle déclenchée
- **WHEN** l'AdminSEBN clique sur "Synchroniser"
- **THEN** l'API retourne immédiatement HTTP 202, la synchro s'exécute en arrière-plan et l'UI affiche "Synchronisation lancée"

#### Scenario: Résumé par site affiché
- **WHEN** la synchronisation manuelle se termine
- **THEN** l'UI affiche pour chaque site : importés, mis à jour, désactivés, ignorés

### Requirement: Logging des synchronisations
Le système SHALL enregistrer dans les logs applicatifs chaque synchronisation avec : timestamp de début, site, durée, nombre d'employés importés/mis à jour/désactivés/ignorés. Les erreurs de connexion MUST être loggées en WARNING.

#### Scenario: Log de succès
- **WHEN** une synchronisation se termine avec succès pour un site
- **THEN** un log INFO contient : "[Sync Morpho] SEBN-TN01 — importés: N, màj: N, désactivés: N, ignorés: N (Xms)"

#### Scenario: Log d'erreur de connexion
- **WHEN** la connexion MorphoManager d'un site échoue
- **THEN** un log WARNING contient : "[Sync Morpho] SEBN-TN01 — ERREUR connexion : <message>"
