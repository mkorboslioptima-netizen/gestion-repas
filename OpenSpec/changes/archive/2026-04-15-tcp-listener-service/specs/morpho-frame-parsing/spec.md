## ADDED Requirements

### Requirement: Parser une trame Morpho valide
Le système SHALL extraire matricule, date/heure et type de repas depuis une trame ASCII au format `%<SERIAL><dd/MM/yy><HH:mm:ss><MATRICULE><I|O>?`. Le code `I` MUST être mappé à `RepasType.Sandwich` (Type 2) et le code `O` à `RepasType.PlatChaud` (Type 1).

#### Scenario: Trame valide avec bouton O (plat chaud)
- **WHEN** le parser reçoit la chaîne `%1724SML000208914/04/26 13:50:551233O?`
- **THEN** il retourne matricule=`1233`, date=`2026-04-14 13:50:55`, type=`PlatChaud`

#### Scenario: Trame valide avec bouton I (sandwich)
- **WHEN** le parser reçoit la chaîne `%1724SML000208914/04/26 08:15:001233I?`
- **THEN** il retourne matricule=`1233`, date=`2026-04-14 08:15:00`, type=`Sandwich`

#### Scenario: Buffer contenant plusieurs trames
- **WHEN** le buffer TCP contient `%SN114/04/26 12:00:001111O?%SN114/04/26 12:00:052222I?`
- **THEN** le parser retourne deux résultats distincts

#### Scenario: Trame avec format date/heure invalide
- **WHEN** le parser reçoit une trame où la date ou l'heure ne correspond pas au format attendu
- **THEN** la trame est ignorée et un avertissement est logué

#### Scenario: Trame sans matricule numérique
- **WHEN** le parser reçoit une trame où la partie matricule ne contient aucun chiffre
- **THEN** la trame est ignorée et un avertissement est logué

---

### Requirement: Accumulation des données TCP fragmentées
Le système SHALL accumuler les octets TCP reçus dans un buffer jusqu'à détecter le délimiteur de fin `?`, afin de gérer les trames fragmentées sur plusieurs lectures réseau.

#### Scenario: Trame reçue en deux fragments
- **WHEN** le premier `ReadAsync` retourne `%SN114/04/26 12:00:001111O` et le second retourne `?`
- **THEN** le parser traite la trame complète après le second fragment

#### Scenario: Connexion fermée avant la fin de trame
- **WHEN** la connexion TCP est fermée avant que `?` soit reçu
- **THEN** le fragment incomplet est ignoré et l'incident est logué
