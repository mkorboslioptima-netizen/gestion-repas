## ADDED Requirements

### Requirement: Sidebar avec sections et avatar
La sidebar SHALL afficher : logo MealOps + sous-titre (version + nb sites), sections de navigation labellisées ("Principal", "Administration"), items avec icône SVG et état actif visuel (`background: rgba(37,99,235,.28)`), et un pied de page avec avatar coloré, nom, rôle et bouton déconnexion.

#### Scenario: Section Administration visible pour AdminSEBN
- **WHEN** l'utilisateur connecté est AdminSEBN
- **THEN** la section "Administration" avec Lecteurs, Employés, Sites est visible dans la sidebar

#### Scenario: Item actif mis en évidence
- **WHEN** l'utilisateur est sur la page Dashboard
- **THEN** l'item "Tableau de bord" a un fond bleu semi-transparent et le texte en bleu clair

### Requirement: Header bar avec titre et badge site
L'application SHALL afficher un header fixe de 52px en haut du contenu avec : titre de la page courante (ex : "Tableau de bord"), badge bleu indiquant le site actif (ex : "SEBN-TN01"), date du jour formatée.

#### Scenario: Titre mis à jour à la navigation
- **WHEN** l'utilisateur navigue vers la page Employés
- **THEN** le header affiche "Employés" comme titre de page
