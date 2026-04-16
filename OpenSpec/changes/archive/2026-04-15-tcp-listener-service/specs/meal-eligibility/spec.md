## ADDED Requirements

### Requirement: Vérifier le quota journalier d'un employé
Le système SHALL refuser un pointage si l'employé a déjà atteint son quota de repas pour la journée en cours. En Phase 1, le quota standard est de 1 repas par jour pour tous les employés.

#### Scenario: Premier repas de la journée — accepté
- **WHEN** un employé avec matricule `1233` n'a aucun MealLog pour la date du jour
- **THEN** le système retourne `éligible = true`

#### Scenario: Quota atteint — refusé
- **WHEN** un employé avec matricule `1233` a déjà 1 MealLog pour la date du jour
- **THEN** le système retourne `éligible = false` et logue un refus avec le motif "Quota journalier atteint"

#### Scenario: Employé inconnu — refusé
- **WHEN** le matricule reçu dans la trame n'existe pas dans la table `Employees`
- **THEN** le système retourne `éligible = false` et logue un refus avec le motif "Employé inconnu"

---

### Requirement: Refus logué sans interruption du service
Le système SHALL enregistrer chaque refus (quota atteint, employé inconnu) dans les logs applicatifs sans lever d'exception et sans interrompre le traitement des trames suivantes.

#### Scenario: Refus suivi d'un pointage valide
- **WHEN** une trame est refusée pour quota atteint, puis une trame d'un autre employé est reçue
- **THEN** la seconde trame est traitée normalement
