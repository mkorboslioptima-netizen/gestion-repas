## MODIFIED Requirements

### Requirement: Importer les employés depuis MorphoManager
Le système SHALL lire la liste des employés depuis la base SQL Server MorphoManager via une connexion directe et insérer ou mettre à jour les enregistrements correspondants dans la table `Employees` de CantineSEBN. L'import MUST être idempotent. Lorsque `desactiverAbsents = true`, les employés du site absents de la liste MorphoManager SHALL être désactivés (`Actif = false`).

#### Scenario: Import initial réussi
- **WHEN** l'AdminSEBN déclenche l'import et la base MorphoManager est accessible
- **THEN** le système insère tous les employés absents de CantineSEBN avec `MaxMealsPerDay = 1` et retourne le nombre d'employés importés

#### Scenario: Employé déjà existant
- **WHEN** un employé avec le même matricule existe déjà dans CantineSEBN
- **THEN** le système met à jour uniquement le Nom et le Prénom sans modifier `MaxMealsPerDay`

#### Scenario: Base MorphoManager inaccessible
- **WHEN** la connexion à MorphoManager échoue (serveur indisponible, timeout)
- **THEN** le système retourne une erreur explicite et n'effectue aucune modification dans CantineSEBN

#### Scenario: Désactivation des absents activée
- **WHEN** `desactiverAbsents = true` et un employé du site est absent de MorphoManager
- **THEN** le système met `Actif = false` sur cet employé et incrémente le compteur `Desactives`

#### Scenario: Désactivation bloquée si résultat vide
- **WHEN** `desactiverAbsents = true` mais la requête Morpho retourne 0 résultats
- **THEN** aucune désactivation n'est appliquée et un WARNING est loggué
