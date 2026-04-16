## ADDED Requirements

### Requirement: Enregistrer un MealLog pour chaque pointage accepté
Le système SHALL persister un enregistrement dans la table `MealLogs` pour chaque pointage éligible, contenant : matricule, ID du lecteur, horodatage, type de repas et numéro de ticket auto-généré.

#### Scenario: Enregistrement réussi
- **WHEN** un pointage est accepté (employé éligible, lecteur connu)
- **THEN** un `MealLog` est inséré avec les champs matricule, lecteurId, timestamp, mealType et un ticketNumber auto-incrémenté

#### Scenario: Enregistrement avec lecteur résolu par IP
- **WHEN** la trame provient de l'IP `192.168.1.76` et que la table `Lecteurs` contient un lecteur actif avec cette IP
- **THEN** le `MealLog.LecteurId` correspond à cet enregistrement

---

### Requirement: Résolution du lecteur source par adresse IP
Le système SHALL identifier le lecteur ayant émis la trame en recherchant son adresse IP source dans la table `Lecteurs` via `ILecteurRepository.GetByIpAsync`.

#### Scenario: IP reconnue
- **WHEN** une connexion TCP provient de `192.168.1.76` et qu'un lecteur actif est configuré avec cette IP
- **THEN** le lecteur correspondant est utilisé pour remplir `MealLog.LecteurId`

#### Scenario: IP inconnue — trame ignorée
- **WHEN** une connexion TCP provient d'une IP non enregistrée dans la table `Lecteurs`
- **THEN** toutes les trames de cette connexion sont ignorées et l'IP inconnue est loguée en Warning

---

### Requirement: Atomicité de l'enregistrement et de l'impression
Le système SHALL persister le `MealLog` avant de lancer l'impression du ticket. Un échec d'impression ne MUST PAS annuler le `MealLog` déjà enregistré.

#### Scenario: Impression échoue après enregistrement
- **WHEN** le `MealLog` est persisté avec succès mais l'imprimante est hors ligne
- **THEN** le MealLog reste en base, l'erreur d'impression est loguée, et le service continue
