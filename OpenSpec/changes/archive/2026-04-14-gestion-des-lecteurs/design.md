## Context

Le projet Cantine SEBN est à l'état initial (aucun code applicatif encore produit). Le service TCP doit accepter des connexions de lecteurs biométriques Morpho Sigma Lite+ et associer chaque trame entrante à un lecteur connu via son adresse IP source. Sans une table `Lecteurs` persistante, le service ne peut ni valider la source des trames ni alimenter les tickets avec la zone de pointage.

L'architecture cible est : `Cantine.Core` (entités/interfaces) → `Cantine.Infrastructure` (EF Core) → `Cantine.API` (controllers REST) → `cantine-web` (React/Ant Design).

## Goals / Non-Goals

**Goals:**
- Définir l'entité `Lecteur` dans `Cantine.Core` (id, nom, adresse IP, actif).
- Exposer un CRUD REST `/api/lecteurs` sécurisé par le rôle `AdminSEBN`.
- Fournir une page d'administration React permettant de gérer la liste des lecteurs.
- Permettre au `TcpListenerService` de résoudre un lecteur à partir de son adresse IP source.

**Non-Goals:**
- Supervision temps réel du statut de connexion des lecteurs (Phase 2).
- Association lecteur ↔ imprimante (Phase 2).
- Import depuis MorphoManager (Phase 2).

## Decisions

### D1 — Entité `Lecteur` dans `Cantine.Core`, sans dépendance EF

**Décision :** L'entité `Lecteur` (POCO) est définie dans `Cantine.Core/Entities/`. La configuration EF Core est dans `Cantine.Infrastructure/Data/Configurations/`.

**Pourquoi :** La règle de la couche Core interdit toute dépendance externe. EF Core annotations (`[Key]`, `[Required]`) ne sont pas utilisées — on préfère la Fluent API dans Infrastructure.

**Alternative rejetée :** Data Annotations directement sur l'entité — couplage Core/EF inacceptable.

---

### D2 — Interface `ILecteurRepository` dans Core, implémentation dans Infrastructure

**Décision :** `Cantine.Core/Interfaces/ILecteurRepository.cs` définit les opérations CRUD + `GetByIpAsync`. L'implémentation `LecteurRepository` est dans `Cantine.Infrastructure/Repositories/`.

**Pourquoi :** Respecte le principe d'inversion de dépendance. Le service TCP peut appeler `ILecteurRepository.GetByIpAsync` sans connaître EF Core.

---

### D3 — Controller sans logique métier, délégation à `LecteurService`

**Décision :** `LecteursController` dans `Cantine.API` délègue toutes les opérations à `ILecteurService` (défini dans Core). La validation des doublons d'IP est dans le service.

**Pourquoi :** Cohérence avec la règle "Les controllers ne contiennent aucune logique métier."

---

### D4 — Table React avec `Ant Design` + `TanStack Query`

**Décision :** La page `LecteursPage` utilise le composant `Table` d'Ant Design avec `useQuery` (TanStack Query) pour le chargement et `useMutation` pour les opérations CRUD. Un `Modal` Ant Design est utilisé pour le formulaire ajout/édition.

**Pourquoi :** Cohérence avec le stack défini. Pas de bibliothèque supplémentaire.

---

## Risks / Trade-offs

| Risque | Mitigation |
|--------|------------|
| Deux lecteurs configurés avec la même IP → conflit dans le service TCP | Contrainte d'unicité sur la colonne `AdresseIP` en BDD + validation dans `LecteurService` avant insert/update |
| Suppression d'un lecteur référencé dans des pointages futurs | Préférer la désactivation (`Actif = false`) à la suppression physique ; la suppression physique est autorisée uniquement si aucun pointage n'existe |
| Adresse IP saisie invalide côté frontend | Validation regex côté React + validation serveur dans le DTO |
