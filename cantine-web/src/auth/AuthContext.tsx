import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  roles: string[];
  siteId: string | null;
  login: (token: string) => void;
  logout: () => void;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [roles, setRoles] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('roles') ?? '[]');
    } catch {
      return [];
    }
  });
  const [siteId, setSiteId] = useState<string | null>(() => localStorage.getItem('siteId'));

  const login = (t: string) => {
    const payload = decodeJwtPayload(t);
    const role = (payload['role'] as string) ?? '';
    const sid = (payload['siteId'] as string) ?? null;

    localStorage.setItem('token', t);
    localStorage.setItem('roles', JSON.stringify(role ? [role] : []));
    if (sid) localStorage.setItem('siteId', sid);
    else localStorage.removeItem('siteId');

    setToken(t);
    setRoles(role ? [role] : []);
    setSiteId(sid);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('siteId');
    setToken(null);
    setRoles([]);
    setSiteId(null);
  };

  return (
    <AuthContext.Provider value={{ token, roles, siteId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
