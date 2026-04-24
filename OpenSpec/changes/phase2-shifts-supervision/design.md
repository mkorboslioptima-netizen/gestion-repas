## Context

Le système est en Phase 1 entièrement opérationnel : TCP listener, ESC/POS, dashboard SSE, export Excel, gestion des lecteurs/imprimantes, import Morpho. La Phase 2 ajoute deux couches orthogonales : une logique temporelle (shifts) et une couche d'observabilité (supervision réseau).

L'entité `Lecteur` dispose déjà des colonnes `NomImprimante`, `PrinterIP`, `PortImprimante`. Le `MealEligibilityService` existant vérifie l'employé (connu, actif) et le quota (1 ou 2/jour). La vérification du shift s'insère après la vérification du quota.

## Goals / Non-Goals

**Goals :**
- Bloquer les pointages hors créneau horaire avec un motif lisible dans les logs.
- Permettre à l'admin de modifier les heures des shifts sans redéploiement.
- Afficher le shift actif dans le dashboard React.
- Détecter automatiquement les déconnexions de lecteurs et imprimantes.
- Pousser les changements d'état via SSE sans polling côté client.

**Non-Goals :**
- Attribution d'un type de repas (Plat/Sandwich) selon le shift — le bouton physique (E/S) reste la source de vérité.
- Gestion de shifts par employé ou par site — les shifts sont globaux en Phase 2.
- Alertes email ou SMS en cas de déconnexion.
- Historique des connexions/déconnexions en base de données.

## Decisions

### 1. `ShiftConfig` : entité BDD avec seed, pas de config YAML
**Choix :** Table SQL `ShiftConfigs` avec 4 lignes seedées via `HasData` EF Core.
**Pourquoi :** L'admin peut modifier les heures depuis l'UI sans redémarrer le service. Un fichier `appsettings.json` nécessiterait un redémarrage. Les shifts sont des données métier, pas de la configuration technique.
**Alternative écartée :** `appsettings.json` — immutabilité à chaud.

### 2. Vérification du shift dans `MealEligibilityService`, pas dans le TCP listener
**Choix :** Injecter `IShiftService` dans `MealEligibilityService` pour vérifier le shift au moment de la validation du pointage.
**Pourquoi :** Centralise toute la logique d'éligibilité dans un seul service. Le TCP listener reste un orchestrateur sans logique métier. Facilite les tests unitaires.
**Alternative écartée :** Vérification dans `MorphoListenerService` — violation de la séparation des responsabilités.

### 3. `SupervisionStore` en mémoire (Singleton), pas en BDD
**Choix :** `Dictionary<string, EquipmentStatus>` dans un Singleton `ISupervisionStore`, mis à jour par le `SupervisionBackgroundService`.
**Pourquoi :** Le statut de connexion est éphémère — sa valeur au redémarrage est toujours "inconnu" jusqu'au prochain check. Écrire en BDD toutes les 30 s créerait une charge inutile. La mémoire est la bonne couche pour un état transitoire.
**Conséquence :** Au démarrage de l'API, tous les statuts sont `Unknown` jusqu'au premier cycle du background service (max 30 s).

### 4. SSE supervision séparé du SSE dashboard
**Choix :** Endpoint distinct `GET /api/supervision/stream` qui pousse uniquement les changements d'état (état précédent ≠ état actuel).
**Pourquoi :** Le dashboard SSE existant (`/api/dashboard/stream`) pousse les repas en temps réel. Mélanger les deux types d'événements compliquerait le parsing côté client. Un `EventSource` séparé dans `SupervisionPage` est plus propre.
**Alternative écartée :** Endpoint SSE unique multi-canal — complexité du format d'événement.

### 5. Check TCP supervision : connexion courte (timeout 2 s), pas ICMP ping
**Choix :** `TcpClient.ConnectAsync(ip, port)` avec `CancellationToken` de 2 s pour les lecteurs (port configuré) et les imprimantes (port 9100).
**Pourquoi :** Les lecteurs Morpho répondent sur leur port TCP — une connexion TCP réussie garantit que le service est actif, pas juste le réseau. `Ping` ICMP peut être bloqué par les firewalls.
**Conséquence :** Un lecteur dont le port TCP est fermé (service arrêté) sera correctement signalé comme déconnecté même si le réseau est opérationnel.

## Architecture

```
[SupervisionBackgroundService] (TcpListener, toutes les 30 s)
    │  TcpClient.ConnectAsync(ip, port, 2s timeout)
    │  → met à jour ISupervisionStore (Singleton)
    │  → si changement d'état → notifie ISupervisionNotifier
    ▼
[ISupervisionStore]  (Singleton en mémoire)
    │
    ├── GET /api/supervision/status  → snapshot complet
    └── GET /api/supervision/stream  → SSE, push changements
```

```
[MealEligibilityService] (modifié)
    ├── employee.Actif ?
    ├── quota journalier ?
    └── IShiftService.GetCurrentShift(DateTime now) ?
            └── null → refus "Hors créneau horaire"
```

## Migration Plan

1. Créer `ShiftConfig.cs` + `ShiftConfiguration.cs` + migration `AddShiftConfigs` avec seed.
2. Mettre à jour `MealEligibilityService` — injecter `IShiftService`, ajouter vérification shift.
3. Déployer `ShiftsController` + enregistrement DI.
4. Déployer `SupervisionBackgroundService` + `ISupervisionStore` dans TcpListener.
5. Déployer `SupervisionController`.
6. Déployer le frontend (ShiftsPage, SupervisionPage, widget dashboard).

**Rollback :** Commenter la vérification du shift dans `MealEligibilityService` pour revenir au comportement Phase 1 sans migration inverse.

## Open Questions

- Le créneau Nuit (00h–04h) doit-il être désactivé par défaut (rare pour une cantine) ?
- Faut-il autoriser des shifts chevauchants (ex : pause entre 14h et 16h non couverte) — comportement attendu = refus entre 14h et 16h ?
- La supervision doit-elle afficher les imprimantes non configurées (PrinterIP null) ou les masquer ?
