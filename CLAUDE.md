# CLAUDE.md — Manuel d'Instructions Projet Cantine SEBN

> Ce fichier est le point d'entrée pour Claude Code. Il contient les règles de codage, l'aperçu de l'architecture et les liens vers la documentation complète.

---

## 📂 Documentation de Référence

| Fichier | Description |
|---------|-------------|
| [`prd.md`](./prd.md) | Product Requirements Document — fonctionnalités, roadmap phases 1-3 |
| [`architecture.md`](./ARCHITECTURE.md) | Architecture technique complète — stack, schéma BDD, flux de traitement |
| [`OpenSpec/`](./OpenSpec/) | Spécifications fonctionnelles générées par open-spec |
| [`docs/architecture-decisions.md`](./docs/architecture-decisions.md) | Décisions architecturales (mis à jour par `architect-review`) |
| [`docs/api/endpoints.md`](./docs/api/endpoints.md) | Documentation de tous les endpoints REST |
| [`docs/context/session-state.md`](./docs/context/session-state.md) | État de session sauvegardé entre les conversations |

---

## 🏗️ Vue d'Ensemble du Projet

Système automatisé de gestion des repas pour SEBN basé sur des lecteurs biométriques **Morpho Sigma Lite+**.

- **Backend :** ASP.NET Core 8 Web API + Windows Service (TCP Listener)
- **Frontend :** React 18 + TypeScript + Ant Design
- **Base de données :** SQL Server Express 2022
- **Hébergement :** IIS 10 + Windows sur serveur interne

---

## 🔧 Stack Technique

```
Backend   : ASP.NET Core 8, Entity Framework Core 8, JWT Auth
Service   : C# BackgroundService (.NET 8 Windows Service)
Frontend  : React 18, TypeScript, Vite, Ant Design 5, Recharts, TanStack Query
Base BDD  : SQL Server Express 2022
Export    : ClosedXML
Temps réel: Server-Sent Events (SSE)
Impression: ESC/POS via TCP port 9100
```

---

## 📐 Règles de Codage

### Général
- **Une fonctionnalité à la fois** — ne jamais implémenter plusieurs features simultanément
- Toujours suivre le cycle : `proposal → validation → apply → test → archive → commit`
- Les fichiers générés par `open-spec` dans `OpenSpec/changes/` doivent être relus avant `apply`

### C# / ASP.NET Core
- Respecter la séparation en couches : `Core` (entités/interfaces) → `Infrastructure` (implémentations) → `API` (controllers)
- `Cantine.Core` ne doit avoir **aucune dépendance** externe (pas de EF Core, pas de System.Net)
- Utiliser les interfaces définies dans `Cantine.Core/Interfaces/` pour toute injection de dépendances
- Les controllers ne contiennent **aucune logique métier** — déléguer aux services
- Nommage : PascalCase pour classes/méthodes, camelCase pour variables locales
- Toujours utiliser `async/await` pour les opérations I/O (BDD, réseau)
- Les endpoints SSE utilisent `Response.Body` avec `text/event-stream` et flush explicite

### Entity Framework
- Les migrations sont dans `Cantine.Infrastructure/Data/Migrations/`
- Ne jamais modifier une migration existante — créer une nouvelle
- Utiliser `AsNoTracking()` pour les requêtes en lecture seule

### React / TypeScript
- Typage strict — pas de `any` sauf cas exceptionnel documenté
- Les composants de page sont dans `src/pages/`, les composants réutilisables dans `src/components/`
- Les appels API passent **exclusivement** par `src/api/axios.ts` (interceptors JWT inclus)
- Utiliser TanStack Query pour le cache et la gestion d'état serveur
- `EventSource` natif pour la connexion SSE — pas de librairie tierce
- L'`AuthContext` et `PrivateRoute` de `src/auth/` ne sont **pas modifiés** (hérités du projet existant)

### Sécurité
- Les rôles sont : `AdminSEBN` (accès total) et `ResponsableCantine` (dashboard + export uniquement)
- Le secret JWT doit être identique entre le projet Node.js existant et ASP.NET Core pendant la migration
- Ne jamais logger les données sensibles (tokens, mots de passe)

### Base de Données
- Schéma Phase 1 uniquement tant que la Phase 2 n'est pas lancée
- Toute modification du schéma passe par une migration EF Core nommée explicitement
- Les contraintes de quota (1 repas/jour standard, 2/jour gardiens) sont vérifiées côté service, pas uniquement en BDD

---

## 🚦 Workflow de Développement (OpenSpec)

```bash
# 1. Proposer une nouvelle fonctionnalité
open-spec proposal [nom_fonctionnalité]

# 2. Relire la spec générée
# → OpenSpec/changes/[nom_fonctionnalité].md

# 3. Appliquer (génération de code)
open-spec apply [nom_changement]

# 4. Tester avec Playwright
npx playwright test

# 5. Archiver et mettre à jour la doc
open-spec archive [nom_changement]

# 6. Commit et push
git add . && git commit -m "feat: [nom_fonctionnalité]" && git push
```

---

## 🤖 Agents Claude Code

Trois agents spécialisés sont configurés dans `.claude/agents/` :

| Agent | Modèle | Déclenchement | Rôle |
|-------|--------|---------------|------|
| `architect-review` | Opus | "review", "check my code", après `open-spec apply` | Vérifie les violations de couches, sécurité, patterns |
| `docs-writer` | Sonnet | "document this feature", après `open-spec archive` | Génère `docs/features/`, met à jour `docs/api/endpoints.md` |
| `context-manager` | Haiku | "save context", "where are we?", avant `/clear` | Sauvegarde/restaure l'état de session |

---

## 🛠️ Outils MCP Configurés

| Outil | Usage |
|-------|-------|
| **Context7** | Documentation à jour (ASP.NET Core, EF Core, Ant Design) |
| **Playwright** | Tests d'interface automatisés |

Voir `.mcp.json` pour la configuration complète.

---

## 📋 Commandes Slash Utiles

| Commande | Description |
|----------|-------------|
| `/init` | Réinitialise CLAUDE.md |
| `/context` | Affiche l'utilisation des tokens |
| `/clear` | Nettoie le contexte (avant chaque nouvelle fonctionnalité) |
| `/mcp` | Vérifie les connexions MCP |
| `/usage` | Consommation du forfait |

---

## 🗂️ Structure du Projet

```
Cantine.sln
├── Cantine.Core/               # Entités, interfaces, DTOs
├── Cantine.Infrastructure/     # EF Core, TCP Parser, ESC/POS, Excel
├── Cantine.TcpListener/        # Windows Service
├── Cantine.API/                # ASP.NET Core Web API
├── cantine-web/                # React 18 + TypeScript
├── OpenSpec/                   # Spécifications open-spec
│   ├── changes/                # Specs en cours
│   └── archive/                # Specs archivées
├── tests/
│   └── e2e/                    # Tests Playwright
├── docs/
│   ├── architecture-decisions.md  # Décisions archi (agent architect-review)
│   ├── reviews/                   # Reviews post-feature (agent architect-review)
│   ├── features/                  # Doc par feature (agent docs-writer)
│   ├── api/endpoints.md           # Endpoints REST (agent docs-writer)
│   └── context/session-state.md  # État de session (agent context-manager)
├── .claude/
│   └── agents/                    # Agents Claude Code
├── CLAUDE.md                   ← CE FICHIER
├── prd.md
├── ARCHITECTURE.md
├── .mcp.json
└── .cursorrules
```

---

## ⚠️ Points à Confirmer Avant Développement

1. **Port TCP lecteurs Morpho** — probablement 22090, format trame à vérifier
2. **Nombre de lecteurs Phase 1** — impacte architecture multi-readers
3. **Accès MorphoManager** — API ou import SQL direct (Phase 2)
4. **Modèle imprimantes thermiques** — largeur papier 58 ou 80 mm
5. **Secret JWT actuel** — valeur du projet Node.js existant

---

## 🚀 Démarrage Rapide

```bash
# Backend
dotnet restore
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
dotnet run --project Cantine.API

# Service TCP (développement)
dotnet run --project Cantine.TcpListener

# Frontend
cd cantine-web
npm install
npm run dev
```

---

## 🎨 Style Visuel

- Interface claire et minimaliste
- Pas de mode sombre pour le MVP

---

## 🔒 Contraintes et Politiques

- Ne jamais exposer les clés API au client (front-end)
- Préférer les composants existants plutôt que d'ajouter de nouvelles bibliothèques UI

---

## ✅ Tests UI Obligatoires

À la fin de chaque développement impliquant l'interface graphique :
- Lancer les tests via le skill Playwright (`/playwright-skill`)
- L'interface doit être **responsive**, **fonctionnelle** et **répondre au besoin développé**

---

## 📚 Documentation

Les spécifications fonctionnelles et techniques sont dans :
- [`prd.md`](./prd.md) — Objectif du projet, fonctionnalités, roadmap
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architecture globale, stack, schéma BDD, flux de traitement

---

## 🔍 Context7 — Règle d'Utilisation Automatique

Utiliser **toujours** Context7 (MCP) dans les cas suivants, **sans attendre une demande explicite** :
- Génération de code impliquant une bibliothèque (React, EF Core, ASP.NET Core, Ant Design…)
- Étapes de configuration ou d'installation
- Documentation d'une bibliothèque ou d'une API

Séquence obligatoire : `mcp__context7__resolve-library-id` → `mcp__context7__query-docs`

---

## 🌐 Langue des Spécifications

- Toutes les spécifications (OpenSpec inclus) sont rédigées **en français**
- Les sections `Purpose` et `Scenarios` des specs OpenSpec sont **en français**
- Seuls les titres de `Requirements` restent **en anglais** avec les mots-clés `SHALL` / `MUST` (requis pour la validation OpenSpec)
