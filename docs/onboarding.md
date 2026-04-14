# Guide d'Onboarding — Cantine SEBN

Mis à jour par l'agent `docs-writer` après chaque feature.

---

## Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| .NET SDK | 8.0 LTS | `dotnet --version` |
| Node.js | 18 LTS | `node --version` |
| npm | 9.x | `npm --version` |
| SQL Server Express | 2022 | Services Windows |
| Git | 2.x | `git --version` |

---

## Installation initiale

### 1. Cloner le projet
```bash
git clone https://github.com/mkorboslioptima-netizen/gestion-repas.git
cd gestion-repas
```

### 2. Variables d'environnement
```bash
cp .env.example .env
# Remplir les valeurs dans .env :
# - DB_PASSWORD (SQL Server Express)
# - JWT_SECRET (identique au projet Node.js existant)
# - MORPHO_TCP_PORT (à confirmer avec le fournisseur)
```

### 3. Backend — ASP.NET Core
```bash
dotnet restore
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API
dotnet run --project Cantine.API
# API disponible sur http://localhost:5000
```

### 4. Service TCP Listener (développement)
```bash
dotnet run --project Cantine.TcpListener
# Démarre l'écoute des trames Morpho sur MORPHO_TCP_PORT
```

### 5. Frontend — React 18
```bash
cd cantine-web
npm install
npm run dev
# Frontend disponible sur http://localhost:5173
```

---

## Commandes fréquentes

### Backend
```bash
# Créer une nouvelle migration EF Core
dotnet ef migrations add [NomMigration] --project Cantine.Infrastructure --startup-project Cantine.API

# Appliquer les migrations
dotnet ef database update --project Cantine.Infrastructure --startup-project Cantine.API

# Build release
dotnet publish Cantine.API -c Release -o ./publish/api
dotnet publish Cantine.TcpListener -c Release -o ./publish/service
```

### Frontend
```bash
cd cantine-web
npm run dev        # Démarrage dev (HMR)
npm run build      # Build production
npm run preview    # Prévisualisation du build
npm run typecheck  # Vérification TypeScript
```

### Tests Playwright
```bash
npx playwright test                              # Tous les tests
npx playwright test tests/e2e/permissions.spec.ts  # Tests auth uniquement
npx playwright test --ui                         # Interface graphique
npx playwright test --headed                     # Mode visible (debug)
```

---

## Workflow de développement (OpenSpec)

```bash
# 1. Proposer une feature
open-spec proposal [nom_feature]

# 2. Relire OpenSpec/changes/[nom_feature].md et valider

# 3. Appliquer (génération de code)
open-spec apply [nom_feature]

# 4. Demander une review architecturale
# → "review this implementation"

# 5. Tester
npx playwright test tests/e2e/[feature].spec.ts

# 6. Archiver
open-spec archive [nom_feature]

# 7. Documenter
# → "document the [feature] feature"

# 8. Commit et push
git add . && git commit -m "feat: [nom_feature]" && git push
```

---

## Règles métier clés

| Règle | Détail |
|-------|--------|
| Quota standard | 1 repas par jour par employé |
| Quota gardiens | 2 repas par jour (configuré en base) |
| Bouton ENTRÉE | Plat chaud (Repas Type 1) |
| Bouton SORTIE | Sandwich / Repas froid (Repas Type 2) |
| Token JWT | Expiration 8h (durée d'un shift) |
| Impression | ESC/POS via TCP port 9100, 1 imprimante par lecteur |

---

## Points à confirmer avant développement

> Ces informations sont bloquantes — à obtenir du fournisseur ou de l'équipe IT.

| # | Point | Impact |
|---|-------|--------|
| 1 | Port TCP lecteurs Morpho (probablement 22090) | `MorphoFrameParser.cs` |
| 2 | Format trames Morpho (ASCII ou binaire ?) | `MorphoFrameParser.cs` |
| 3 | Modèle imprimantes (58 ou 80 mm) | `EscPosService.cs` |
| 4 | Secret JWT du projet Node.js existant | `AuthService.cs`, `Program.cs` |
| 5 | Nombre de lecteurs Phase 1 | Architecture multi-readers |
