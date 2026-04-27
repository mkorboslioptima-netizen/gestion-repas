## MODIFIED Requirements

### Requirement: Contenu du ticket thermique Phase 1
Le ticket imprimé SHALL contenir dans l'ordre : en-tête avec uniquement le `SiteId` du lecteur, nom et prénom de l'employé, matricule, date et heure du pointage, nom du lecteur (poste), type de repas en caractères larges (`PLAT CHAUD` ou `SANDWICH`), compteur de repas du jour (`X / N ce jour` où X est le repas actuel et N le quota max de l'employé), numéro de ticket, et pied de page `Bon appetit !`. Le type de repas `Sandwich` SHALL être affiché comme `SANDWICH` (sans "FROID") pour tenir dans la largeur double ESC/POS.

#### Scenario: Ticket plat chaud
- **WHEN** le type de repas est `PlatChaud`
- **THEN** le ticket affiche `PLAT CHAUD` en mode double hauteur+largeur ESC/POS

#### Scenario: Ticket sandwich
- **WHEN** le type de repas est `Sandwich`
- **THEN** le ticket affiche `SANDWICH` (sans "FROID") en mode double hauteur+largeur ESC/POS

#### Scenario: Compteur de repas affiché
- **WHEN** le ticket est imprimé et l'employé a `MaxMealsPerDay = 1` et c'est son 1er repas
- **THEN** le ticket affiche `Repas  : 1 / 1  ce jour`

#### Scenario: Compteur de repas gardien
- **WHEN** le ticket est imprimé et l'employé a `MaxMealsPerDay = 2` et c'est son 2ème repas
- **THEN** le ticket affiche `Repas  : 2 / 2  ce jour`

#### Scenario: En-tête site uniquement
- **WHEN** le ticket est imprimé
- **THEN** l'en-tête contient uniquement le `SiteId` du lecteur (ex. `SEBN-TN01`), sans nom d'entreprise générique

#### Scenario: Pied de page présent
- **WHEN** le ticket est imprimé
- **THEN** le ticket se termine par la ligne `Bon appetit !` centrée avant la coupe papier
