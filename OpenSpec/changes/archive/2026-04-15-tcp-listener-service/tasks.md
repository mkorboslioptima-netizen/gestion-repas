## 1. Couche Core — Entités, Enums, Interfaces

- [x] 1.1 Créer `Cantine.Core/Enums/RepasType.cs` (`PlatChaud = 1`, `Sandwich = 2`)
- [x] 1.2 Créer `Cantine.Core/Entities/Employee.cs` (Matricule PK, Nom, Prenom, MaxMealsPerDay)
- [x] 1.3 Créer `Cantine.Core/Entities/MealLog.cs` (Id, Matricule FK, LecteurId FK, Timestamp, RepasType, TicketNumber)
- [x] 1.4 Créer `Cantine.Core/Interfaces/IMorphoFrameParser.cs` (méthode `ParseFrames(string raw) : IEnumerable<MorphoFrame>`)
- [x] 1.5 Créer `Cantine.Core/Interfaces/IEscPosService.cs` (méthode `PrintTicketAsync(MealLog, Employee, Lecteur)`)
- [x] 1.6 Créer `Cantine.Core/Interfaces/IMealEligibilityService.cs` (`IsEligibleAsync(string matricule, DateOnly date)`)
- [x] 1.7 Créer `Cantine.Core/Interfaces/IMealLogRepository.cs` (AddAsync, GetCountTodayAsync)
- [x] 1.8 Créer `Cantine.Core/Interfaces/IEmployeeRepository.cs` (GetByMatriculeAsync)
- [x] 1.9 Créer `Cantine.Core/DTOs/MorphoFrame.cs` (Matricule, Timestamp, RepasType, SerialNumber)

## 2. Couche Infrastructure — EF Core, Parser, ESC/POS

- [x] 2.1 Ajouter `PrinterIP` (nvarchar 45, nullable) à l'entité `Lecteur` et dans `LecteurConfiguration`
- [x] 2.2 Créer `EmployeeConfiguration.cs` et `MealLogConfiguration.cs` (Fluent API)
- [x] 2.3 Ajouter `DbSet<Employee>` et `DbSet<MealLog>` dans `CantineDbContext`
- [x] 2.4 Générer la migration `AddEmployeesAndMealLogs` (`dotnet ef migrations add AddEmployeesAndMealLogs`)
- [x] 2.5 Implémenter `Cantine.Infrastructure/Tcp/MorphoFrameParser.cs` (regex `%.*?\?`, extraction date/heure/matricule/bouton, accumulation buffer)
- [x] 2.6 Implémenter `Cantine.Infrastructure/Repositories/MealLogRepository.cs`
- [x] 2.7 Implémenter `Cantine.Infrastructure/Repositories/EmployeeRepository.cs`
- [x] 2.8 Implémenter `Cantine.Infrastructure/Printing/EscPosService.cs` (TcpClient port 9100, commandes ESC/POS : init, double largeur, contenu ticket, coupe papier)

## 3. Couche API — Services métier

- [x] 3.1 Implémenter `Cantine.API/Services/MealEligibilityService.cs` (vérifie quota journalier via `IMealLogRepository.GetCountTodayAsync`)
- [x] 3.2 Enregistrer `IEmployeeRepository`, `IMealLogRepository`, `IEscPosService`, `IMealEligibilityService` dans `Cantine.API/Program.cs`

## 4. Cantine.TcpListener — Windows Service

- [x] 4.1 Supprimer `Worker.cs` scaffoldé, créer `MorphoListenerService.cs` (`BackgroundService`)
- [x] 4.2 Implémenter la boucle principale : `TcpListener` port 11020, `AcceptTcpClientAsync`, `Task.Run(ProcessClientAsync)`
- [x] 4.3 Implémenter `ProcessClientAsync` : lecture buffer accumulé, appel parser, résolution lecteur par IP, appel éligibilité, insert MealLog, impression ticket
- [x] 4.4 Configurer `Cantine.TcpListener/Program.cs` avec `UseWindowsService()`, DI (`CantineDbContext`, repositories, services, parser)
- [x] 4.5 Ajouter la chaîne de connexion dans `Cantine.TcpListener/appsettings.json`

## 5. Validation et Tests Manuels

- [x] 5.1 Appliquer la migration (`dotnet ef database update`)
- [x] 5.2 Insérer un employé de test en base (`INSERT INTO Employees ...`)
- [x] 5.3 Lancer `Cantine.TcpListener` en mode console et faire pointer la pointeuse — vérifier le log
- [x] 5.4 Vérifier la création du `MealLog` dans SQL Server
- [x] 5.5 Vérifier l'impression du ticket sur l'imprimante (si disponible) ou confirmer l'erreur loguée proprement — en attente imprimante physique
- [x] 5.6 Tester le refus : faire pointer deux fois le même employé le même jour → second refus logué
