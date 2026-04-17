## 1. Core — Interfaces et DTOs

- [x] 1.1 Créer `Cantine.Core/DTOs/ImportResultDto.cs` (`Importes`, `MisAJour`, `Ignores`)
- [x] 1.2 Créer `Cantine.Core/Interfaces/IMorphoEmployeeImporter.cs` (méthode `ImportAsync(string siteId) : Task<ImportResultDto>`)

## 2. Infrastructure — Connecteur MorphoManager

- [x] 2.1 Créer `Cantine.Infrastructure/MorphoManager/MorphoEmployeeImporter.cs` implémentant `IMorphoEmployeeImporter`
- [x] 2.2 Lire `MorphoConfig` depuis `CantineDbContext` par `siteId` — retourner une erreur explicite si absent
- [x] 2.3 Ouvrir une `SqlConnection` vers `MorphoConfig.ConnectionString` avec timeout `MorphoConfig.CommandTimeout`
- [x] 2.4 Exécuter la requête `MorphoConfig.Query` et itérer les résultats (colonnes : Matricule, Nom, Prenom)
- [x] 2.5 Implémenter la logique upsert : INSERT `(SiteId, Matricule, Nom, Prenom, MaxMealsPerDay=1)` si absent, UPDATE Nom/Prénom si présent, incrémenter compteurs

## 3. API — Endpoint import

- [x] 3.1 Créer `Cantine.API/Controllers/EmployesController.cs` avec `[Authorize(Roles = "AdminSEBN")]`
- [x] 3.2 Ajouter `POST /api/employes/import-morpho/{siteId}` qui appelle `IMorphoEmployeeImporter.ImportAsync(siteId)` et retourne `ImportResultDto`
- [x] 3.3 Retourner HTTP 400 avec message si `MorphoConfig` non trouvée pour le site
- [x] 3.4 Enregistrer `IMorphoEmployeeImporter` → `MorphoEmployeeImporter` (Scoped) dans `Cantine.API/Program.cs`

## 4. Frontend React — Page Employés

- [x] 4.1 Créer `cantine-web/src/api/employes.ts` avec la fonction `importDepuisMorpho(siteId: string)` (appel `POST /api/employes/import-morpho/{siteId}` via axios)
- [x] 4.2 Créer `cantine-web/src/pages/EmployesPage.tsx` avec le bouton "Importer depuis MorphoManager"
- [x] 4.3 Utiliser le `SiteContext` pour pré-sélectionner le site (AdminSEBN voit un sélecteur de site, AdminCantine a son site fixe)
- [x] 4.4 Afficher l'état de chargement (Ant Design `Button loading`) pendant l'appel API
- [x] 4.5 Afficher le résumé post-import avec `notification.success` (importés / mis à jour / ignorés)
- [x] 4.6 Afficher `notification.error` en cas d'échec avec message explicite (ex: "MorphoConfig non configurée pour ce site")
- [x] 4.7 Protéger la page avec `PrivateRoute` rôle `AdminSEBN` et ajouter la route `/employes` dans le router

## 5. Vérification manuelle

- [x] 5.1 Vérifier que `POST /api/employes/import-morpho/SEBN-TN01` retourne 403 sans token AdminSEBN
- [x] 5.2 Vérifier que l'endpoint retourne 400 si aucune MorphoConfig n'est configurée pour le site
- [x] 5.3 Vérifier l'import avec une base MorphoManager accessible — contrôler que les employés ont le bon SiteId
- [x] 5.4 Relancer l'import et vérifier que les employés existants sont mis à jour (Nom/Prénom) sans doublon
- [x] 5.5 Vérifier que l'UI affiche le résumé et le message d'erreur si MorphoManager est hors ligne
