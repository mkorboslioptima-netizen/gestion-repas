## Why

En Phase 1, le système accepte tout pointage sans contrainte horaire : un employé peut théoriquement obtenir un repas à n'importe quelle heure de la journée. La Phase 2 introduit un **moteur de shifts** qui découpe la journée en créneaux de repas (Matin, Administration, Après-midi, Nuit) et valide chaque pointage selon l'heure réelle. Sans ce moteur, il est impossible de contrôler les quotas par créneau ni d'autoriser les gardiens à bénéficier de deux repas sur deux shifts distincts.

Par ailleurs, l'administrateur n'a actuellement aucune visibilité sur la connectivité des lecteurs et imprimantes. En cas de panne réseau ou de déconnexion d'une pointeuse, le problème n'est détecté qu'une fois qu'un employé signale que son passage n'a pas été enregistré. La **supervision en temps réel** comble ce manque : le dashboard affiche immédiatement l'état de chaque équipement.

## What Changes

### Moteur de Shifts
- Nouvelle entité **`ShiftConfig`** en base : nom, heure début, heure fin, actif (bool). Quatre shifts par défaut seedés : Matin (08:00–12:00), Administration (12:00–14:00), Après-midi (16:00–21:00), Nuit (00:00–04:00).
- **`MealEligibilityService`** mis à jour : vérifier si l'heure du pointage tombe dans un shift actif. Si aucun shift actif → refus avec motif `"Hors créneau horaire"`.
- Endpoint **`GET /api/shifts`** : liste tous les shifts avec leur statut actuel (actif/inactif + "en cours" si l'heure actuelle est dans le créneau).
- Endpoint **`PUT /api/shifts/{id}`** : mise à jour des heures et de l'état d'un shift (admin seulement).
- Nouveau endpoint **`GET /api/shifts/current`** : retourne le shift en cours (ou null si hors créneau).
- **Page Shifts** dans l'interface admin : tableau listant les 4 shifts avec édition inline des heures et toggle actif/inactif.
- **Dashboard** : badge "Shift en cours" affiché dans l'en-tête (ex : "🕐 Matin — 08:00–12:00").

### Supervision des connexions
- **`SupervisionService`** (BackgroundService dans `Cantine.TcpListener`) : toutes les 30 secondes, tente une connexion TCP courte (timeout 2 s) vers chaque lecteur actif et chaque imprimante configurée sur le port 9100.
- **Table `ConnectionStatus`** en mémoire (dictionnaire dans DI Singleton) : stocke l'état actuel (connecté/déconnecté) et le timestamp du dernier check pour chaque équipement.
- Endpoint **`GET /api/supervision/status`** : retourne l'état de tous les lecteurs + imprimantes.
- Endpoint SSE **`GET /api/supervision/stream`** : push en temps réel les changements d'état (changement connecté ↔ déconnecté uniquement, pas de polling).
- **Page Supervision** dans le dashboard admin : grille de cards lecteurs (vert = connecté, rouge = déconnecté, badge "Imprimante OK/KO" en sous-titre).
- **Page Lecteurs** : colonne "Connexion" avec badge vert/rouge dynamique.

## Capabilities

### New Capabilities
- `shift-engine` : validation horaire des pointages selon les créneaux configurés, avec motif de refus explicite.
- `shift-crud` : lecture et modification des shifts via API REST (admin uniquement).
- `shift-current` : endpoint et widget dashboard indiquant le shift actif en ce moment.
- `supervision-polling` : background service vérifiant toutes les 30 s la connectivité TCP des lecteurs et imprimantes.
- `supervision-stream` : SSE push des changements d'état des équipements vers le frontend.
- `supervision-dashboard` : page de supervision visuelle avec grille de statuts en temps réel.

### Modified Capabilities
- `meal-eligibility` : ajout de la vérification du shift horaire dans `MealEligibilityService`.
- `dashboard-sse` : le stream SSE du dashboard existant est étendu pour inclure les changements de statut d'équipement.
- `lecteur-crud` : colonne "Connexion" ajoutée dans `LecteursPage`.

## Impact

- **Cantine.Core** : nouvelle entité `ShiftConfig`, nouveau DTO `ShiftDto`, `CurrentShiftDto`, `SupervisionStatusDto` ; mise à jour `IMealEligibilityService` pour injecter l'heure courante.
- **Cantine.Infrastructure** : `ShiftConfiguration.cs` (EF), migration `AddShiftConfigs`, seed des 4 shifts par défaut ; mise à jour `MealEligibilityService`.
- **Cantine.TcpListener** : nouveau `SupervisionBackgroundService` avec singleton `ISupervisionStore`.
- **Cantine.API** : `ShiftsController` (GET list, GET current, PUT update) ; `SupervisionController` (GET status, GET stream SSE).
- **cantine-web** : nouvelle page `ShiftsPage.tsx`, nouvelle page `SupervisionPage.tsx`, widget shift dans `DashboardPage`, colonne connexion dans `LecteursPage`.
- **BDD** : une migration EF Core (`AddShiftConfigs`), seed de 4 lignes dans `ShiftConfigs`.
- **Aucune nouvelle dépendance NuGet** — `System.Net.Sockets` déjà disponible.
