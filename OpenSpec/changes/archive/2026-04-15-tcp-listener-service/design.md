## Context

Le projet dispose d'un listener TCP existant (application console C#) qui parse les trames Morpho et les envoie à Horoquartz via SOAP. Ce code est récupéré et adapté :
- Port **11020** (hardcodé et confirmé par capture Wireshark)
- Format trame ASCII : `%<SERIAL><dd/MM/yy><HH:mm:ss><MATRICULE><I|O>?`
  - `I` = Entrée physique = **Sandwich froid** (Type 2)
  - `O` = Sortie physique = **Repas chaud** (Type 1)
- Connexion persistante avec Keep-Alive depuis le lecteur vers le serveur
- Un buffer peut contenir plusieurs trames (multi-match regex `%.*?\?`)

L'architecture cible est `BackgroundService` .NET 8 enregistré comme Windows Service, utilisant `ILecteurRepository` (déjà existant) pour résoudre le lecteur par IP.

## Goals / Non-Goals

**Goals:**
- Parser fidèlement les trames Morpho (code récupéré de `Listener.cs`).
- Accepter les connexions de N lecteurs en parallèle via `Task.Run`.
- Résoudre le lecteur source par adresse IP depuis la BDD.
- Vérifier le quota journalier (1 repas/jour) avant d'enregistrer.
- Persister le `MealLog` et imprimer le ticket ESC/POS.
- Fonctionner comme Windows Service avec redémarrage automatique.

**Non-Goals:**
- Attribution des repas par shift/horaire (Phase 2).
- Synchronisation MorphoManager (Phase 2).
- Supervision temps réel du statut de connexion (Phase 2).
- Quota 2 repas/jour pour les gardiens (Phase 2 — la colonne `MaxMealsPerDay` est prévue en BDD mais la logique reste 1/jour en Phase 1).

## Decisions

### D1 — Parser extrait dans `Cantine.Infrastructure`, pas dans `Cantine.TcpListener`

**Décision :** `MorphoFrameParser` est dans `Cantine.Infrastructure/Tcp/` et implémente `IMorphoFrameParser` (Core).

**Pourquoi :** Réutilisable par d'autres composants (tests, API de debug). Respecte la séparation des couches.

**Alternative rejetée :** Parser inline dans `MorphoListenerService` — non testable isolément.

---

### D2 — Un `TcpListener` central, une `Task` par client

**Décision :** `MorphoListenerService.ExecuteAsync()` boucle sur `AcceptTcpClientAsync()` et lance `Task.Run(() => ProcessClientAsync(...))` pour chaque connexion — identique au code existant.

**Pourquoi :** Simple, éprouvé, suffisant pour N lecteurs (< 20 en Phase 1). Pas besoin de Pipelines/Channels pour ce volume.

**Alternative rejetée :** `System.IO.Pipelines` — complexité inutile pour < 20 connexions.

---

### D3 — Résolution du lecteur par IP source (pas par N° série dans la trame)

**Décision :** L'IP source du `TcpClient` est utilisée pour retrouver le `Lecteur` via `ILecteurRepository.GetByIpAsync()`. Le N° série dans la trame est logué mais non utilisé pour la résolution.

**Pourquoi :** La table `Lecteurs` est gérée par IP (fonctionnalité déjà livrée). Le N° série est redondant et non configuré en BDD.

---

### D4 — Vérification d'éligibilité dans un service dédié `MealEligibilityService`

**Décision :** `IMealEligibilityService.IsEligibleAsync(matricule, date)` vérifie si le quota journalier est atteint. Implémenté dans `Cantine.API/Services/` et injecté dans `Cantine.TcpListener`.

**Pourquoi :** Logique métier isolée, testable, réutilisable par l'API future. Injectée via DI dans le service TCP.

---

### D5 — ESC/POS via TCP direct port 9100, `IEscPosService` dans Core

**Décision :** `EscPosService` dans `Cantine.Infrastructure/Printing/` ouvre un `TcpClient` vers `imprimanteIP:9100`, envoie les octets ESC/POS et ferme la connexion. Connexion non persistante (ouverte/fermée par ticket).

**Pourquoi :** Les imprimantes thermiques réseau (Epson, Bixolon) acceptent nativement le port 9100 (Jetdirect). Pas de driver Windows nécessaire.

**Contenu ticket Phase 1 :** En-tête CANTINE SEBN, Matricule + Nom + Prénom, Date/Heure, Type repas, N° ticket, Zone lecteur.

---

### D6 — `MealLog` avec numéro de ticket auto-incrémenté

**Décision :** Le `ticket_number` est un `int IDENTITY` SQL Server — pas de génération applicative.

**Pourquoi :** Garantit l'unicité et la séquentialité sans coordination entre instances.

---

## Risks / Trade-offs

| Risque | Mitigation |
|--------|------------|
| Trame incomplète dans le buffer (split TCP) | Accumuler les données jusqu'à trouver `?` — boucle de lecture avec StringBuilder |
| Lecteur IP inconnue → trame ignorée silencieusement | Logger l'IP inconnue avec niveau Warning |
| Imprimante hors ligne → ticket non imprimé | Logger l'erreur ESC/POS, le MealLog est déjà persisté — ticket re-imprimable manuellement |
| Doublon de pointage (appui double rapide) | Vérification quota dans la même transaction : si déjà 1 repas aujourd'hui → refus |
| Port 11020 déjà utilisé par l'ancien listener | Arrêter l'ancienne application console avant de démarrer le service |

## Migration Plan

1. Arrêter l'ancienne application console TCP (Horoquartz listener) sur le serveur.
2. Installer le Windows Service : `sc create CantineTcpService binPath= "..." start= auto`.
3. Appliquer la migration EF Core (`AddEmployeesAndMealLogs`).
4. Importer les employés depuis MorphoManager (script one-shot SQL ou import CSV).
5. Démarrer le service : `sc start CantineTcpService`.

## Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Modèle et IP des imprimantes thermiques ? | `EscPosService` — largeur ticket 58 ou 80 mm |
| 2 | Comment importer les employés initialement ? (CSV, SQL direct, MorphoManager) | Migration initiale des données |
| 3 | Le service TCP Horoquartz doit-il continuer de tourner en parallèle ? | Cohabitation sur le même port impossible — décision nécessaire |
