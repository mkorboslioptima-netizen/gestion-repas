## 1. Core — Mise à jour de l'interface

- [ ] 1.1 Ajouter le paramètre `int mealNumberToday` à `PrintTicketAsync` dans `Cantine.Core/Interfaces/IEscPosService.cs`

## 2. Infrastructure — Nouveau layout du ticket ESC/POS

- [ ] 2.1 Mettre à jour la signature de `EscPosService.PrintTicketAsync` pour accepter `int mealNumberToday`
- [ ] 2.2 Réécrire `EscPosService.BuildTicket` avec le nouveau layout : en-tête site, nom employé, zone, type court, compteur, pied de page
- [ ] 2.3 Mettre à jour `PdfTicketService.PrintTicketAsync` pour accepter `int mealNumberToday` (paramètre passthrough, sans changement visuel PDF)

## 3. TcpListener — Calcul et passage du compteur

- [ ] 3.1 Dans `MorphoListenerService.HandleFrameAsync`, appeler `mealLogRepo.GetCountTodayBySiteAsync` après l'insert du MealLog pour obtenir `mealNumberToday`
- [ ] 3.2 Passer `mealNumberToday` à l'appel `_escPosService.PrintTicketAsync`

## 4. Vérification

- [ ] 4.1 Compiler la solution et vérifier l'absence d'erreurs C#
- [ ] 4.2 Vérifier visuellement le layout du ticket en mode PDF (sortie dans le dossier temp)
