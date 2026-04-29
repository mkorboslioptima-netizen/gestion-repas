## Why

La page "Supervision" accessible sous "Tableau de bord" dans le menu latéral porte un nom ambigu — le même libellé "Supervision" existe aussi dans la section "Administration" pour la supervision des équipements. Cela crée une confusion pour les utilisateurs. Par ailleurs, le feed des passages en temps réel est actuellement affiché sous forme de **cartes empilées**, peu lisibles quand les pointages s'accumulent : pas de tri rapide, pas de vue synthétique, défilement difficile.

## What Changes

### 1. Renommage dans le menu et les titres
- Le lien "Supervision" dans la section "Principal" du sidebar devient **"Flux en direct"**
- Le titre dans `PAGE_TITLES` pour `/supervision` devient **"Flux en direct"**
- Le titre affiché dans la page (`LiveSupervisionPage`) devient **"Flux en direct"**

### 2. Remplacement du feed cartes par un tableau Ant Design
- Les passages en temps réel sont désormais affichés dans un `<Table>` Ant Design au lieu des cartes empilées
- Colonnes : **Heure**, **Nom**, **Prénom**, **Matricule**, **Type de repas**, **Lecteur**, **Site**
- Les 50 derniers pointages sont conservés en mémoire (limite `MAX_FEED = 50` inchangée)
- Chaque nouveau passage s'insère **en haut du tableau** (tri ante-chronologique)
- La colonne "Type de repas" affiche un `<Tag>` coloré (bleu = Plat chaud, violet = Sandwich)
- La colonne "Heure" affiche `HH:mm:ss`
- Le tableau a un fond coloré sur la **première ligne** (dernier passage) pour attirer l'œil
- `pagination` désactivée — les 50 lignes sont toutes visibles avec scroll interne

## Capabilities

### Modified Capabilities
- `live-supervision-feed` : affichage tabulaire des 50 derniers pointages au lieu des cartes
- `sidebar-navigation` : libellé "Supervision" → "Flux en direct" dans la section Principal

## Impact

- **Frontend uniquement** — aucune modification backend, aucune migration BDD
- `cantine-web/src/App.tsx` — sidebar label + PAGE_TITLES
- `cantine-web/src/pages/LiveSupervisionPage.tsx` — titre page + remplacement du feed cartes par un tableau
