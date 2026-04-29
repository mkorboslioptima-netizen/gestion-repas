import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { login as apiLogin } from '../api/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiLogin(email, password);
      login(result.token);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <img src="/sebn.png" style={{ width: 38, height: 38, objectFit: 'contain' }} alt="SEBN" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Cantine SEBN</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Gestion repas multi-sites</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
          Connectez-vous pour accéder à votre espace.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--bg)', outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
              Mot de passe
            </label>
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
                {showPassword
                  ? <EyeInvisibleOutlined style={{ fontSize: 16 }} />
                  : <EyeOutlined style={{ fontSize: 16 }} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 11, background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* Créé par OPTIMA */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Créé par</span>
            <img src="/optima.jpg" style={{ height: 42, objectFit: 'contain' }} alt="OPTIMA" />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>© 2026</span>
        </div>
      </div>
    </div>
  );
}
