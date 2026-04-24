## Why

Actuellement, les imprimantes thermiques sont configurées via le champ `PrinterIP` dans la table `Lecteurs`, mais il n'existe aucune interface dédiée pour les gérer. L'administrateur ne peut pas visualiser d'un seul coup d'œil quelles imprimantes sont configurées, lesquelles sont joignables en réseau, ni modifier ou tester une connexion sans passer par l'édition du lecteur. De plus, le port TCP (9100) est codé en dur dans `EscPosService`, ce qui empêche toute configuration sans recompilation.

## What Changes

- Ajouter deux colonnes à la table `Lecteurs` : `NomImprimante` (nom affiché) et `PortImprimante` (port TCP, défaut 9100)
- Créer un controller `ImprimantesController` avec les endpoints :
  - `GET /api/imprimantes` — liste toutes les imprimantes (une par lecteur)
  - `PUT /api/imprimantes/{lecteurId}` — met à jour la config imprimante d'un lecteur
  - `POST /api/imprimantes/{lecteurId}/test` — teste la connexion TCP en temps réel
- Créer la page `/admin/imprimantes` dans le front-end React avec :
  - Tableau listant chaque lecteur avec son imprimante associée (nom, IP, port, statut)
  - Bouton **Configurer** pour modifier l'IP, le nom et le port
  - Bouton **Tester** pour vérifier la connexion TCP à l'imprimante
  - Badge de statut (Configurée / Non configurée / Hors ligne)
- Mettre à jour `EscPosService` pour utiliser `lecteur.PortImprimante` au lieu du port 9100 codé en dur
- Ajouter l'entrée "Imprimantes" dans le menu de navigation (AdminSEBN uniquement)

## Capabilities

### New Capabilities
- `imprimante-config-par-lecteur` : Chaque lecteur dispose d'une config imprimante (Nom, IP, Port) éditable depuis l'interface
- `imprimante-test-connexion` : Bouton "Tester" déclenche un test TCP depuis le serveur vers l'imprimante et retourne un résultat immédiat (succès / échec + message)
- `imprimantes-page` : Page dédiée `/admin/imprimantes` accessible aux AdminSEBN pour visualiser et gérer toutes les imprimantes

### Modified Capabilities
- `escpos-printing` : `EscPosService` utilise désormais `lecteur.PortImprimante` (configurable) au lieu du port 9100 fixe

## Impact

- **BDD** : Migration EF Core — ajout `NomImprimante` (nvarchar, nullable) et `PortImprimante` (int, défaut 9100) sur `Lecteurs`
- **Backend** : `Cantine.Core` — ajout champs sur `Lecteur`, nouveaux DTOs `ImprimanteDto` / `UpdateImprimanteDto` / `TestImprimanteResultDto`
- **Backend** : `Cantine.Infrastructure` — service `ImprimanteService` + mise à jour `EscPosService`
- **Backend** : `Cantine.API` — nouveau `ImprimantesController`
- **Frontend** : nouvelle page `ImprimantesPage.tsx`, nouveau fichier `src/api/imprimantes.ts`, mise à jour `App.tsx`
