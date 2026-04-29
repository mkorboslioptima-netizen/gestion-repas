## Tasks

### ~~T1 — Renommer dans App.tsx~~ ✓
- Fichier : `cantine-web/src/App.tsx`
- Mettre à jour `PAGE_TITLES['/supervision']` : `'Supervision en direct'` → `'Flux en direct'`
- Mettre à jour le libellé du `<NavLink to="/supervision">` dans le Sidebar : `Supervision` → `Flux en direct`

### ~~T2 — Mettre à jour le titre de la page~~ ✓
- Fichier : `cantine-web/src/pages/LiveSupervisionPage.tsx`
- Changer le titre affiché `"Supervision en direct"` → `"Flux en direct"`

### ~~T3 — Ajouter les imports nécessaires~~ ✓
- Fichier : `cantine-web/src/pages/LiveSupervisionPage.tsx`
- Ajouter `Table` dans l'import Ant Design
- Ajouter `import type { ColumnsType } from 'antd/es/table'`

### ~~T4 — Définir les colonnes du tableau~~ ✓
- Fichier : `cantine-web/src/pages/LiveSupervisionPage.tsx`
- Définir la constante `columns: ColumnsType<PassageDto>` avec les colonnes : Heure, Nom, Prénom, Matricule, Type repas, Lecteur, Site
- La colonne "Type repas" utilise un `<Tag>` coloré (bleu = PlatChaud, violet = Sandwich)
- La colonne "Heure" formate avec `dayjs(v).format('HH:mm:ss')`

### ~~T5 — Remplacer le feed cartes par le tableau~~ ✓
- Fichier : `cantine-web/src/pages/LiveSupervisionPage.tsx`
- Supprimer le bloc conditionnel `passages.length === 0 ? ... : <div flexColumn gap-8>`
- Le remplacer par un `<Table>` Ant Design avec `pagination={false}`, `scroll={{ y: 420 }}`, `size="small"`
- `locale={{ emptyText: 'En attente des passages biométriques...' }}` pour l'état vide
- `rowClassName={(_, index) => index === 0 ? 'passage-row-latest' : ''}` pour surligner la dernière ligne

### ~~T6 — Ajouter le style de surbrillance~~ ✓
- Fichier : `cantine-web/src/pages/LiveSupervisionPage.tsx`
- Insérer un bloc `<style>` JSX dans le composant pour styler `.passage-row-latest td`
- Fond `#eff6ff` (clair) et `#1e3a5f` (sombre via `[data-theme="dark"]`)
