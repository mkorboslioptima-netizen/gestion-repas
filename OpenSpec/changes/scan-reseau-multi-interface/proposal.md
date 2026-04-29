## Why

La fonction de découverte automatique des imprimantes (`POST /api/imprimantes/discover`) ne scanne actuellement qu'un seul sous-réseau /24, celui de la **première** carte réseau active détectée (`FirstOrDefault`). Dans un environnement de domaine Windows avec plusieurs cartes réseau (ex: réseau de gestion, réseau de production, Wi-Fi, VPN), toutes les imprimantes situées sur les autres sous-réseaux sont invisibles. L'administrateur doit les configurer manuellement, ce qui est source d'erreurs et de perte de temps.

## What Changes

### 1. Scan multi-interfaces côté backend
- `ImprimanteDiscoveryService.ScanNetworkAsync()` itère désormais sur **toutes** les cartes réseau actives (non-loopback, IPv4)
- Chaque interface contribue ses préfixes /24 — les doublons sont dédupliqués
- Tous les sous-réseaux sont scannés **en parallèle** (port 9100 ESC/POS + port 515 LPD + port 631 IPP)
- Le timeout par IP reste court (300 ms) ; le scan global est limité à 30 secondes
- La réponse enrichit chaque résultat avec le champ `sousReseau` (ex: `"192.168.10.x"`) pour indiquer l'origine

### 2. Feedback de progression côté frontend
- Avant le lancement du scan, l'API retourne dans le header `X-Scan-Subnets` le nombre de sous-réseaux détectés
- Le bouton **Découvrir** affiche un spinner avec le texte `"Scan en cours... (N sous-réseau(x))"` pendant l'opération
- Le drawer de résultats indique combien de sous-réseaux ont été couverts et les ports détectés par imprimante

### 3. Enrichissement du DTO découverte
- `ImprimanteDiscoveredDto` : ajout du champ `sousReseau` (string) et `port` (int) pour identifier sur quel sous-réseau et quel port l'imprimante a répondu

## Capabilities

### Modified Capabilities
- `imprimante-autodiscovery` : scan étendu à toutes les interfaces réseau actives + ports 9100/515/631 + déduplication + timeout global 30 s

### New Capabilities
- `scan-progress-header` : header `X-Scan-Subnets` renvoyé par l'endpoint discover pour informer le frontend du périmètre du scan avant résultats

## Impact

- **Backend** : `Cantine.Core/DTOs/ImprimanteDiscoveredDto.cs` — ajout champs `SousReseau` et `Port`
- **Backend** : `Cantine.Infrastructure/Services/ImprimanteDiscoveryService.cs` — refactoring `ScanNetworkAsync` pour parcourir toutes les NICs
- **Backend** : `Cantine.API/Controllers/ImprimantesController.cs` — ajout header `X-Scan-Subnets` dans la réponse `Discover`
- **Frontend** : `ImprimantesPage.tsx` — affichage du nombre de sous-réseaux + port détecté dans le drawer
- **Aucune migration BDD** — changement purement service/UI
