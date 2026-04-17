## 1. Design system — globals.css + ConfigProvider

- [x] 1.1 Créer `cantine-web/src/styles/globals.css` avec les variables CSS de la maquette (`:root { --primary, --sidebar, --bg, --card, --border, --text, --text2, --text3 }`) + resets de base
- [x] 1.2 Importer `globals.css` dans `cantine-web/src/main.tsx` (remplace ou complète `antd/dist/reset.css`)
- [x] 1.3 Mettre à jour `ConfigProvider` dans `App.tsx` avec les tokens Ant Design alignés : `colorPrimary: '#2563eb'`, `borderRadius: 8`, `colorBgContainer: '#ffffff'`, `colorBgLayout: '#f8fafc'`
- [x] 1.4 Créer `cantine-web/src/components/KpiCard.tsx` — composant `KpiCard({ label, value, meta?, color, percent?, icon? })` avec barre de progression CSS

## 2. Layout — Sidebar redessinée

- [x] 2.1 Réécrire la sidebar dans `App.tsx` : marque (logo M + "Cantine SEBN" + sous-titre "v1.0 • N sites"), nav en sections labellisées, avatar pied de page
- [x] 2.2 Supprimer `Menu` d'Ant Design de la sidebar — remplacer par des `div.sb-item` stylés via `globals.css`
- [x] 2.3 Ajouter les classes CSS `.sb-brand`, `.sb-nav`, `.sb-section`, `.sb-section-label`, `.sb-item`, `.sb-footer`, `.sb-avatar`, `.sb-user` dans `globals.css`
- [x] 2.4 Bouton déconnexion dans le pied de sidebar — appelle `logout()` de `AuthContext`

## 3. Layout — Header bar

- [x] 3.1 Créer `cantine-web/src/components/AppHeader.tsx` — header 52px avec titre de page (via `useLocation` + mapping route→titre), badge site actif (via `useSite`), date du jour
- [x] 3.2 Intégrer `AppHeader` dans `App.tsx` au-dessus du `<Content>`
- [x] 3.3 Ajouter les styles `.header`, `.header-title`, `.header-site`, `.header-date` dans `globals.css`

## 4. Page Login

- [x] 4.1 Créer `cantine-web/src/pages/LoginPage.tsx` — carte centrée sur fond dégradé, champs email/password, bouton "Se connecter"
- [x] 4.2 En mode dev : boutons de connexion rapide "AdminSEBN (Dev)" et "ResponsableCantine (Dev)" qui injectent le token via `AuthContext.login()`
- [x] 4.3 Remplacer le placeholder `/login` dans `App.tsx` par `<LoginPage />`
- [x] 4.4 Rétablir le `PrivateRoute` sur les routes protégées (retirer le bypass `isAdmin = true` et le DevBypass middleware de l'API)

## 5. Dashboard redessiné

- [x] 5.1 Remplacer les `Statistic` Ant Design par des `KpiCard` avec les vraies données API (`getStatsJour()`) — 4 cartes : Total passages, Plats chauds, Sandwichs, Quota atteint
- [x] 5.2 Ajouter un camembert SVG natif (ou `Recharts PieChart`) pour la répartition Plats chauds / Sandwich
- [x] 5.3 Revoir le feed live : colonnes Nom, Matricule, Type de repas (badge coloré), Heure — supprimer les colonnes superflues
- [x] 5.4 Envelopper le feed dans un `div.feed-card` avec `.feed-hdr` + indicateur "● En direct"

## 6. LecteursPage redessinée

- [x] 6.1 Ajouter les compteurs résumé en haut : Total, En ligne (statut actif), Hors ligne — dans des `div.summary-stat`
- [x] 6.2 Envelopper le tableau existant dans un `div.admin-card` avec `.admin-hdr`

## 7. EmployesPage — ajustements visuels

- [x] 7.1 Aligner les cartes stats sur le design system (border-radius 12px, box-shadow léger)
- [x] 7.2 Envelopper la section import/sync dans un `div.admin-card`

## 8. SitesPage redessinée

- [x] 8.1 Remplacer les `Card` Ant Design plats par des `div.site-card` en grille (3 colonnes) avec nom, SiteId, statut actif, nb employés, actions Modifier/Supprimer

## 9. Vérification

- [x] 9.1 Vérifier que la page Login s'affiche correctement et redirige après connexion
- [x] 9.2 Vérifier que la sidebar affiche les sections correctes selon le rôle connecté
- [x] 9.3 Vérifier que le header affiche le bon titre à la navigation
- [x] 9.4 Vérifier que le Dashboard affiche les vraies données API avec le design maquette
- [x] 9.5 Vérifier que LecteursPage, EmployesPage et SitesPage ont le nouveau look sans régression fonctionnelle
