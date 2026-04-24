## Why

La page Lecteurs affiche les pointeuses sans aucune information sur leur imprimante associée. L'administrateur doit naviguer vers une page séparée (Imprimantes) pour gérer la configuration d'impression, ce qui crée une friction inutile. De plus, configurer manuellement l'adresse IP de chaque imprimante est fastidieux et source d'erreurs : il faut connaître les IPs à l'avance. Il n'existe aucun mécanisme pour découvrir automatiquement les imprimantes disponibles sur le réseau ou installées sur le serveur Windows.

## What Changes

### 1. Page Lecteurs enrichie avec imprimante liée
- Ajouter une colonne **Imprimante** dans le tableau des lecteurs : nom imprimante + IP + badge statut (Configurée / Non configurée)
- Dans le modal d'édition d'un lecteur, ajouter une section **Imprimante** avec 3 champs : Nom, IP, Port
- Mettre à jour `LecteurDto` et `UpdateLecteurDto` pour exposer `NomImprimante`, `PrinterIP`, `PortImprimante`

### 2. Synchronisation automatique entre les pages
- Quand une imprimante est modifiée depuis **ImprimantesPage**, invalider aussi le cache `lecteurs` → la page Lecteurs se rafraîchit automatiquement
- Quand un lecteur est modifié avec sa config imprimante, invalider aussi le cache `imprimantes` → la page Imprimantes est à jour

### 3. Auto-découverte des imprimantes (deux mécanismes combinés)
- Nouveau endpoint `POST /api/imprimantes/discover` qui :
  - **Source 1 — Imprimantes Windows** : interroge `Win32_TCPIPPrinterPort` via WMI pour lister les imprimantes réseau installées sur le serveur (nom + IP extraite du port TCP)
  - **Source 2 — Scan réseau port 9100** : scanne en parallèle le sous-réseau local détecté automatiquement (ex: 192.168.1.1-254) avec un timeout court (300 ms/IP), retourne les IPs qui répondent sur le port 9100
- Dans **ImprimantesPage**, bouton **"Découvrir"** qui appelle cet endpoint et affiche les résultats dans un drawer :
  - Liste des imprimantes découvertes avec source (Windows / Réseau)
  - Bouton **"Associer"** pour chaque résultat → sélection du lecteur cible dans un Select → appel `PUT /api/imprimantes/{lecteurId}`

## Capabilities

### New Capabilities
- `lecteur-imprimante-inline` : Colonne imprimante + champs d'édition directement dans la page Lecteurs
- `imprimante-autodiscovery` : Endpoint de découverte automatique combinant WMI Windows + scan réseau port 9100
- `imprimante-association-wizard` : Drawer de résultats discovery avec association one-click vers un lecteur

### Modified Capabilities
- `lecteur-crud` : `LecteurDto` + `UpdateLecteurDto` enrichis avec les champs imprimante ; `LecteurService.UpdateAsync` persiste aussi les champs imprimante
- `imprimante-config-par-lecteur` : Mutations dans ImprimantesPage invalident aussi `['lecteurs']` ; mutations Lecteurs invalident aussi `['imprimantes']`

## Impact

- **Backend** : `Cantine.Core` — `LecteurDto` + `UpdateLecteurDto` enrichis ; nouveau DTO `ImprimanteDiscoveredDto`
- **Backend** : `Cantine.Infrastructure` — `LecteurService.UpdateAsync` + `GetAllAsync` mappent les champs imprimante ; nouveau service `ImprimanteDiscoveryService`
- **Backend** : `Cantine.API` — `ImprimantesController` : ajout endpoint `POST /api/imprimantes/discover`
- **Frontend** : `LecteurFormModal.tsx` — section imprimante dans le formulaire
- **Frontend** : `LecteursPage.tsx` — colonne imprimante dans le tableau + invalidation cache `imprimantes`
- **Frontend** : `ImprimantesPage.tsx` — bouton Découvrir + drawer résultats + invalidation cache `lecteurs`
- **Aucune migration BDD** — les colonnes `NomImprimante` et `PortImprimante` existent déjà
