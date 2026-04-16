# Architecture Decisions — Cantine SEBN

Décisions architecturales importantes. Mis à jour par l'agent `architect-review`.

## Format
- **Décision :** ce qui a été décidé
- **Rationale :** pourquoi
- **Pattern établi :** réutilisable pour les futures features

---

## 2025-01-14 — Initialisation

- **Décision :** 4 projets C# séparés (Core/Infrastructure/TcpListener/API)
  - **Rationale :** Cantine.Core testable sans dépendances, chaque couche remplaçable
  - **Pattern :** Core = zéro dépendance externe. Toujours.

- **Décision :** SSE pour dashboard temps réel
  - **Rationale :** Flux unidirectionnel, natif ASP.NET Core, pas de librairie tierce React
  - **Pattern :** EventSource natif côté React, endpoint SSE dans DashboardController

- **Décision :** SQL Server Express 2022
  - **Rationale :** Gratuit, 10 GB max, estimation 100-150 MB/an pour 2000 employés
  - **Pattern :** Toute modification schéma = migration EF Core nommée explicitement

---

## 2026-04-15 — TCP Listener Service

- **Décision :** BackgroundService avec IServiceScopeFactory pour les services scoped
  - **Rationale :** Les services EF Core (DbContext, repositories) sont scoped, mais BackgroundService est singleton. On doit créer un scope par traitement de trame.
  - **Pattern :** Injecter `IServiceScopeFactory`, créer un scope dans la méthode de traitement, résoudre les services depuis le scope.

- **Décision :** Parser stateless + services stateless en singleton
  - **Rationale :** `MorphoFrameParser` et `EscPosService` n'ont pas d'état, peuvent être partagés entre threads.
  - **Pattern :** Les services sans état qui ne dépendent pas de DbContext peuvent être enregistrés en Singleton.

- **Décision :** Regex compilés pour le parsing des trames
  - **Rationale :** Performance améliorée pour le parsing répétitif des trames Morpho.
  - **Pattern :** Utiliser `RegexOptions.Compiled` pour les patterns utilisés fréquemment.
