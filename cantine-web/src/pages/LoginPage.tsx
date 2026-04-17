import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// TODO: remplacer par un vrai appel POST /api/auth/login avant mise en production
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ0ZXN0LWFkbWluIiwibmFtZSI6IlRlc3QgQWRtaW4iLCJodHRwOi8vc2NoZW1hcy5taWNy' +
  'b3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pblNFQk4iLCJpc3Mi' +
  'OiJDYW50aW5lU0VCTiIsImF1ZCI6IkNhbnRpbmVTRUJOIiwiaWF0IjoxNzc2NDE2OTM3LCJleHAiOjE3' +
  'ODUwMDAwMDB9.placeholder';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@sebn.tn');
  const [password, setPassword] = useState('');

  const doLogin = (role: string) => {
    // En dev : connexion rapide sans appel API
    login(DEV_TOKEN, [role]);
    navigate('/', { replace: true });
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, background: '#2563eb', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16,
          }}>M</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>MealOps</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Gestion repas multi-sites</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
          Connectez-vous pour accéder à votre espace.
        </p>

        {/* Champs */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--bg)', outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => doLogin('AdminSEBN')}
          style={{
            width: '100%', padding: 11, background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Se connecter
        </button>

        {/* Connexion rapide (dev uniquement) */}
        {import.meta.env.DEV && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>Connexion rapide (dev) :</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'AdminSEBN', role: 'AdminSEBN' },
                { label: 'Responsable', role: 'ResponsableCantine' },
              ].map(({ label, role }) => (
                <button
                  key={role}
                  onClick={() => doLogin(role)}
                  style={{
                    padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 20,
                    fontSize: 11, color: 'var(--text2)', cursor: 'pointer', background: 'none',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--primary-light)'; (e.target as HTMLElement).style.borderColor = '#2563eb'; (e.target as HTMLElement).style.color = '#2563eb'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text2)'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
