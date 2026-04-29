## Architecture

Changements purement frontend, deux fichiers touchés.

## App.tsx

### PAGE_TITLES
```ts
const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/supervision': 'Flux en direct',   // était: 'Supervision en direct'
  // ... reste inchangé
};
```

### Sidebar — lien "Supervision" → "Flux en direct"
```tsx
<NavLink to="/supervision" ...>
  {/* icône inchangée */}
  Flux en direct
</NavLink>
```

## LiveSupervisionPage.tsx

### Imports à ajouter
```ts
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
```

### Titre de la page
```tsx
<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Flux en direct</span>
```

### Colonnes du tableau
```ts
const columns: ColumnsType<PassageDto> = [
  {
    title: 'Heure',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 80,
    render: (v: string) => dayjs(v).format('HH:mm:ss'),
  },
  {
    title: 'Nom',
    dataIndex: 'nom',
    key: 'nom',
    width: 130,
  },
  {
    title: 'Prénom',
    dataIndex: 'prenom',
    key: 'prenom',
    width: 130,
  },
  {
    title: 'Matricule',
    dataIndex: 'matricule',
    key: 'matricule',
    width: 110,
  },
  {
    title: 'Type repas',
    dataIndex: 'repasType',
    key: 'repasType',
    width: 120,
    render: (v: string) => (
      <Tag color={v === 'PlatChaud' ? 'blue' : v === 'Sandwich' ? 'purple' : 'default'}>
        {v === 'PlatChaud' ? 'Plat chaud' : v === 'Sandwich' ? 'Sandwich' : v}
      </Tag>
    ),
  },
  {
    title: 'Lecteur',
    dataIndex: 'lecteurNom',
    key: 'lecteurNom',
    width: 130,
    render: (v: string | null) => v ?? '—',
  },
  {
    title: 'Site',
    dataIndex: 'siteId',
    key: 'siteId',
    width: 90,
    render: (v: string | null) => v ?? '—',
  },
];
```

### Remplacement du feed cartes par le tableau
```tsx
{/* Remplace le bloc "passages.length === 0 ? ... : <div flex..." */}
<Table
  dataSource={passages}
  columns={columns}
  rowKey={p => `${p.id}-${p.timestamp}`}
  size="small"
  pagination={false}
  scroll={{ y: 420 }}
  locale={{ emptyText: 'En attente des passages biométriques...' }}
  rowClassName={(_, index) => index === 0 ? 'passage-row-latest' : ''}
/>
```

### Style CSS pour la première ligne (dernier passage)
Dans le fichier de styles global ou en style inline :
```css
.passage-row-latest td {
  background-color: var(--primary-light, #eff6ff) !important;
  font-weight: 500;
}
```

Utiliser un `<style>` JSX dans le composant pour éviter un fichier CSS séparé :
```tsx
<style>{`
  .passage-row-latest td { background-color: #eff6ff !important; font-weight: 500; }
  [data-theme="dark"] .passage-row-latest td { background-color: #1e3a5f !important; }
`}</style>
```

## Requirements

- R1: SHALL rename sidebar label "/supervision" from "Supervision" to "Flux en direct"
- R2: SHALL update PAGE_TITLES['/supervision'] to "Flux en direct"
- R3: SHALL update the page heading in LiveSupervisionPage to "Flux en direct"
- R4: SHALL replace the cards feed with an Ant Design Table
- R5: SHALL display columns: Heure, Nom, Prénom, Matricule, Type repas, Lecteur, Site
- R6: SHALL keep MAX_FEED = 50 — last 50 passages in memory
- R7: SHALL insert new passages at the top of the table (ante-chronological order)
- R8: SHALL highlight the first row (latest passage) with a distinct background
- R9: SHALL disable pagination on the table (all rows visible with internal scroll)
- R10: MUST NOT modify SSE connection logic, counters, or any backend code
