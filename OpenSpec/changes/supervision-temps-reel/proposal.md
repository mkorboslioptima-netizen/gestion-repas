## Why

Le dashboard actuel mélange les statistiques globales et le flux live sans offrir une vue dédiée à la supervision opérationnelle des passages. Les gestionnaires de restaurant et le prestataire ont besoin d'un écran dédié, accessible en un clic depuis la navigation latérale, pour surveiller en temps réel les pointages biométriques sur leur(s) site(s) respectifs.

## What Changes

- Ajout d'un **onglet "Supervision"** dans la barre de navigation latérale gauche (icône dédiée, visible pour tous les rôles authentifiés)
- Nouvelle page `/supervision` affichant un **feed live des passages** (SSE) filtré par site selon le rôle de l'utilisateur connecté
- Le **Gestionnaire de restaurant** (`ResponsableCantine`) ne voit que les passages de son site assigné
- Le **Prestataire** ne voit que les passages sur ses sites contractuels
- L'**AdminSEBN** voit tous les sites avec possibilité de filtrer
- Affichage en temps réel : carte par passage (matricule, nom, prénom, type de repas, heure, lecteur) mis à jour instantanément via l'`EventSource` natif
- Compteurs en direct : total passages, plats chauds, sandwichs — mis à jour à chaque événement SSE

## Capabilities

### New Capabilities
- `supervision-live` : Page de supervision en temps réel — onglet dédié dans la navigation, feed SSE filtré par site selon le rôle, compteurs live, sans actions de modification

### Modified Capabilities
- `meal-flux-sse` : L'endpoint SSE `/api/repas/flux` SHALL accepter un paramètre optionnel `?siteId=` pour filtrer les événements côté serveur selon le site de l'utilisateur connecté (scope role-based automatique)

## Impact

- **Frontend** : `src/App.tsx` (ajout route `/supervision`), `src/components/Sidebar.tsx` ou navigation principale (ajout onglet), nouvelle page `src/pages/SupervisionPage.tsx`
- **Backend** : `Cantine.API/Controllers/RepasController.cs` (modification de l'endpoint SSE `/api/repas/flux` pour filtrage par site)
- **Rôles** : `AdminSEBN`, `ResponsableCantine`, `Prestataire` — tous accèdent à la page supervision (scope de données différent par rôle)
- **Aucune modification de schéma BDD** requise
