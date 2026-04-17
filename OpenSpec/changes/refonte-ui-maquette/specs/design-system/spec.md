## ADDED Requirements

### Requirement: Tokens de couleur globaux
L'application SHALL appliquer le design system de la maquette via `ConfigProvider` Ant Design et un fichier `globals.css` contenant les variables CSS : `--primary: #2563eb`, `--sidebar: #1e293b`, `--bg: #f8fafc`, `--card: #ffffff`, `--border: #e2e8f0`, `--text: #0f172a`, `--text2: #64748b`.

#### Scenario: Couleur primaire cohérente
- **WHEN** l'utilisateur voit un bouton primaire, un lien actif ou un badge
- **THEN** la couleur affichée est `#2563eb` (bleu) conforme à la maquette

### Requirement: Composant KpiCard réutilisable
L'application SHALL exposer un composant `KpiCard` affichant : libellé, valeur principale, métadonnée (ex : "+8.2% vs hier"), icône colorée et barre de progression. La barre SHALL avoir une hauteur de 4px avec coins arrondis et une couleur configurable.

#### Scenario: KpiCard rendu correctement
- **WHEN** `<KpiCard label="Repas servis" value={284} color="#2563eb" percent={76} />` est rendu
- **THEN** la card affiche le libellé, la valeur en grand, et une barre bleue à 76% de largeur
