## Why

L'interface actuelle utilise les composants Ant Design par défaut sans cohérence visuelle globale : sidebar sombre sans sections ni avatar, pas de header bar, pages sans hiérarchie typographique claire. La maquette fournie (`maquette.html`) définit un design system propre et professionnel qu'il faut appliquer à toutes les pages existantes en conservant toutes les fonctionnalités.

## What Changes

- **Système de design global** : variables CSS (`--primary: #2563eb`, `--sidebar: #1e293b`, etc.) via `ConfigProvider` Ant Design + fichier `globals.css`
- **Sidebar redessinée** : sections labellisées ("Principal", "Administration"), avatar utilisateur en pied avec nom/rôle/déconnexion, sous-titre version
- **Header bar** : nouveau composant avec titre de page courant, badge site actif, date du jour
- **Page Login** : remplace le placeholder — carte centrée, champs email/password, connexion rapide par rôle
- **DashboardPage** : KPI cards avec barres de progression colorées, camembert répartition, feed live revu (colonnes : Nom, Matricule, Type, Heure)
- **LecteursPage** : compteurs résumé (Total / En ligne / Hors ligne) + tableau existant inchangé fonctionnellement
- **EmployesPage** : cartes stats existantes gardées, mise en page alignée avec le design system
- **SitesPage** : grille de cards par site (comme la maquette) au lieu des formulaires plats

## Capabilities

### New Capabilities

- `design-system` : Token CSS global + ConfigProvider Ant Design aligné avec la maquette (couleurs, rayons, typographie)
- `login-page` : Page de connexion fonctionnelle avec JWT (remplace le placeholder `/login`)
- `app-layout` : Header bar + sidebar redessinée avec sections, avatar, déconnexion

### Modified Capabilities

*(Toutes les pages sont visuellement redessinées mais leur logique métier, appels API et fonctionnalités restent intacts)*

## Impact

- **Frontend uniquement** — aucun changement backend
- `App.tsx` : intégration du header, restructuration de la sidebar, ajout route `/login`
- `src/styles/globals.css` : nouveau fichier de variables et resets
- `LoginPage.tsx` : nouveau composant
- `DashboardPage.tsx`, `LecteursPage.tsx`, `EmployesPage.tsx`, `SitesPage.tsx` : refonte visuelle
- `antd/dist/reset.css` remplacé par tokens ConfigProvider
