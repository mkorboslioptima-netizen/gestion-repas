## Why

La page Employés affiche uniquement les boutons d'import et de synchronisation, sans aucune visibilité sur les données. L'AdminSEBN n'a aucun moyen de savoir combien d'employés sont actifs par site, quand la dernière synchronisation a eu lieu, ni ce qu'elle a produit — ce qui rend la page opérationnellement aveugle.

## What Changes

- Ajouter un tableau de statistiques par site : nombre d'employés actifs, date de la dernière synchronisation, résultats de la dernière synchro (nouveaux, mis à jour, désactivés)
- Ajouter un tableau liste des employés du site sélectionné (Matricule, Nom, Prénom, Actif)
- Enregistrer chaque résultat de synchronisation/import dans une table `SyncLogs` pour affichage historique
- Exposer les endpoints REST nécessaires (`GET /api/employes`, `GET /api/employes/sync-logs/{siteId}`, `GET /api/employes/stats`)

## Capabilities

### New Capabilities

- `employee-list` : Affichage tabulaire des employés par site avec filtrage et pagination
- `sync-history` : Enregistrement et affichage de l'historique des synchronisations (date, résultats par site)
- `employee-stats` : Statistiques agrégées par site (total employés actifs, dernière synchro)

### Modified Capabilities

*(aucune — les comportements d'import et de synchronisation existants ne changent pas, on leur ajoute seulement la persistance des résultats)*

## Impact

- **Backend :** Nouvelle table `SyncLogs` (migration EF Core), nouveaux endpoints dans `EmployesController`, `IMorphoEmployeeImporter.ImportAsync` et `MorphoSyncService` doivent écrire dans `SyncLogs` après chaque opération
- **Frontend :** `EmployesPage.tsx` enrichi avec trois sections — statistiques, historique de synchro, tableau d'employés
- **API :** 3 nouveaux endpoints REST (lecture seule sauf SyncLog écrit côté serveur)
- **Aucune dépendance externe ajoutée**
