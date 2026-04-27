## Architecture

Modification purement frontend, fichier unique `LoginPage.tsx`. Utilise les icônes Ant Design déjà disponibles dans le projet.

## Composant modifié — `LoginPage.tsx`

### État à ajouter

```typescript
const [showPassword, setShowPassword] = useState(false);
```

### Import à ajouter

```typescript
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
```

### Structure du champ mot de passe

Envelopper l'`<input>` dans un `<div>` relatif et ajouter un `<button>` absolu à droite :

```tsx
<div style={{ position: 'relative' }}>
  <input
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={e => setPassword(e.target.value)}
    required
    autoComplete="current-password"
    placeholder="••••••••"
    style={{
      width: '100%', padding: '10px 40px 10px 12px', border: '1px solid var(--border)',
      borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--bg)', outline: 'none',
      boxSizing: 'border-box',
    }}
  />
  <button
    type="button"
    onClick={() => setShowPassword(v => !v)}
    style={{
      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--text2)', padding: 0, display: 'flex', alignItems: 'center',
    }}
    tabIndex={-1}
    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
  >
    {showPassword ? <EyeInvisibleOutlined style={{ fontSize: 16 }} /> : <EyeOutlined style={{ fontSize: 16 }} />}
  </button>
</div>
```

**Notes :**
- `padding: '10px 40px 10px 12px'` — espace à droite pour que le texte ne passe pas sous l'icône
- `type="button"` — empêche la soumission du formulaire au clic
- `tabIndex={-1}` — le bouton est exclu de la navigation clavier (focus reste sur l'input)
- `boxSizing: 'border-box'` — garantit que le padding ne dépasse pas la largeur du champ
