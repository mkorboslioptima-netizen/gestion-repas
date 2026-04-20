## ADDED Requirements

### Requirement: Panneau de filtres date/heure sur le dashboard
Le dashboard SHALL afficher un panneau de filtres permettant de sélectionner une plage de dates (RangePicker Ant Design) et une plage horaire (deux TimePicker : heure de début et heure de fin). Ces filtres SHALL être initialisés par défaut sur la journée courante (00:00 – 23:59). L'application des filtres MUST déclencher un rechargement des données (stats, historique, graphiques) via TanStack Query.

#### Scenario: Chargement initial avec filtre par défaut
- **WHEN** l'utilisateur accède au dashboard
- **THEN** le panneau de filtres affiche la date du jour comme plage de dates et 00:00–23:59 comme plage horaire, et les données affichées correspondent à la journée courante complète

#### Scenario: Application d'une plage de dates personnalisée
- **WHEN** l'utilisateur sélectionne une plage de dates (ex. 01/04/2026 – 15/04/2026) et clique sur "Appliquer"
- **THEN** les KPI, le graphique et le feed se rechargent avec les données de la période sélectionnée

#### Scenario: Application d'une plage horaire
- **WHEN** l'utilisateur sélectionne une plage horaire (ex. 11:00 – 14:00) en plus d'une plage de dates
- **THEN** seuls les passages compris entre 11h00 et 14h00 sur chaque jour de la plage de dates sont affichés

#### Scenario: Réinitialisation du filtre
- **WHEN** l'utilisateur clique sur "Réinitialiser"
- **THEN** les filtres reviennent à la journée courante 00:00–23:59 et les données sont rechargées

### Requirement: Suspension du SSE hors journée courante
Quand le filtre sélectionné ne contient pas la date courante, la connexion SSE SHALL être suspendue. Quand la journée courante est incluse dans la plage de dates, le SSE SHALL être actif.

#### Scenario: SSE suspendu sur une plage passée
- **WHEN** l'utilisateur applique un filtre qui n'inclut pas aujourd'hui
- **THEN** la connexion EventSource est fermée et le badge "En direct" est masqué

#### Scenario: SSE réactivé sur la journée courante
- **WHEN** l'utilisateur réinitialise le filtre (retour à aujourd'hui)
- **THEN** la connexion EventSource est réouverte et le badge "En direct" réapparaît
