## 1. Core — Migration et mise à jour des entités

- [x] 1.1 Ajouter `Actif bool` (default `true`) sur `Employee.cs`
- [x] 1.2 Mettre à jour `EmployeeConfiguration.cs` : colonne `Actif` avec valeur par défaut SQL `1`
- [x] 1.3 Générer la migration EF Core `AddEmployeeActif`
- [x] 1.4 Mettre à jour `ImportResultDto.cs` : ajouter le champ `Desactives int`
- [x] 1.5 Mettre à jour `IMorphoEmployeeImporter.cs` : signature `ImportAsync(string siteId, bool desactiverAbsents = false)`

## 2. Infrastructure — MorphoEmployeeImporter mis à jour

- [x] 2.1 Mettre à jour `MorphoEmployeeImporter.ImportAsync` pour accepter `desactiverAbsents`
- [x] 2.2 Implémenter la désactivation des absents : collecter les matricules Morpho, mettre `Actif = false` sur les employés du site absents de cette liste
- [x] 2.3 Bloquer la désactivation si la liste Morpho est vide (log WARNING + retour sans modifications)
- [x] 2.4 Ajouter le compteur `Desactives` dans `ImportResultDto`

## 3. Infrastructure — Service de synchronisation automatique

- [x] 3.1 Créer `Cantine.Infrastructure/MorphoManager/MorphoSyncService.cs` : itère tous les sites actifs ayant une `MorphoConfig` et appelle `ImportAsync(siteId, desactiverAbsents: true)`
- [x] 3.2 Logger début, fin, durée et résultat par site (format `[Sync Morpho] {SiteId} — importés: {I}, màj: {U}, désactivés: {D}, ignorés: {S} ({ms}ms)`)
- [x] 3.3 Créer l'interface `IMorphoSyncService` dans `Cantine.Core/Interfaces/`

## 4. TcpListener — Job planifié 6 heures

- [x] 4.1 Créer `Cantine.TcpListener/MorphoSyncBackgroundService.cs` implémentant `BackgroundService` avec `PeriodicTimer` de 6 heures
- [x] 4.2 Enregistrer `IMorphoSyncService` et `MorphoSyncBackgroundService` dans `Cantine.TcpListener/Program.cs`

## 5. Infrastructure — MealEligibilityService mis à jour

- [x] 5.1 Mettre à jour `MealEligibilityService` : vérifier `employee.Actif == true`, retourner `false` avec motif "Employé inactif" si désactivé

## 6. API — Endpoint de synchronisation manuelle

- [x] 6.1 Ajouter `POST /api/employes/sync-morpho` dans `EmployesController` : déclenche `IMorphoSyncService` en background, retourne `202 Accepted`
- [x] 6.2 Enregistrer `IMorphoSyncService → MorphoSyncService` (Scoped) dans `Cantine.API/Program.cs`

## 7. Frontend React — Bouton Synchroniser

- [x] 7.1 Ajouter `syncMorpho()` dans `cantine-web/src/api/employes.ts` (appel `POST /api/employes/sync-morpho`)
- [x] 7.2 Ajouter le bouton "Synchroniser" dans `EmployesPage.tsx` avec état loading et `notification` "Synchronisation lancée"
- [x] 7.3 Afficher le champ `desactives` dans le résumé post-import (notification success)

## 8. Vérification manuelle

- [x] 8.1 Vérifier que la migration `AddEmployeeActif` s'applique proprement (colonne `Actif = 1` pour tous les employés existants)
- [x] 8.2 Vérifier que le service TCP déclenche la synchro au démarrage puis toutes les 6 heures (logs)
- [x] 8.3 Vérifier qu'un employé désactivé ne peut plus pointer (refus "Employé inactif" dans les logs)
- [x] 8.4 Vérifier que le bouton "Synchroniser" retourne 202 et affiche la notification
- [x] 8.5 Vérifier que l'import manuel (`import-morpho`) ne désactive pas d'employés
