# Review Architecturale - TCP Listener Service
**Date :** 2026-04-15
**Statut :** APPROUVE AVEC NOTES

## Resume
Implementation d'un service Windows TCP pour recevoir les trames des lecteurs biometriques Morpho Sigma Lite+. Le service ecoute sur le port 11020, parse les trames, verifie l'eligibilite des employes, enregistre les repas et imprime les tickets via ESC/POS.

## Analyse par couche
| Couche | Fichiers modifies | Verdict |
|--------|------------------|---------|
| Cantine.Core | Enums/RepasType.cs, Entities/Employee.cs, Entities/MealLog.cs, Entities/Lecteur.cs, DTOs/MorphoFrame.cs, DTOs/LecteurDto.cs, Interfaces/IMorphoFrameParser.cs, IEscPosService.cs, IMealEligibilityService.cs, IMealLogRepository.cs, IEmployeeRepository.cs, ILecteurRepository.cs, ILecteurService.cs | OK |
| Cantine.Infrastructure | Tcp/MorphoFrameParser.cs, Repositories/*.cs, Printing/EscPosService.cs, Services/MealEligibilityService.cs, Data/CantineDbContext.cs, Data/Configurations/*.cs | OK |
| Cantine.API | Program.cs, Controllers/LecteursController.cs, Services/LecteurService.cs | OK |
| Cantine.TcpListener | MorphoListenerService.cs, Program.cs, appsettings.json | NOTES |

## Violations critiques (bloquer le merge)
Aucune violation critique de l'architecture.

## Avertissements (corriger prochainement)

### 1. SECURITE - Credentials exposes dans appsettings.json
**Fichiers:** `Cantine.TcpListener/appsettings.json`, `Cantine.API/appsettings.json`

Les fichiers contiennent des credentials en clair:
- Connection string avec mot de passe SA: `Password=Gta@optima11*`
- JWT secret placeholder: `CHANGE_ME_SECRET_KEY_32_CHARS_MIN`

**Recommandation:** Utiliser les User Secrets en developpement et les variables d'environnement/Azure Key Vault en production. Ajouter ces fichiers au `.gitignore` ou utiliser `appsettings.Development.json`.

### 2. SECURITE - Endpoint admin sans autorisation
**Fichier:** `Cantine.API/Controllers/LecteursController.cs` (ligne 10)

```csharp
[AllowAnonymous] // TODO: remettre [Authorize(Roles = "AdminSEBN")] avant la mise en production
```

Le TODO est present mais le controller est actuellement ouvert a tous.

**Recommandation:** Activer `[Authorize(Roles = "AdminSEBN")]` des que l'authentification est configuree.

### 3. TCP - Port hardcode
**Fichier:** `Cantine.TcpListener/MorphoListenerService.cs` (ligne 15)

```csharp
private const int TcpPort = 11020;
```

Le port devrait etre configurable via appsettings.json.

### 4. ARCHITECTURE - MealEligibilityService mal place
**Fichier:** `Cantine.Infrastructure/Services/MealEligibilityService.cs`

Ce service contient de la logique metier (verification quota) et devrait etre dans `Cantine.API/Services/` pour respecter la separation:
- Infrastructure = implementations techniques (DB, TCP, printing)
- API = services metier

### 5. TCP - Taille buffer non limitee
**Fichier:** `Cantine.TcpListener/MorphoListenerService.cs` (ligne 67)

```csharp
var buffer = new StringBuilder();
```

Le StringBuilder accumule indefiniment si les trames ne contiennent jamais de terminateur. Risque de memory exhaustion sur flux malveillant.

**Recommandation:** Ajouter une limite (ex: 64KB max) et reset si depassee.

## Bonnes pratiques observees

1. **Separation des couches respectee** - Cantine.Core n'a aucune dependance externe (verifie dans .csproj)

2. **Interfaces pour toute DI** - Tous les services utilisent des interfaces definies dans Core

3. **AsNoTracking() systematique** - Utilise sur toutes les requetes en lecture seule dans les repositories

4. **Scoped services via IServiceScopeFactory** - Le BackgroundService cree correctement des scopes pour les services EF Core

5. **async/await partout** - Toutes les operations I/O sont asynchrones

6. **Validation des trames** - MorphoFrameParser valide le format avant de retourner les frames

7. **Logging structure** - Utilisation correcte de ILogger avec placeholders nommes

8. **Echec impression non bloquant** - EscPosService capture les exceptions sans bloquer le flux principal

## Pattern a documenter

### Pattern: BackgroundService avec services scoped
Pour utiliser des services EF Core (scoped) dans un BackgroundService (singleton):
1. Injecter `IServiceScopeFactory`
2. Creer un scope dans la methode de traitement
3. Resoudre les services scoped depuis le scope

Exemple etabli dans `MorphoListenerService.HandleFrameAsync()`.
