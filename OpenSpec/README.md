# OpenSpec — Cantine SEBN

Répertoire de gestion des spécifications fonctionnelles du projet.

## Structure

```
OpenSpec/
├── changes/     # Specs en cours (proposal → apply → test)
└── archive/     # Specs archivées après implémentation validée
```

## Workflow

```bash
# Proposer une fonctionnalité
open-spec proposal gestion-permissions

# Relire la spec dans OpenSpec/changes/gestion-permissions.md
# Demander des corrections si nécessaire

# Appliquer (génération du code)
open-spec apply gestion-permissions

# Tester avec Playwright
npx playwright test tests/e2e/permissions.spec.ts

# Archiver une fois validé
open-spec archive gestion-permissions

# Commit
git add . && git commit -m "feat: gestion-permissions" && git push
```

## Specs en cours

| Fichier | Statut |
|---------|--------|
| [changes/gestion-permissions.md](changes/gestion-permissions.md) | 📝 En attente de validation |

## Specs archivées

_(vide — projet en initialisation)_
