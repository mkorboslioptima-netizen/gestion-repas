## Why

Le système doit recevoir des trames TCP depuis plusieurs lecteurs biométriques Morpho Sigma Lite+. Sans une configuration centralisée des lecteurs (Nom, adresse IP), il est impossible d'identifier la provenance d'un pointage ni d'associer un ticket thermique à la bonne zone de pointage. Cette fonctionnalité est le prérequis fondamental de toute la chaîne de traitement du MVP.

## What Changes

- Ajout d'une entité `Lecteur` en base de données (Nom, adresse IP, statut actif).
- Création d'un écran d'administration permettant de lister, ajouter, modifier et supprimer des lecteurs.
- Exposition d'une API REST CRUD pour la gestion des lecteurs (réservée au rôle `AdminSEBN`).
- Le service TCP utilise la liste des lecteurs configurés pour valider et router les trames entrantes.

## Capabilities

### New Capabilities

- `lecteur-crud` : Gestion CRUD des lecteurs biométriques (Nom, adresse IP, actif/inactif) via l'interface d'administration et l'API REST.

### Modified Capabilities

<!-- Aucune capability existante n'est modifiée — premier développement du projet. -->

## Impact

- **Base de données :** Nouvelle table `Lecteurs` (migration EF Core).
- **API :** Nouveaux endpoints `/api/lecteurs` (GET, POST, PUT, DELETE) — rôle `AdminSEBN` requis.
- **Frontend :** Nouvelle page `LecteursPage` dans l'espace d'administration.
- **Service TCP :** Le `TcpListenerService` devra résoudre l'identité du lecteur à partir de l'adresse IP source de la connexion.
- **Dépendances :** Aucune dépendance externe nouvelle.
