## Context

Le ticket ESC/POS est généré dans `EscPosService.BuildTicket` (Infrastructure) et déclenché depuis `MorphoListenerService` (TcpListener) après chaque `MealLog` inséré. L'interface `IEscPosService` (Core) définit le contrat entre le service TCP et la couche impression.

Le repository `IMealLogRepository.GetCountTodayBySiteAsync` existe déjà et retourne le nombre de repas d'un employé sur un site pour une date donnée. Cette méthode suffit pour calculer le compteur `X / N` sans nouvelle dépendance.

Papier thermique : 58mm de large = **32 colonnes** en police standard, **16 colonnes** en mode double-largeur ESC/POS (`0x1D 0x21 0x11`).

## Goals / Non-Goals

**Goals:**
- Remplacer le contenu du ticket par le nouveau layout validé
- Ajouter le compteur de repas du jour (`X / N`) sur le ticket
- Raccourcir "SANDWICH FROID" en "SANDWICH" pour éviter le débordement double-largeur

**Non-Goals:**
- Modifier le ticket PDF (mode développement) au-delà du passage du paramètre
- Ajouter des logos graphiques ou images (hors capacité ESC/POS sans flash mémoire)
- Modifier la logique d'éligibilité ou d'enregistrement

## Decisions

### D1 — Ajout de `mealNumberToday` comme paramètre de `PrintTicketAsync`

**Choix** : Ajouter `int mealNumberToday` à la signature de `IEscPosService.PrintTicketAsync` (et ses implémentations). L'appelant (`MorphoListenerService`) calcule la valeur en appelant `GetCountTodayBySiteAsync` après l'insert.

**Alternatif écarté** : Injecter `IMealLogRepository` dans `EscPosService` pour qu'il récupère lui-même le compte — violerait la séparation Infrastructure/Infrastructure et créerait une dépendance circulaire potentielle entre services.

**Rationale** : L'appelant dispose déjà du scope et du `mealLogRepo` ; passer la valeur calculée est plus simple et testable.

---

### D2 — Utiliser `mealLog.SiteId` pour l'en-tête (pas de lookup Site)

**Choix** : Afficher directement `mealLog.SiteId` (ex. `SEBN-TN01`) dans l'en-tête du ticket, sans requête supplémentaire pour récupérer le nom long du site.

**Alternatif écarté** : Requête `SELECT Nom FROM Sites WHERE SiteId = ?` pour afficher le nom complet — latence supplémentaire à l'impression, complexification de la signature.

**Rationale** : Le `SiteId` est court, identifiable par les employés, et déjà disponible sans requête.

## Risks / Trade-offs

- **[Risque] Overflow 16 colonnes en double-largeur** → "SANDWICH" (8 chars × 2 = 16 px) tient exactement ; "PLAT CHAUD" (9 chars × 2 = 18 px) peut déborder sur certaines imprimantes 58mm. Mitigation : tester sur l'imprimante cible ; si besoin, passer en mode double-hauteur uniquement (`0x1D 0x21 0x01`).
- **[Trade-off] `mealNumberToday` peut valoir 0** si `GetCountTodayBySiteAsync` échoue — afficher `? / N` dans ce cas pour ne pas bloquer l'impression.
