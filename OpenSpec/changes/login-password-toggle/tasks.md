# Tasks — login-password-toggle

## T1 — ✅ Ajouter l'import des icônes et l'état `showPassword` dans `LoginPage.tsx`

Fichier : `cantine-web/src/pages/LoginPage.tsx`

1. Ajouter l'import : `import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';`
2. Ajouter l'état : `const [showPassword, setShowPassword] = useState(false);`

## T2 — ✅ Remplacer le champ mot de passe par la version avec toggle

Fichier : `cantine-web/src/pages/LoginPage.tsx`

Champ `<input type="password">` remplacé par un `<div>` relatif avec input + bouton œil positionné absolument.

## T3 — ✅ Vérification TypeScript

0 erreur TypeScript.

## T4 — Test manuel

- Ouvrir la page de login sur http://localhost:5173
- Taper un mot de passe dans le champ → les caractères sont masqués (••••••••)
- Cliquer sur l'icône œil → le mot de passe devient visible, l'icône change (œil barré)
- Recliquer → remasqué
- Soumettre le formulaire → la connexion fonctionne normalement
