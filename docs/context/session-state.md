# État de Session — Cantine SEBN
**Sauvegardé :** 2026-04-14

## 🎯 Focus actuel
Initialisation du projet — installation des agents et configuration

## ✅ Complété
- CLAUDE.md créé
- .mcp.json configuré (Context7 + Playwright)
- .cursorrules créé
- .gitignore créé
- playwright.config.ts créé
- OpenSpec/ initialisé avec spec gestion-permissions
- Agents .claude/agents/ installés
- Structure docs/ initialisée

## 🔄 En cours
- **Feature :** gestion-permissions
- **Étape :** proposal — en attente de validation
- **Fichier :** OpenSpec/changes/gestion-permissions.md

## 📋 Prochaines étapes
1. Valider OpenSpec/changes/gestion-permissions.md
2. open-spec apply gestion-permissions
3. npx playwright test tests/e2e/permissions.spec.ts
4. open-spec archive gestion-permissions
5. git commit -m "feat: gestion-permissions"

## ⚠️ Points en attente
- Port TCP lecteurs Morpho (probablement 22090) — non confirmé
- Format trames Morpho — non confirmé
- Modèle imprimantes (58 ou 80 mm) — non confirmé
- Secret JWT projet Node.js existant — à récupérer

## 💡 Contexte critique
- Cantine.Core = AUCUNE dépendance externe (règle absolue)
- JWT identique au projet Node.js existant (même contrat, même secret)
- ESC/POS envoi direct TCP port 9100, pas de driver Windows
- SQL Server Express 10 GB max — safe pour 10+ ans
