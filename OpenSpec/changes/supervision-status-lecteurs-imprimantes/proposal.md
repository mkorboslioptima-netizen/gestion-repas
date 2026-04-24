## Why

La page Lecteurs affiche les pointeuses sans aucune information sur leur état réseau réel. Un lecteur peut être marqué "Actif" en base alors que sa connexion TCP est coupée depuis des heures — l'opérateur ne le découvre qu'au moment où un employé signale que son passage n'est pas enregistré. Idem pour les imprimantes : si le port 9100 ne répond plus, les tickets ne s'impriment pas en silence.

Il faut un mécanisme automatique qui teste périodiquement la connectivité de chaque lecteur et de son imprimante associée, met à jour un statut visible dans la page Lecteurs, et pousse les changements d'état en temps réel vers l'interface.

## What Changes

### Tests de connectivité automatiques (toutes les 30 secondes)
- **`SupervisionBackgroundService`** ajouté comme `IHostedService` dans **`Cantine.API`** (pas seulement dans TcpListener) : il tourne dans le même processus que l'API et alimente le `ISupervisionStore` Singleton de l'API.
- Pour chaque lecteur actif :
  - **Ping ICMP** : vérifie si l'IP répond sur le réseau.
  - **TCP connect** sur le port du lecteur (11020) : vérifie si le service Morpho est actif.
  - Statut = `Connecté` si le ping OU le TCP répond, `Déconnecté` sinon.
- Pour chaque imprimante associée au lecteur (`PrinterIP` non null) :
  - **TCP connect** sur port 9100 : vérifie que l'imprimante accept des connexions.
  - Statut = `OK` / `Hors ligne`.

### Colonne statut dans la page Lecteurs
- Colonne **"Connexion"** dans `LecteursPage.tsx` : badge vert `Connecté` / rouge `Déconnecté` pour le lecteur.
- Sous la colonne imprimante : badge `Imprimante OK` / `Imprimante hors ligne`.
- Rafraîchissement automatique via SSE (`GET /api/supervision/stream`) — pas de polling côté frontend.

### Page Supervision fonctionnelle
- `GET /api/supervision/status` retourne maintenant des données réelles (store peuplé par le background service de l'API).
- La `SupervisionPage` affiche les statuts réels des équipements avec horodatage du dernier check.

## Capabilities

### New Capabilities
- `supervision-background-api` : `SupervisionBackgroundService` enregistré dans `Cantine.API` pour peupler le store Singleton de l'API.
- `ping-icmp-lecteur` : test ICMP avant TCP pour distinguer "réseau mort" de "service arrêté".

### Modified Capabilities
- `supervision-stream` : le SSE `/api/supervision/stream` pousse des données réelles (store non vide).
- `lecteur-status-column` : colonne "Connexion" dans LecteursPage affiche des statuts live issus du store.
- `supervision-dashboard` : SupervisionPage affiche des données réelles.

## Impact

- **Cantine.API/Program.cs** : enregistrer `SupervisionBackgroundService` comme `IHostedService`.
- **Cantine.Infrastructure/Services/SupervisionStore.cs** : déjà existant — aucun changement.
- **Cantine.TcpListener/SupervisionBackgroundService.cs** : déjà existant — réutilisé dans l'API.
- **cantine-web/src/pages/admin/LecteursPage.tsx** : utiliser EventSource sur `/api/supervision/stream` pour mise à jour live (remplace le polling toutes les 30s).
- **cantine-web/src/pages/admin/SupervisionPage.tsx** : déjà existant — fonctionne dès que l'API peuple le store.
- **Aucune migration BDD** — statuts en mémoire uniquement.
