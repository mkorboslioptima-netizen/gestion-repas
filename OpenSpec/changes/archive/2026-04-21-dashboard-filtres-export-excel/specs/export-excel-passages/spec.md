## ADDED Requirements

### Requirement: Endpoint export XLSX des passages filtrés
L'API SHALL exposer `GET /api/repas/export?dateDebut={YYYY-MM-DD}&dateFin={YYYY-MM-DD}&heureDebut={HH:mm}&heureFin={HH:mm}` retournant un fichier Excel (.xlsx) généré par ClosedXML. Le fichier MUST contenir les colonnes : Date, Heure, Nom, Prénom, Matricule, Type de repas, Lecteur. Accessible aux rôles `AdminSEBN`, `ResponsableCantine` et `Prestataire`.

#### Scenario: Export réussi avec filtre
- **WHEN** `GET /api/repas/export?dateDebut=2026-04-01&dateFin=2026-04-15&heureDebut=00:00&heureFin=23:59` est appelé avec un token valide
- **THEN** l'API retourne HTTP 200 avec `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` et un fichier XLSX valide contenant les passages de la période

#### Scenario: Export avec résultat vide
- **WHEN** aucun passage n'existe pour la période demandée
- **THEN** l'API retourne HTTP 200 avec un fichier XLSX valide contenant uniquement la ligne d'en-têtes

#### Scenario: Paramètres invalides
- **WHEN** `dateDebut` ou `dateFin` sont au mauvais format ou `dateDebut > dateFin`
- **THEN** l'API retourne HTTP 400 avec un message d'erreur explicite

#### Scenario: Accès non autorisé
- **WHEN** l'endpoint est appelé sans token ou avec un rôle non autorisé
- **THEN** l'API retourne HTTP 401 ou HTTP 403

### Requirement: Bouton "Exporter en Excel" sur le dashboard
Le dashboard SHALL afficher un bouton "Exporter en Excel" qui déclenche le téléchargement du fichier XLSX en utilisant les filtres date/heure actuellement actifs. Le bouton SHALL être visible pour les rôles `AdminSEBN`, `ResponsableCantine` et `Prestataire`. Le fichier téléchargé SHALL être nommé `passages-{dateDebut}-{dateFin}.xlsx`.

#### Scenario: Téléchargement déclenché par le bouton
- **WHEN** l'utilisateur clique sur "Exporter en Excel"
- **THEN** une requête Axios avec `responseType: 'blob'` est envoyée à `/api/repas/export` avec les filtres actifs, et le navigateur déclenche le téléchargement du fichier XLSX

#### Scenario: Feedback pendant le téléchargement
- **WHEN** le téléchargement est en cours
- **THEN** le bouton affiche un état de chargement (spinner) et est désactivé jusqu'à la fin
