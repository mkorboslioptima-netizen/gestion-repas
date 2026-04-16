## ADDED Requirements

### Requirement: Imprimer un ticket ESC/POS via TCP port 9100
Le système SHALL envoyer les commandes ESC/POS au format binaire vers l'adresse IP de l'imprimante associée au lecteur sur le port TCP 9100, après chaque MealLog enregistré avec succès.

#### Scenario: Impression réussie
- **WHEN** un MealLog est persisté et l'imprimante du lecteur est joignable sur le port 9100
- **THEN** le ticket est imprimé avec le contenu défini et la connexion TCP est fermée

#### Scenario: Imprimante hors ligne
- **WHEN** la connexion TCP vers l'imprimante échoue (timeout ou refus)
- **THEN** l'erreur est loguée, le MealLog reste intact, le service continue sans planter

---

### Requirement: Contenu du ticket thermique Phase 1
Le ticket imprimé SHALL contenir dans l'ordre : en-tête "CANTINE SEBN", matricule et nom/prénom de l'employé, date et heure du pointage, type de repas ("PLAT CHAUD" ou "SANDWICH FROID"), numéro de ticket, et nom du lecteur (zone de pointage).

#### Scenario: Ticket plat chaud
- **WHEN** le type de repas est `PlatChaud`
- **THEN** le ticket affiche la ligne "PLAT CHAUD" en caractères larges (ESC/POS double largeur)

#### Scenario: Ticket sandwich
- **WHEN** le type de repas est `Sandwich`
- **THEN** le ticket affiche la ligne "SANDWICH FROID" en caractères larges

#### Scenario: Numéro de ticket séquentiel
- **WHEN** le ticket est imprimé
- **THEN** le numéro affiché correspond au `MealLog.TicketNumber` auto-incrémenté en base

---

### Requirement: Imprimante configurée par lecteur
Le système SHALL lire l'adresse IP de l'imprimante depuis la colonne `PrinterIP` du lecteur correspondant dans la table `Lecteurs`. Si `PrinterIP` est null ou vide, l'impression est ignorée avec un Warning.

#### Scenario: PrinterIP configurée
- **WHEN** le lecteur a une `PrinterIP` renseignée
- **THEN** le ticket est envoyé à cette adresse sur le port 9100

#### Scenario: PrinterIP non configurée
- **WHEN** le lecteur n'a pas de `PrinterIP`
- **THEN** l'impression est ignorée et un Warning est logué indiquant le lecteur concerné
