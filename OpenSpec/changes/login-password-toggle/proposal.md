## Why

Le champ mot de passe sur la page de connexion ne permet pas à l'utilisateur de vérifier ce qu'il a tapé. En cas de faute de frappe, il est obligé d'effacer et de recommencer. Ajouter un bouton œil améliore l'expérience de connexion sans impact sur la sécurité.

## What Changes

- Ajouter un bouton icône œil à droite du champ mot de passe sur `LoginPage.tsx`
- Cliquer sur l'icône bascule entre `type="password"` (masqué, œil barré) et `type="text"` (visible, œil ouvert)
- Le bouton est positionné à l'intérieur du champ, sans modifier le design existant

## Capabilities

### Modified Capabilities
- `login-form` : le champ mot de passe dispose d'un toggle afficher/masquer

## Impact

- **Frontend** : `cantine-web/src/pages/LoginPage.tsx` uniquement — ajout d'un état `showPassword` + icône `EyeOutlined`/`EyeInvisibleOutlined` d'Ant Design
- **Aucun changement** backend, API, ni autre fichier
