## MODIFIED Requirements

### Requirement: Endpoint flux SSE des pointages
Le système SHALL exposer `GET /api/repas/flux` maintenant une connexion SSE ouverte et émettant un événement JSON à chaque nouveau `MealLog` inséré. Chaque événement contient : `siteId`, `matricule`, `nom`, `prenom`, `timestamp`, `repasType`, `lecteurNom`. La connexion SHALL se fermer proprement si le client se déconnecte (`HttpContext.RequestAborted`). Le filtrage par site SHALL être appliqué automatiquement côté serveur à partir du claim JWT `siteId` de l'utilisateur authentifié : si le claim est présent, seuls les événements du site correspondant sont émis ; si le claim est absent (`AdminSEBN`), tous les événements sont émis sans filtrage.

#### Scenario: Connexion SSE établie
- **WHEN** un client ouvre une connexion `GET /api/repas/flux`
- **THEN** le serveur retourne HTTP 200 avec `Content-Type: text/event-stream` et maintient la connexion

#### Scenario: Événement émis à chaque passage
- **WHEN** un employé pointe sur un lecteur biométrique
- **THEN** un événement SSE est émis à tous les clients connectés éligibles dans les 500ms

#### Scenario: Fermeture propre à la déconnexion client
- **WHEN** le client ferme la connexion SSE (navigation, fermeture onglet)
- **THEN** le serveur libère la ressource sans erreur

#### Scenario: Filtrage par site pour ResponsableCantine
- **WHEN** un `ResponsableCantine` avec claim JWT `siteId: "SEBN-TN01"` est connecté au flux SSE et un passage `siteId: "SEBN-TN02"` est enregistré
- **THEN** cet événement n'est PAS émis vers la connexion SSE du ResponsableCantine

#### Scenario: Filtrage par site pour Prestataire
- **WHEN** un `Prestataire` avec claim JWT `siteId: "SEBN-TN02"` est connecté et un passage `siteId: "SEBN-TN02"` est enregistré
- **THEN** l'événement EST émis vers la connexion SSE du Prestataire

#### Scenario: AdminSEBN reçoit tous les événements sans filtrage
- **WHEN** un `AdminSEBN` (sans claim `siteId`) est connecté au flux SSE et des passages de plusieurs sites sont enregistrés
- **THEN** tous les événements de tous les sites sont émis vers sa connexion SSE
