## Why

Le dashboard affiche des statistiques agrégées (compteurs, graphiques) mais ne permet pas de consulter le détail ligne par ligne des pointages. Un responsable de cantine ou un administrateur qui veut vérifier si un employé précis a bien été servi, ou identifier les anomalies d'une journée, doit actuellement interroger la BDD directement. Il n'existe aucune vue tabulaire paginée des `MealLog`.

De plus, l'export Excel actuel (`GET /api/export`) génère un résumé par site — pas un export détaillé row-by-row des pointages filtrés, ce dont a besoin un gestionnaire pour ses rapports RH.

## What Changes

### Page "Historique" pour tous les rôles (AdminSEBN et ResponsableCantine)

- Nouvelle route `/historique` accessible depuis la barre de navigation.
- Tableau paginé (50 lignes / page, pagination serveur) listant les `MealLog` avec colonnes :
  - Matricule, Nom, Prénom, Site, Lecteur, Type de repas, Date, Heure, Shift (si en cours au moment du pointage)
- Filtres en haut de page : plage de dates, site, shift, type de repas, matricule (recherche libre).
- Actualisation automatique : le tableau se rafraîchit toutes les 30 secondes (polling TanStack Query) pour afficher les nouveaux pointages en live.
- Bouton "Exporter Excel" → télécharge les données filtrées (toutes pages, pas seulement la page courante) en XLSX.

### Endpoint `GET /api/historique`

- Paramètres : `dateDebut`, `dateFin`, `heureDebut`, `heureFin`, `siteId?`, `shiftId?`, `matricule?`, `repasType?`, `page`, `pageSize` (défaut 50).
- Filtre automatiquement par `SiteId` pour les `ResponsableCantine` (via `ISiteContext`).
- Retourne : `{ items: MealLogDto[], total: int, page: int, pageSize: int }`.

### DTO `MealLogDto`

- `Id`, `Matricule`, `NomEmploye`, `PrenomEmploye`, `SiteId`, `SiteNom`, `LecteurNom`, `RepasType`, `Timestamp`, `ShiftNom?`

### Endpoint `GET /api/historique/export`

- Mêmes paramètres de filtre que `GET /api/historique` (sans pagination).
- Génère un XLSX via `ClosedXML` avec toutes les lignes filtrées.
- Colonnes Excel : Matricule, Nom, Prénom, Site, Lecteur, Type repas, Date, Heure.
- Retourne `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### Synchronisation des données

- TanStack Query `refetchInterval: 30_000` sur `GET /api/historique` — les nouveaux pointages apparaissent automatiquement toutes les 30 secondes.
- Le bouton "Actualiser" force un refetch immédiat.

## Capabilities

### New Capabilities
- `historique-pointages-page` : page `/historique` avec tableau paginé, filtres, rafraîchissement automatique.
- `historique-export-excel` : `GET /api/historique/export` — export XLSX des pointages filtrés row-by-row.

### Modified Capabilities
- Navigation : lien "Historique" ajouté dans la sidebar (accessible aux deux rôles).

## Impact

- **Cantine.Core/DTOs/MealLogDto.cs** : nouveau DTO.
- **Cantine.API/Controllers/HistoriqueController.cs** : endpoints `GET /api/historique` et `GET /api/historique/export`.
- **Cantine.Infrastructure/Services/ExcelExportService.cs** : nouvelle méthode `GenererExportHistoriqueAsync(filtres)`.
- **cantine-web/src/api/historique.ts** : `getHistorique(params)`, `exportHistorique(params)`.
- **cantine-web/src/pages/HistoriquePage.tsx** : nouvelle page.
- **cantine-web/src/App.tsx** : route `/historique` + item nav sidebar.
- **Aucune migration BDD** — lecture seule sur `MealLogs`.
