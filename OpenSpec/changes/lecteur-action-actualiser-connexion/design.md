## Context

`SupervisionBackgroundService` contient une méthode statique privée `CheckConnectivityAsync` qui combine ping ICMP et TCP connect. Pour exposer ce comportement via un endpoint HTTP, on ne peut pas l'appeler directement depuis un controller — le service est un `IHostedService` sans interface publique métier. La solution est d'extraire la logique de connectivité dans un service dédié injectable.

## Goals / Non-Goals

**Goals :**
- Bouton "Actualiser" par lecteur → test immédiat ICMP+TCP → résultat visible en < 5s.
- Endpoint `POST /api/supervision/check/{lecteurId}` sécurisé (JWT, rôle admin ou gestionnaire).
- Refactoring : `CheckConnectivityAsync` centralisée dans `SupervisionChecker`, utilisée par le background service ET le controller.

**Non-Goals :**
- Historique des checks manuels.
- Test de connectivité en masse (tous les lecteurs d'un coup via l'UI).
- Notification push en cas d'échec du check manuel.

## Decisions

### 1. Extraire `CheckConnectivityAsync` dans `SupervisionChecker`
**Choix :** Créer `ISupervisionChecker` avec `CheckLecteurAsync(int lecteurId, CancellationToken ct)`.
**Pourquoi :** Le controller ne peut pas instancier le `BackgroundService`. En extrayant la logique dans un service Scoped injectable, on évite la duplication et on garde un seul endroit pour modifier les timeouts ou la stratégie de ping.
**Conséquence :** `SupervisionBackgroundService` injecte `ISupervisionChecker` via `IServiceScopeFactory` (déjà utilisé pour le scope DB).

### 2. Retour de l'endpoint : statuts lecteur + imprimante
**Choix :** Retourner `{ lecteur: EquipmentStatusDto, imprimante: EquipmentStatusDto? }`.
**Pourquoi :** Le frontend a besoin des deux pour mettre à jour les deux badges sans attendre le SSE. La réponse est petite (< 200 octets).

### 3. Loading state par ligne dans LecteursPage
**Choix :** `useState<Set<number>>` pour tracker les lecteurs dont le check est en cours.
**Pourquoi :** Chaque lecteur a son propre bouton — le loading doit être isolé par ligne.

### 4. Mise à jour locale immédiate sans attendre SSE
**Choix :** Après la réponse HTTP, mettre à jour `supervisionStatuses` directement avec les DTOs reçus.
**Pourquoi :** Le SSE pousse uniquement les changements d'état (via `OnStatusChanged`). Si le statut ne change pas (lecteur déjà "connecté" et toujours connecté), SSE ne pushera rien. Il faut donc mettre à jour l'état local dans tous les cas pour confirmer le résultat du check manuel.

## Architecture

```
[LecteursPage] → clic "Actualiser" (lecteur #3)
    │
    ▼
POST /api/supervision/check/3  (JWT Bearer)
    │
    ├── SupervisionController
    │       └── ISupervisionChecker.CheckLecteurAsync(3, ct)
    │               ├── DB: charger Lecteur #3
    │               ├── CheckConnectivityAsync(adresseIP, 11020) → bool
    │               ├── ISupervisionStore.UpdateStatus("lecteur-3", ok)
    │               ├── CheckConnectivityAsync(printerIP, port) → bool  [si imprimante]
    │               └── ISupervisionStore.UpdateStatus("imprimante-3", ok)  [si imprimante]
    │
    ▼
Response: { lecteur: EquipmentStatusDto, imprimante?: EquipmentStatusDto }
    │
    ▼
[LecteursPage] → setSupervisionStatuses(merge avec réponse) → badges mis à jour
```
