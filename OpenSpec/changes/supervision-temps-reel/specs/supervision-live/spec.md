## ADDED Requirements

### Requirement: Onglet Supervision dans la navigation latérale
L'application React SHALL afficher un onglet "Supervision" dans la barre de navigation latérale gauche, accessible à tous les rôles authentifiés (`AdminSEBN`, `ResponsableCantine`, `Prestataire`). L'onglet SHALL naviguer vers la route `/supervision`.

#### Scenario: Accès à la page supervision via la navigation
- **WHEN** un utilisateur authentifié clique sur l'onglet "Supervision" dans la sidebar
- **THEN** l'application navigue vers `/supervision` et affiche la page de supervision en temps réel

#### Scenario: Onglet visible pour tous les rôles
- **WHEN** un utilisateur avec le rôle `Prestataire`, `ResponsableCantine` ou `AdminSEBN` est connecté
- **THEN** l'onglet "Supervision" apparaît dans la navigation latérale

### Requirement: Page de supervision avec feed live SSE
La page `/supervision` SHALL établir une connexion `EventSource` native vers `GET /api/repas/flux` au montage du composant et la fermer au démontage. Chaque événement SSE reçu SHALL être ajouté en tête de la liste des passages affichés. La liste SHALL être limitée à 50 entrées (FIFO).

#### Scenario: Feed live affiché au chargement de la page
- **WHEN** un utilisateur navigue vers `/supervision`
- **THEN** une connexion SSE est établie et les passages s'affichent en temps réel dès réception

#### Scenario: Limite de 50 passages dans le feed
- **WHEN** plus de 50 passages ont été reçus depuis l'ouverture de la page
- **THEN** seuls les 50 passages les plus récents sont affichés (les plus anciens sont supprimés)

#### Scenario: Fermeture de la connexion SSE au démontage
- **WHEN** l'utilisateur quitte la page `/supervision` (navigation vers une autre page)
- **THEN** l'`EventSource` est fermé sans connexion orpheline

### Requirement: Compteurs en temps réel sur la page supervision
La page SHALL afficher trois compteurs mis à jour à chaque événement SSE : **Total passages**, **Plats chauds**, **Sandwichs**. Au montage, les compteurs SHALL être initialisés depuis `GET /api/stats/daily` pour afficher les totaux du jour déjà enregistrés.

#### Scenario: Initialisation des compteurs au chargement
- **WHEN** un utilisateur ouvre la page `/supervision`
- **THEN** les compteurs affichent les totaux du jour courant depuis `/api/stats/daily` avant le premier événement SSE

#### Scenario: Mise à jour des compteurs à chaque passage
- **WHEN** un événement SSE est reçu avec `repasType: "PlatChaud"`
- **THEN** le compteur "Total passages" et le compteur "Plats chauds" sont incrémentés immédiatement

#### Scenario: Compteur Sandwichs incrémenté
- **WHEN** un événement SSE est reçu avec `repasType: "Sandwich"`
- **THEN** le compteur "Total passages" et le compteur "Sandwichs" sont incrémentés immédiatement

### Requirement: Filtrage des données de supervision par site selon le rôle
La page supervision SHALL afficher uniquement les passages du site assigné à l'utilisateur connecté. Le filtrage SHALL être effectué côté serveur (endpoint SSE filtre par claim JWT `siteId`). L'AdminSEBN SHALL voir les passages de tous les sites.

#### Scenario: ResponsableCantine voit son site uniquement
- **WHEN** un `ResponsableCantine` avec `siteId: "SEBN-TN01"` est sur la page supervision
- **THEN** seuls les passages avec `siteId = "SEBN-TN01"` apparaissent dans son feed live

#### Scenario: Prestataire voit son site uniquement
- **WHEN** un `Prestataire` avec `siteId: "SEBN-TN02"` est sur la page supervision
- **THEN** seuls les passages avec `siteId = "SEBN-TN02"` apparaissent dans son feed live

#### Scenario: AdminSEBN voit tous les sites
- **WHEN** un `AdminSEBN` (sans claim `siteId`) est sur la page supervision
- **THEN** les passages de tous les sites sont affichés dans le feed live

### Requirement: Indicateur de reconnexion SSE
La page SHALL afficher un badge d'état de connexion ("En direct" / "Reconnexion..."). En cas de perte de connexion SSE, le badge passe à "Reconnexion..." et les compteurs sont réinitialisés depuis `/api/stats/daily` lors de la reconnexion réussie.

#### Scenario: Badge "En direct" affiché lors d'une connexion active
- **WHEN** la connexion SSE est établie et active
- **THEN** un badge vert "En direct" est affiché sur la page supervision

#### Scenario: Badge "Reconnexion..." lors d'une interruption
- **WHEN** la connexion SSE est interrompue (réseau, timeout)
- **THEN** le badge passe à "Reconnexion..." en orange et les compteurs sont réinitialisés depuis `/api/stats/daily` à la reconnexion
