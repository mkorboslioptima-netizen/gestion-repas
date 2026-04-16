import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  roles: string[];
  login: (token: string, roles: string[]) => void;
  logout: () => void;
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

  const login = (t: string, r: string[]) => {
    localStorage.setItem('token', t);
    localStorage.setItem('roles', JSON.stringify(r));
    setToken(t);
    setRoles(r);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    setToken(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ token, roles, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
