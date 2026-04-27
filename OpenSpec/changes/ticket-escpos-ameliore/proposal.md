## Why

Le ticket thermique actuel est fonctionnel mais manque de lisibilité : le nom du site n'est pas affiché, le type de repas "SANDWICH FROID" déborde en mode double-largeur sur 58mm, il n'y a aucune indication du quota consommé (1er ou 2ème repas), et l'absence de pied de page rend le ticket abrupt. L'employé qui reçoit ce ticket ne voit pas immédiatement quel site l'a émis.

## What Changes

- L'en-tête du ticket affiche uniquement le **nom du site** (`SiteId` du lecteur) — plus d'en-tête entreprise générique
- Le **nom et prénom** de l'employé passent en première ligne (valeur principale du ticket)
- Le type de repas est raccourci : `PLAT CHAUD` / `SANDWICH` (évite le débordement double-largeur)
- Ajout du **compteur de repas** du jour : `Repas : X / N ce jour` (X = repas actuel, N = quota max de l'employé)
- Ajout d'un pied de page : `Bon appetit !`
- Séparateurs `=` pour les sections principales, structure plus lisible

## Capabilities

### New Capabilities
- (aucune nouvelle capability — amélioration pure de l'existant)

### Modified Capabilities
- `escpos-printing` : Le contenu du ticket thermique est revu selon le nouveau design validé — en-tête site uniquement, compteur de repas, type raccourci, pied de page

## Impact

- **`Cantine.Core/Interfaces/IEscPosService.cs`** : ajout du paramètre `int mealNumberToday` à `PrintTicketAsync`
- **`Cantine.Infrastructure/Printing/EscPosService.cs`** : réécriture de `BuildTicket` avec le nouveau layout
- **`Cantine.Infrastructure/Printing/PdfTicketService.cs`** : ajout du paramètre passthrough (sans changement visuel PDF)
- **`Cantine.TcpListener/MorphoListenerService.cs`** : appel de `GetCountTodayBySiteAsync` après insert, passage du compte à `PrintTicketAsync`
- **Aucune migration BDD** requise
