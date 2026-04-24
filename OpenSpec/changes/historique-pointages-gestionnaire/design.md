## Context

Les `MealLog` sont déjà persistés en BDD avec `Matricule`, `LecteurId`, `SiteId`, `Timestamp`, `RepasType`. La relation avec `Employee` (nom, prénom) et `Lecteur` (nom) est déjà configurée dans EF Core. L'`ExcelExportService` existant gère déjà un export par site (résumé) — on ajoute une méthode pour l'export détaillé row-by-row.

## Goals / Non-Goals

**Goals :**
- Tableau paginé côté serveur des pointages avec filtres combinables.
- Export Excel des données filtrées (toutes pages).
- Rafraîchissement automatique 30s + bouton manuel.
- Respect du filtre de site pour `ResponsableCantine` (via `ISiteContext`).

**Non-Goals :**
- Modification ou suppression de pointages depuis l'interface.
- Graphiques sur la page Historique (déjà dans le Dashboard).
- Export PDF.
- Pagination infinie (scroll) — pagination classique avec numéros de page.

## Decisions

### 1. Pagination serveur, pas client
**Choix :** `skip/take` en EF Core, retour de `{ items, total, page, pageSize }`.
**Pourquoi :** Les `MealLog` peuvent atteindre plusieurs milliers de lignes sur une longue période. Charger tout côté client serait coûteux. La pagination serveur garde les réponses légères.

### 2. Export sans limite de lignes
**Choix :** `GET /api/historique/export` ignore `page`/`pageSize` et retourne toutes les lignes filtrées.
**Pourquoi :** L'export Excel doit contenir la totalité des données filtrées, pas seulement la page visible. ClosedXML est déjà en place — pas de dépendance supplémentaire.

### 3. Shift dans le DTO : résolu au moment du pointage
**Choix :** `ShiftNom` est calculé à la volée lors de la requête en comparant `Timestamp.TimeOfDay` avec les plages horaires des `ShiftConfig` actifs.
**Pourquoi :** Le shift n'est pas stocké dans `MealLog` (pas de colonne). On résout par JOIN ou calcul en mémoire sur les shifts du jour. Approche : charger les shifts actifs une fois, puis les appliquer sur chaque log.

### 4. Filtre par shift en BDD
**Choix :** Le filtre `shiftId` convertit le shift en plage horaire et filtre `WHERE TIME(Timestamp) BETWEEN heureDebut AND heureFin`.
**Pourquoi :** EF Core supporte `TimeOnly` en SQL Server — on peut filtrer directement.

### 5. Rafraîchissement : polling TanStack Query
**Choix :** `refetchInterval: 30_000` sur la query principale.
**Pourquoi :** SSE pour un tableau paginé serait complexe (recalculer la page, gérer les insertions en cours de pagination). Le polling 30s est suffisant pour un usage opérationnel — les pointages en live s'affichent avec au plus 30s de délai.

## Architecture

```
[HistoriquePage]
    │
    ├── useQuery(getHistorique(filtres, page), refetchInterval: 30s)
    │       └── GET /api/historique?dateDebut=...&page=1&pageSize=50
    │               └── HistoriqueController
    │                       ├── ISiteContext (filtre siteId auto si ResponsableCantine)
    │                       ├── EF Core query sur MealLogs (.Include Employee, Lecteur, Site)
    │                       ├── Filtres WHERE (date, heure, site, matricule, repasType)
    │                       ├── Calcul ShiftNom (shifts actifs en mémoire)
    │                       └── Pagination (skip/take) → MealLogDto[]
    │
    └── Bouton Export → GET /api/historique/export?... (sans page/pageSize)
            └── ExcelExportService.GenererExportHistoriqueAsync(filtres)
                    └── ClosedXML → byte[] → FileContentResult
```

## API Contract

```
GET /api/historique
  Query: dateDebut, dateFin, heureDebut?, heureFin?, siteId?, shiftId?, matricule?, repasType?, page=1, pageSize=50
  Response: { items: MealLogDto[], total: int, page: int, pageSize: int }

GET /api/historique/export
  Query: mêmes filtres (sans page/pageSize)
  Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

```typescript
interface MealLogDto {
  id: number;
  matricule: string;
  nomEmploye: string;
  prenomEmploye: string;
  siteId: string;
  siteNom: string;
  lecteurNom: string;
  repasType: 'PlatChaud' | 'Sandwich';
  timestamp: string; // ISO 8601
  shiftNom?: string;
}
```
