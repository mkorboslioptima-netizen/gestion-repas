## ADDED Requirements

### Requirement: Endpoint flux SSE des pointages
Le système SHALL exposer `GET /api/repas/flux` maintenant une connexion SSE ouverte et émettant un événement JSON à chaque nouveau `MealLog` inséré. Chaque événement contient : `siteId`, `matricule`, `nom`, `prenom`, `timestamp`, `repasType`, `lecteurNom`. La connexion SHALL se fermer proprement si le client se déconnecte (`HttpContext.RequestAborted`).

#### Scenario: Connexion SSE établie
- **WHEN** un client ouvre une connexion `GET /api/repas/flux`
- **THEN** le serveur retourne HTTP 200 avec `Content-Type: text/event-stream` et maintient la connexion

#### Scenario: Événement émis à chaque passage
- **WHEN** un employé pointe sur un lecteur biométrique
- **THEN** un événement SSE est émis à tous les clients connectés dans les 500ms

#### Scenario: Fermeture propre à la déconnexion client
- **WHEN** le client ferme la connexion SSE (navigation, fermeture onglet)
- **THEN** le serveur libère la ressource sans erreur

### Requirement: Connexion SSE dans le dashboard React
L'UI SHALL établir une connexion `EventSource` native vers `/api/repas/flux` à l'entrée sur la page Dashboard et la fermer à la sortie (cleanup React). Chaque événement reçu SHALL déclencher : ajout en tête de la liste des passages + rafraîchissement des stats.

#### Scenario: Nouveau passage visible en temps réel
- **WHEN** un employé pointe
- **THEN** son passage apparaît en haut de la liste live dans le dashboard sans rechargement

#### Scenario: Fermeture EventSource au démontage
- **WHEN** l'utilisateur quitte la page Dashboard
- **THEN** l'`EventSource` est fermé (pas de connexion orpheline)
