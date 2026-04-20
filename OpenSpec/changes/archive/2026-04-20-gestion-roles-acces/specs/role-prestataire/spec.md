## ADDED Requirements

### Requirement: Connexion Prestataire via l'écran de login
Un utilisateur avec le rôle `Prestataire` SHALL pouvoir se connecter via l'écran de login standard (email + mot de passe). Le token JWT retourné MUST contenir `role: "Prestataire"`.

#### Scenario: Login réussi d'un Prestataire
- **WHEN** un Prestataire saisit ses identifiants valides sur l'écran de connexion
- **THEN** il est authentifié et redirigé vers le dashboard en mode lecture seule

#### Scenario: Compte Prestataire désactivé
- **WHEN** un Prestataire dont le compte est désactivé (`isActive: false`) tente de se connecter
- **THEN** l'API retourne HTTP 401 avec le message "Compte désactivé. Contactez l'administrateur."

### Requirement: Dashboard temps réel en lecture seule pour le Prestataire
Le Prestataire SHALL voir le dashboard avec les compteurs de repas du jour (total passages, plats chauds, sandwichs) et le feed live. Il MUST ne voir aucun bouton d'action ou de modification.

#### Scenario: Prestataire consulte le dashboard
- **WHEN** un Prestataire est connecté et navigue vers le dashboard
- **THEN** il voit les KPI du jour et le feed live en temps réel, sans boutons Modifier/Supprimer

### Requirement: Export récapitulatif mensuel pour le Prestataire
Le Prestataire SHALL avoir accès à un bouton "Télécharger mon récapitulatif" sur son dashboard qui déclenche un export Excel du nombre de repas servis par jour sur le mois courant.

#### Scenario: Téléchargement du récapitulatif mensuel
- **WHEN** un Prestataire clique sur "Télécharger récapitulatif — [Mois courant]"
- **THEN** un fichier Excel est téléchargé avec les colonnes : Date, Plats chauds, Sandwichs, Total — pour chaque jour du mois courant

#### Scenario: Endpoint protégé contre les autres rôles
- **WHEN** un utilisateur non-Prestataire appelle `GET /api/rapports/prestataire/mensuel`
- **THEN** l'API retourne HTTP 403

### Requirement: Endpoint API récapitulatif mensuel Prestataire
L'API SHALL exposer `GET /api/rapports/prestataire/mensuel?annee={y}&mois={m}` retournant les totaux journaliers de repas pour le mois demandé. Cet endpoint MUST être accessible aux rôles `Prestataire` et `AdminSEBN`.

#### Scenario: Récupération des données du mois courant
- **WHEN** un Prestataire appelle `GET /api/rapports/prestataire/mensuel?annee=2026&mois=4`
- **THEN** l'API retourne un tableau de `{ date, platsChauds, sandwichs, total }` pour chaque jour du mois ayant des passages

#### Scenario: Mois sans données
- **WHEN** le mois demandé n'a aucun passage enregistré
- **THEN** l'API retourne HTTP 200 avec un tableau vide `[]`
