## 1. Backend — Filtrage SSE par site

- [x] 1.1 Modifier `GET /api/repas/flux` dans `RepasController.cs` pour extraire le claim `siteId` du JWT de l'utilisateur authentifié
- [x] 1.2 Implémenter le filtrage côté diffusion SSE : n'émettre un événement vers une connexion que si `siteId` du passage correspond au claim `siteId` du client (ou si le client est `AdminSEBN` sans claim)
- [x] 1.3 Ajouter l'attribut `[Authorize]` sur l'endpoint SSE si non déjà présent (tous les rôles autorisés)
- [x] 1.4 Vérifier qu'aucune régression sur le comportement existant (dashboard utilise toujours le même endpoint)

## 2. Frontend — Navigation latérale

- [x] 2.1 Ajouter un item "Supervision" avec icône appropriée dans la navigation latérale (`Sidebar` ou composant de menu existant dans `App.tsx`)
- [x] 2.2 Configurer la route `/supervision` dans `App.tsx` pointant vers `SupervisionPage`
- [x] 2.3 Protéger la route avec `PrivateRoute` (tous les rôles authentifiés)

## 3. Frontend — Page SupervisionPage

- [x] 3.1 Créer `src/pages/SupervisionPage.tsx` avec les sections : compteurs en direct + feed live
- [x] 3.2 Implémenter l'appel initial `GET /api/stats/daily` au montage pour initialiser les compteurs du jour
- [x] 3.3 Établir la connexion `EventSource` vers `/api/repas/flux` au montage et la fermer au démontage (cleanup)
- [x] 3.4 Implémenter la mise à jour des compteurs (Total, Plats chauds, Sandwichs) à chaque événement SSE reçu
- [x] 3.5 Implémenter la liste live des passages (ajout en tête, limite FIFO à 50 entrées)
- [x] 3.6 Afficher pour chaque passage : matricule, nom, prénom, type de repas, heure, lecteur
- [x] 3.7 Implémenter le badge d'état de connexion SSE ("En direct" vert / "Reconnexion..." orange)
- [x] 3.8 Réinitialiser les compteurs depuis `/api/stats/daily` lors d'une reconnexion SSE réussie

## 4. Tests et validation

- [x] 4.1 Vérifier que `ResponsableCantine` ne voit que les passages de son site dans le feed supervision
- [x] 4.2 Vérifier que `Prestataire` ne voit que les passages de son site dans le feed supervision
- [x] 4.3 Vérifier que `AdminSEBN` voit les passages de tous les sites
- [x] 4.4 Vérifier que le dashboard existant n'est pas impacté par la modification de l'endpoint SSE
- [x] 4.5 Vérifier que la connexion SSE se ferme correctement lors de la navigation hors de la page supervision
