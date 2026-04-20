## Why

Le dashboard affiche uniquement les données de la journée courante, ce qui empêche les responsables et prestataires de consulter et d'exporter les données d'une période arbitraire. L'export actuel génère un CSV basique alors que le besoin métier est un fichier Excel formaté (XLSX).

## What Changes

- Ajouter un panneau de filtres sur le dashboard : plage de dates (DatePicker range) et plage horaire (sélection heure de début / heure de fin)
- Remplacer les données du dashboard (KPI, graphiques, feed) par les données correspondant au filtre actif
- Ajouter un bouton "Exporter en Excel" qui génère un fichier XLSX côté serveur via ClosedXML, respectant le filtre date/heure courant
- Le filtre par défaut est « aujourd'hui, 00h–23h59 » pour conserver le comportement actuel

## Capabilities

### New Capabilities
- `dashboard-filtres`: Filtrage du dashboard par plage de dates et plage horaire (composant React + paramètres API)
- `export-excel-passages`: Export XLSX des passages filtrés, généré côté serveur avec ClosedXML

### Modified Capabilities
- `meal-stats-jour`: L'endpoint de stats doit accepter des paramètres `dateDebut`, `dateFin`, `heureDebut`, `heureFin` en plus du comportement actuel (jour courant par défaut)
- `meal-historique-jour`: L'endpoint d'historique doit accepter les mêmes filtres date/heure

## Impact

- **Frontend** : `DashboardPage.tsx` — ajout du panneau filtres, mise à jour des requêtes TanStack Query avec les nouveaux paramètres, remplacement du téléchargement CSV par appel à l'endpoint XLSX
- **Backend API** : `RepasController` — mise à jour des endpoints stats et historique pour accepter les filtres ; nouvel endpoint `GET /api/repas/export?dateDebut=&dateFin=&heureDebut=&heureFin=` qui retourne un fichier XLSX
- **Infrastructure** : `Cantine.Infrastructure` — nouvelle méthode de service pour la génération Excel avec ClosedXML (déjà présent en dépendance)
- **Aucun changement** de schéma BDD — les filtres s'appliquent en mémoire/requête EF Core sur `MealLogs.Timestamp`
