## ADDED Requirements

### Requirement: Lister les lecteurs configurés
Le système SHALL exposer un endpoint `GET /api/lecteurs` retournant la liste complète des lecteurs enregistrés (id, nom, adresseIP, actif). Cet endpoint est accessible uniquement au rôle `AdminSEBN`.

#### Scenario: Récupération de la liste
- **WHEN** un utilisateur `AdminSEBN` envoie `GET /api/lecteurs`
- **THEN** le système retourne HTTP 200 avec un tableau JSON de tous les lecteurs

#### Scenario: Accès refusé sans rôle AdminSEBN
- **WHEN** un utilisateur sans rôle `AdminSEBN` envoie `GET /api/lecteurs`
- **THEN** le système retourne HTTP 403

---

### Requirement: Ajouter un lecteur
Le système SHALL permettre la création d'un lecteur via `POST /api/lecteurs` avec les champs Nom (obligatoire) et AdresseIP (obligatoire, format IPv4 valide). L'adresse IP MUST être unique dans le système. L'endpoint est réservé au rôle `AdminSEBN`.

#### Scenario: Création réussie
- **WHEN** un `AdminSEBN` envoie `POST /api/lecteurs` avec un nom et une IP valide non existante
- **THEN** le système persiste le lecteur (actif par défaut) et retourne HTTP 201 avec l'objet créé

#### Scenario: IP déjà utilisée
- **WHEN** un `AdminSEBN` envoie `POST /api/lecteurs` avec une IP déjà enregistrée
- **THEN** le système retourne HTTP 409 avec un message d'erreur explicite

#### Scenario: Format IP invalide
- **WHEN** un `AdminSEBN` envoie `POST /api/lecteurs` avec une adresse IP non conforme au format IPv4
- **THEN** le système retourne HTTP 400 avec les détails de validation

---

### Requirement: Modifier un lecteur
Le système SHALL permettre la mise à jour du Nom, de l'AdresseIP et du statut Actif d'un lecteur existant via `PUT /api/lecteurs/{id}`. L'unicité de l'IP MUST être vérifiée en excluant le lecteur en cours de modification.

#### Scenario: Modification réussie
- **WHEN** un `AdminSEBN` envoie `PUT /api/lecteurs/{id}` avec des données valides
- **THEN** le système met à jour le lecteur et retourne HTTP 200 avec l'objet mis à jour

#### Scenario: Lecteur introuvable
- **WHEN** un `AdminSEBN` envoie `PUT /api/lecteurs/{id}` avec un id inexistant
- **THEN** le système retourne HTTP 404

---

### Requirement: Supprimer un lecteur
Le système SHALL permettre la suppression physique d'un lecteur via `DELETE /api/lecteurs/{id}`, uniquement si aucun pointage ne référence ce lecteur. Sinon, la désactivation (`Actif = false`) est la seule option possible.

#### Scenario: Suppression réussie (aucun pointage lié)
- **WHEN** un `AdminSEBN` envoie `DELETE /api/lecteurs/{id}` et le lecteur n'a aucun pointage associé
- **THEN** le système supprime le lecteur et retourne HTTP 204

#### Scenario: Suppression bloquée (pointages existants)
- **WHEN** un `AdminSEBN` envoie `DELETE /api/lecteurs/{id}` et le lecteur a des pointages associés
- **THEN** le système retourne HTTP 409 avec un message indiquant d'utiliser la désactivation

---

### Requirement: Résolution d'un lecteur par adresse IP
Le système SHALL permettre au service TCP de retrouver un lecteur actif à partir de son adresse IP source via `ILecteurRepository.GetByIpAsync(string ip)`.

#### Scenario: IP reconnue et lecteur actif
- **WHEN** le service TCP reçoit une connexion depuis une IP enregistrée avec `Actif = true`
- **THEN** le système retourne l'entité `Lecteur` correspondante

#### Scenario: IP inconnue ou lecteur inactif
- **WHEN** le service TCP reçoit une connexion depuis une IP non enregistrée ou un lecteur avec `Actif = false`
- **THEN** le système retourne `null` et la trame est ignorée avec journalisation

---

### Requirement: Interface d'administration des lecteurs
Le système SHALL fournir une page React `LecteursPage` accessible depuis le menu d'administration, affichant la liste des lecteurs dans un tableau Ant Design avec les actions Ajouter, Modifier et Supprimer/Désactiver.

#### Scenario: Affichage de la liste
- **WHEN** un `AdminSEBN` navigue vers la page de gestion des lecteurs
- **THEN** le tableau affiche tous les lecteurs avec leurs colonnes Nom, Adresse IP et Statut (actif/inactif)

#### Scenario: Ajout via formulaire modal
- **WHEN** un `AdminSEBN` clique sur "Ajouter un lecteur" et remplit le formulaire
- **THEN** le lecteur est créé et la liste est rafraîchie sans rechargement de page

#### Scenario: Modification en ligne
- **WHEN** un `AdminSEBN` clique sur "Modifier" pour un lecteur existant
- **THEN** un modal pré-rempli s'ouvre et les modifications sont persistées après validation
