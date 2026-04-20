## 1. Backend — Mise à jour des endpoints existants

- [x] 1.1 Modifier `GET /api/repas/stats-jour` dans `RepasController` pour accepter les query params optionnels `dateDebut`, `dateFin`, `heureDebut`, `heureFin` — valeurs par défaut : journée courante 00:00–23:59
- [x] 1.2 Mettre à jour la logique de filtrage EF Core dans le service/controller pour construire la clause `Where` sur `MealLogs.Timestamp` selon les paramètres reçus (plage horaire appliquée sur chaque jour de la plage de dates)
- [x] 1.3 Modifier `GET /api/repas/historique-jour` de la même façon — ajouter les mêmes params optionnels + augmenter la limite à 500 quand une plage de dates est spécifiée

## 2. Backend — Endpoint export XLSX

- [x] 2.1 Ajouter `GET /api/repas/export` dans `RepasController` — paramètres `dateDebut`, `dateFin`, `heureDebut`, `heureFin` (tous requis ou avec défauts) — protégé `[Authorize(Roles = "AdminSEBN,ResponsableCantine,Prestataire")]`
- [x] 2.2 Implémenter la génération XLSX avec ClosedXML dans `Cantine.Infrastructure/Services/` : colonnes Date, Heure, Nom, Prénom, Matricule, Type de repas, Lecteur — tri par Timestamp croissant
- [x] 2.3 Retourner le fichier avec `File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"passages-{dateDebut}-{dateFin}.xlsx")`
- [x] 2.4 Valider les paramètres : format YYYY-MM-DD, dateDebut ≤ dateFin, format HH:mm — retourner 400 si invalide

## 3. Frontend — Panneau de filtres

- [x] 3.1 Créer le composant `DashboardFilters.tsx` dans `src/components/` avec : `RangePicker` Ant Design (dates), deux `TimePicker` (heure début / heure fin), boutons "Appliquer" et "Réinitialiser"
- [x] 3.2 Gérer l'état du filtre dans `DashboardPage.tsx` avec `useState` : `{ dateDebut, dateFin, heureDebut, heureFin }` — valeur initiale = aujourd'hui, 00:00–23:59
- [x] 3.3 Passer les paramètres de filtre aux fonctions API `getStatsJour` et `getHistoriqueJour` — mettre à jour les signatures dans `src/api/repas.ts`
- [x] 3.4 Mettre à jour les `queryKey` TanStack Query pour inclure les paramètres de filtre (invalidation automatique au changement)

## 4. Frontend — Logique SSE conditionnelle

- [x] 4.1 Dans `DashboardPage.tsx`, conditionner l'ouverture de l'`EventSource` à la présence de la date courante dans la plage de dates du filtre actif
- [x] 4.2 Masquer le badge "En direct" quand le SSE est suspendu, l'afficher quand actif

## 5. Frontend — Bouton export Excel

- [x] 5.1 Ajouter la fonction `getExportExcel(dateDebut, dateFin, heureDebut, heureFin)` dans `src/api/repas.ts` — appel Axios avec `responseType: 'blob'`
- [x] 5.2 Remplacer le bouton "Télécharger récapitulatif" actuel dans `DashboardPage.tsx` par un bouton "Exporter en Excel" utilisant les filtres actifs et déclenchant le `blob` download avec le nom `passages-{dateDebut}-{dateFin}.xlsx`
- [x] 5.3 Gérer l'état de chargement (`loading`) du bouton pendant le téléchargement

## 6. Vérification & tests

- [x] 6.1 Vérifier que le filtre par défaut (journée courante) affiche les mêmes données qu'avant la modification
- [x] 6.2 Vérifier qu'une plage de 7 jours avec filtre horaire 11h–14h retourne uniquement les passages de cette tranche
- [x] 6.3 Vérifier que le bouton "Exporter en Excel" génère un fichier XLSX valide (ouvrable dans Excel/LibreOffice)
- [x] 6.4 Vérifier que le SSE est suspendu sur une plage passée et réactivé sur la journée courante
- [x] 6.5 Vérifier que l'endpoint `/api/repas/export` retourne 400 si `dateDebut > dateFin`
