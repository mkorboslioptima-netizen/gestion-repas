## Context

Stack actuel : React 18 + TypeScript + Ant Design 5 + Vite. La sidebar utilise `Ant Design Layout.Sider + Menu` avec `theme="dark"`. Les pages utilisent des composants Ant Design (`Card`, `Table`, `Statistic`, `Button`…) sans surcharge de tokens. La maquette est en CSS pur avec des variables `--primary`, `--sidebar`, `--bg`, `--card`, `--border`.

## Goals / Non-Goals

**Goals :**
- Appliquer fidèlement les couleurs, espacements et typographie de la maquette
- Sidebar avec sections, sous-titre version, avatar pied de page avec déconnexion
- Header bar fixe en haut du contenu (titre page + badge site + date)
- Page login fonctionnelle (JWT vers `POST /api/auth/login` existant ou mock en dev)
- KPI cards avec progress bar colorée sur le Dashboard
- Feed live simplifié (Nom, Matricule, Type repas, Heure)
- Compteurs résumé sur LecteursPage (Total / En ligne / Hors ligne)

**Non-Goals :**
- Reécrire la logique métier ou les appels API
- Supprimer Ant Design — on surcharge ses tokens, on ne le remplace pas
- Responsive mobile (MVP desktop uniquement)
- Dark mode

## Decisions

### 1. ConfigProvider Ant Design pour les tokens de couleur
**Choix :** `<ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 8, ... } }}>` dans `App.tsx`.
**Pourquoi :** Évite de dupliquer tous les composants Ant Design. Les couleurs primaires, les rayons et la typographie s'appliquent globalement.

### 2. Fichier `globals.css` pour les variables CSS et les classes utilitaires de la maquette
**Choix :** `src/styles/globals.css` importé une seule fois dans `main.tsx`. Contient les variables CSS de la maquette (`:root { --primary: #2563eb; ... }`) et les classes `.kpi`, `.kpi-bar`, `.feed-card`, etc.
**Pourquoi :** Les variables CSS permettent la cohérence sans conflit avec Ant Design.

### 3. Sidebar reconstruite avec `Layout.Sider` + nav custom (sans `Menu` Ant Design)
**Choix :** Remplacer `Menu` d'Ant Design par des `div.sb-item` en CSS pur depuis `globals.css`, en gardant `Layout.Sider` pour le fond et la largeur.
**Pourquoi :** Le `Menu` d'Ant Design ne supporte pas facilement les sections labellisées et l'avatar pied de page de la maquette.

### 4. Header bar comme composant séparé `AppHeader.tsx`
**Choix :** Composant `AppHeader` dans `Layout.Header` fixé en haut du contenu, lit `useLocation()` pour le titre et `useSite()` pour le badge site.
**Pourquoi :** Séparation claire. Le titre de page est dérivé de la route courante via un mapping `route → titre`.

### 5. Page Login en dev — token hardcodé, en prod — appel JWT réel
**Choix :** En `Development`, le bouton de connexion rapide injecte directement le token dev dans `AuthContext.login()`. En production, appel `POST /api/auth/login`.
**Pourquoi :** Le backend auth JWT n'est pas encore implémenté (hérite du Node.js existant). La page doit fonctionner en dev sans bloquer.

### 6. KPI cards — composant `KpiCard.tsx` réutilisable
**Choix :** Composant `KpiCard({ label, value, meta, color, percent })` rendu en CSS pur (classes de `globals.css`).
**Pourquoi :** Utilisé sur Dashboard et potentiellement d'autres pages. Ant Design `Statistic` ne supporte pas la barre de progression colorée intégrée.

## Risks / Trade-offs

- **Conflit Ant Design / CSS global** → Ant Design injecte ses propres styles. Utiliser `!important` avec parcimonie, préférer les tokens.
- **Sidebar non-Ant Design** → Perd les animations de collapse. Acceptable pour Phase 1 (largeur fixe 220px).
- **Login dev vs prod** → Le token hardcodé doit être retiré avant déploiement. Commentaire `// TODO` explicite dans le code.
