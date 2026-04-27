## Context

Le système dispose déjà d'un endpoint SSE `GET /api/repas/flux` qui diffuse les passages biométriques en temps réel. Le dashboard actuel consomme ce flux mais le mélange avec des statistiques globales sur une seule page. Il n'existe pas de vue dédiée à la supervision opérationnelle.

L'architecture multi-site est en place (`siteId` dans le JWT, filtrage automatique côté services) mais l'endpoint SSE ne filtre pas encore par site — il émet tous les événements à tous les clients connectés.

Contraintes :
- Rôles : `AdminSEBN` (global), `ResponsableCantine` (site assigné via JWT `siteId`), `Prestataire` (site assigné, lecture seule)
- Stack existante : React 18 + `EventSource` natif, ASP.NET Core 8, `IEventBroadcaster` (ou mécanisme équivalent pour la diffusion SSE)

## Goals / Non-Goals

**Goals:**
- Ajouter un onglet "Supervision" dans la navigation latérale gauche
- Créer une page dédiée `/supervision` avec feed live SSE et compteurs en direct
- Filtrer les événements SSE par site selon le rôle de l'utilisateur (côté serveur)
- Même expérience pour `ResponsableCantine` et `Prestataire` : chacun ne voit que son site

**Non-Goals:**
- Historique des passages (la page supervision est uniquement "ce qui se passe maintenant")
- Actions CRUD sur les passages depuis la page supervision
- Alertes ou notifications push (hors scope MVP)
- Supervision multi-sites simultanée pour le Prestataire (scope = un site par connexion)

## Decisions

### D1 — Filtrage SSE côté serveur via claim JWT (pas de paramètre URL)

**Choix** : L'endpoint `GET /api/repas/flux` extrait automatiquement le `siteId` du claim JWT de l'utilisateur connecté. Si le claim est absent (`AdminSEBN`), tous les événements sont diffusés. Si présent, seuls les événements du site concerné sont envoyés.

**Alternatif écarté** : Paramètre `?siteId=` en query string — pose un problème de sécurité (un `ResponsableCantine` pourrait passer le siteId d'un autre site).

**Rationale** : Le JWT est déjà la source de vérité du périmètre ; le reproduire côté serveur est cohérent avec le pattern `site-scoped-access` existant.

---

### D2 — Page supervision séparée du dashboard (pas de fusion)

**Choix** : Nouvelle route `/supervision` avec une page dédiée `SupervisionPage.tsx`. La page dashboard reste inchangée.

**Alternatif écarté** : Ajouter un onglet "Supervision" dans le dashboard existant — augmenterait la complexité du composant et mélangerait les responsabilités.

**Rationale** : Séparation claire des responsabilités, navigation directe depuis la sidebar.

---

### D3 — Compteurs live calculés côté client à partir du flux SSE (sans appel API séparé)

**Choix** : À chaque événement SSE reçu, le composant React incrémente les compteurs locaux (`total`, `platsChauds`, `sandwichs`). Un appel initial `GET /api/stats/daily` charge les totaux du jour au montage du composant.

**Alternatif écarté** : Polling périodique de `/api/stats/daily` pour les compteurs — moins réactif et génère des appels inutiles.

**Rationale** : L'état SSE est déjà disponible côté client ; calculer localement évite une charge serveur supplémentaire.

## Risks / Trade-offs

- **[Risque] Perte d'événements si la connexion SSE est interrompue** → Mitigation : afficher un badge "Reconnexion..." et réinitialiser les compteurs depuis `/api/stats/daily` à chaque reconnexion `EventSource`.
- **[Risque] Surcharge mémoire si le feed live accumule des centaines de passages** → Mitigation : limiter la liste live à 50 entrées maximum côté React (FIFO).
- **[Trade-off] Compteurs repartent de zéro si l'utilisateur recharge la page** → Acceptable pour une vue de supervision opérationnelle (pas d'historique requis).
