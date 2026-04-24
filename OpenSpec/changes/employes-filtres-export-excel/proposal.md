## Why

La page Employés affiche la liste complète des employés d'un site sans aucune possibilité de filtrage. Sur les sites avec plusieurs dizaines ou centaines d'employés, retrouver un employé précis ou isoler les inactifs / les gardiens (quota 2) devient fastidieux. De plus, il n'existe aucun moyen d'exporter cette liste pour un usage externe (reporting RH, vérification de cohérence avec MorphoManager).

## What Changes

- Ajouter une barre de filtres au-dessus du tableau des employés :
  - **Recherche texte** : filtre par matricule, nom ou prénom (insensible à la casse)
  - **Statut** : Tous / Actif / Inactif
  - **Quota** : Tous / 1 repas/j (standard) / 2 repas/j (gardiens)
- Ajouter un bouton **Export Excel** qui télécharge la liste filtrée en `.xlsx`
- L'export est limité au rôle `AdminSEBN` (cohérent avec l'accès à la page)

## Capabilities

### New Capabilities
- `filtre-employes-texte` : Champ de recherche texte filtrant matricule + nom + prénom côté client
- `filtre-employes-statut` : Select Actif / Inactif / Tous côté client
- `filtre-employes-quota` : Select 1 repas/j / 2 repas/j / Tous côté client
- `export-excel-employes` : Endpoint `GET /api/employes/export?siteId=` retournant un fichier `.xlsx` avec ClosedXML

### Modified Capabilities
- `employes-table` : Le tableau reçoit la liste filtrée côté client (pas de nouvel appel API pour les filtres texte/statut/quota)

## Impact

- **Frontend** : `EmployesPage.tsx` — ajout barre de filtres + bouton export
- **Frontend** : `src/api/employes.ts` — ajout `getExportEmployes(siteId)`
- **Backend** : `EmployesController.cs` — nouvel endpoint `GET /api/employes/export`
- **Backend** : `Cantine.Infrastructure` — logique de génération Excel avec ClosedXML (pattern identique à l'export repas)
- **Aucun changement** de schéma BDD ni de DTO existant
