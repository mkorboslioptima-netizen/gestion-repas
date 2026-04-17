## ADDED Requirements

### Requirement: Importer les employés depuis MorphoManager
Le système SHALL lire la liste des employés depuis la base SQL Server MorphoManager via une connexion directe et insérer ou mettre à jour les enregistrements correspondants dans la table `Employees` de CantineSEBN. L'import MUST être idempotent : un appel répété ne doit pas créer de doublons.

#### Scenario: Import initial réussi
- **WHEN** l'AdminSEBN déclenche l'import et la base MorphoManager est accessible
- **THEN** le système insère tous les employés absents de CantineSEBN avec `MaxMealsPerDay = 1` et retourne le nombre d'employés importés

#### Scenario: Employé déjà existant
- **WHEN** un employé avec le même matricule existe déjà dans CantineSEBN
- **THEN** le système met à jour uniquement le Nom et le Prénom sans modifier `MaxMealsPerDay`

#### Scenario: Base MorphoManager inaccessible
- **WHEN** la connexion à MorphoManager échoue (serveur indisponible, timeout)
- **THEN** le système retourne une erreur explicite et n'effectue aucune modification dans CantineSEBN

### Requirement: Résumé de l'import
Le système SHALL retourner un objet de résultat contenant le nombre d'employés importés (nouveaux), mis à jour et ignorés (inchangés).

#### Scenario: Résultat complet retourné
- **WHEN** l'import se termine avec succès
- **THEN** la réponse contient les champs `importes`, `misAJour` et `ignores` avec leurs valeurs respectives

### Requirement: Sécurisation de l'endpoint d'import
L'endpoint `POST /api/employes/import-morpho` MUST être accessible uniquement aux utilisateurs ayant le rôle `AdminSEBN`.

#### Scenario: Accès autorisé
- **WHEN** un utilisateur avec le rôle `AdminSEBN` appelle l'endpoint
- **THEN** l'import est exécuté et le résultat retourné avec HTTP 200

#### Scenario: Accès refusé
- **WHEN** un utilisateur sans le rôle `AdminSEBN` appelle l'endpoint
- **THEN** le système retourne HTTP 403 sans exécuter l'import

### Requirement: Bouton d'import dans l'interface React
L'interface SHALL proposer un bouton "Importer depuis MorphoManager" dans la page Employés, visible uniquement pour le rôle `AdminSEBN`, affichant un état de chargement pendant l'opération et le résumé du résultat à la fin.

#### Scenario: Import déclenché depuis l'UI
- **WHEN** l'AdminSEBN clique sur le bouton d'import
- **THEN** le bouton passe en état de chargement, l'API est appelée, puis un message de succès affiche les compteurs (importés / mis à jour / ignorés)

#### Scenario: Erreur affichée à l'utilisateur
- **WHEN** l'import échoue (MorphoManager inaccessible ou erreur serveur)
- **THEN** un message d'erreur explicite est affiché sans crasher l'interface
