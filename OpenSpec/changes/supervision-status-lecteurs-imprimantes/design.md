## Context

La supervision a été partiellement implémentée dans `phase2-shifts-supervision` : `ISupervisionStore`, `SupervisionStore`, `SupervisionBackgroundService`, `SupervisionController`, `SupervisionPage`, colonne "Connexion" dans LecteursPage. Le problème actuel est architectural : le `SupervisionBackgroundService` n'est enregistré que dans `Cantine.TcpListener` (processus séparé), donc le `ISupervisionStore` Singleton de `Cantine.API` reste vide. Résultat : `GET /api/supervision/status` retourne toujours `[]`.

## Goals / Non-Goals

**Goals :**
- Peupler le store de l'API en y exécutant le background service de supervision.
- Tests ICMP + TCP pour les lecteurs, TCP-only pour les imprimantes.
- Statuts visibles en live dans LecteursPage via SSE (pas de polling).
- SupervisionPage fonctionnelle avec données réelles.

**Non-Goals :**
- Persister l'historique des connexions en BDD.
- Alertes email/SMS en cas de déconnexion.
- Supervision des autres serveurs de l'infrastructure.

## Decisions

### 1. SupervisionBackgroundService dans l'API, pas seulement dans TcpListener
**Choix :** Ajouter `builder.Services.AddHostedService<SupervisionBackgroundService>()` dans `Cantine.API/Program.cs`.
**Pourquoi :** L'API et le TcpListener sont deux processus distincts avec des Singletons distincts. Le store de l'API doit être peuplé par un service qui tourne dans l'API. Le TcpListener peut continuer à avoir son propre store (pour ses propres besoins futurs) ou l'on peut le retirer de TcpListener si inutile.
**Conséquence :** Le background service tourne en parallèle du listener TCP — consommation réseau légère (30 connexions TCP courtes toutes les 30 s par lecteur).

### 2. Ping ICMP via `System.Net.NetworkInformation.Ping` pour les lecteurs
**Choix :** Tenter d'abord un `Ping.SendPingAsync(ip, 1000)` avant le TCP connect.
**Pourquoi :** Distingue "réseau inaccessible" (ping KO) de "service Morpho arrêté mais machine en ligne" (ping OK, TCP KO). Donne plus de granularité pour le diagnostic.
**Fallback :** Si le ping est bloqué par le firewall (ICMP filtré), on tombe sur le TCP connect. Statut = Connecté si l'un ou l'autre réussit.

### 3. SSE dans LecteursPage pour mise à jour live
**Choix :** Ouvrir un `EventSource` sur `/api/supervision/stream` dans `LecteursPage` et fusionner les statuts reçus avec la liste locale.
**Pourquoi :** Évite le polling toutes les 30 s (qui génère des requêtes HTTP inutiles). Les changements d'état (connecté → déconnecté) sont poussés instantanément.
**Alternative écartée :** `refetchInterval: 30_000` sur `getSupervisionStatus()` — plus simple mais latence max de 30 s.

### 4. Fréquence : 30 secondes
**Choix :** `PeriodicTimer` de 30 secondes dans `SupervisionBackgroundService`.
**Pourquoi :** Compromis entre réactivité (détection rapide d'une panne) et charge réseau (évite de saturer le switch avec des connexions TCP permanentes). Un lecteur déconnecté est signalé en 30 s maximum.

## Architecture

```
[Cantine.API Process]
    │
    ├── SupervisionBackgroundService (IHostedService, toutes les 30s)
    │       ├── Ping ICMP lecteur → UpdateStatus("lecteur-{id}", ok)
    │       ├── TCP connect lecteur:11020 → UpdateStatus("lecteur-{id}", ok)
    │       └── TCP connect imprimante:9100 → UpdateStatus("imprimante-{id}", ok)
    │
    ├── ISupervisionStore (Singleton, peuplé par le service ci-dessus)
    │
    ├── GET /api/supervision/status → snapshot complet
    └── GET /api/supervision/stream → SSE, push si changement d'état
                │
                ▼
    [cantine-web]
        ├── LecteursPage : EventSource → badges live
        └── SupervisionPage : query + EventSource → grille live
```

## Open Questions

- Faut-il afficher le statut "ping OK mais TCP KO" comme un état intermédiaire (ex: badge orange "Réseau OK / Service arrêté") ou simplement "Déconnecté" ?
- Le port TCP du lecteur (11020) est-il toujours le même pour tous les lecteurs ou configurable par lecteur ?
