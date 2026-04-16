## Why

Sans service TCP opérationnel, aucun pointage biométrique ne peut être capturé : les lecteurs Morpho Sigma Lite+ envoient leurs trames en continu sur le port 11020 mais rien ne les reçoit, les traite ni n'imprime les tickets. C'est le composant central du MVP sans lequel le système de cantine ne peut pas fonctionner.

## What Changes

- Implémentation du `MorphoFrameParser` dans `Cantine.Infrastructure/Tcp/` — extrait matricule, date/heure et type de repas (`I`=sandwich, `O`=plat chaud) depuis la trame `%<SERIAL><dd/MM/yy><HH:mm:ss><MATRICULE><I|O>?`.
- Implémentation du `MorphoListenerService` dans `Cantine.TcpListener/` — `BackgroundService` .NET 8 qui écoute sur le port 11020, accepte les connexions multi-lecteurs en parallèle, résout chaque lecteur par IP depuis la table `Lecteurs`.
- Vérification d'éligibilité : 1 repas par jour maximum (2 pour les gardiens — Phase 2), refus logué si quota atteint.
- Enregistrement du `MealLog` en base SQL Server à chaque pointage accepté.
- Impression automatique du ticket ESC/POS via TCP port 9100 (imprimante réseau).
- Ajout des entités `Employee` et `MealLog` dans `Cantine.Core` + migration EF Core correspondante.
- Enregistrement du service comme **Windows Service** (`UseWindowsService()`).

## Capabilities

### New Capabilities

- `morpho-frame-parsing` : Parsing des trames TCP Morpho Sigma Lite+ (format ASCII `%...?`, extraction matricule/date/bouton).
- `meal-eligibility` : Vérification du quota journalier de repas par employé (1/jour standard).
- `meal-logging` : Enregistrement d'un pointage accepté dans la table `MealLogs` avec matricule, lecteur, type repas, horodatage.
- `escpos-printing` : Impression du ticket thermique ESC/POS via connexion TCP directe sur le port 9100.

### Modified Capabilities

<!-- Aucune capability existante modifiée — lecteur-crud n'est pas impacté fonctionnellement. -->

## Impact

- **Cantine.Core :** Nouvelles entités `Employee`, `MealLog` ; nouvelles interfaces `IMorphoFrameParser`, `IEscPosService`, `IMealEligibilityService`.
- **Cantine.Infrastructure :** `MorphoFrameParser.cs`, `EscPosService.cs`, repositories `MealLogRepository`, `EmployeeRepository` ; migration `AddEmployeesAndMealLogs`.
- **Cantine.TcpListener :** `MorphoListenerService.cs` (BackgroundService) remplace le `Worker.cs` scaffoldé.
- **Cantine.API :** Aucun endpoint nouveau dans ce changement (les endpoints de consultation des MealLogs seront en Phase 2).
- **Base de données :** Nouvelles tables `Employees` et `MealLogs`.
- **Dépendances :** Aucune dépendance NuGet nouvelle (utilise `System.Net.Sockets` intégré).
