import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

interface SiteContextValue {
  /** SiteId actif. Null = AdminSEBN en vue globale (tous les sites). */
  siteId: string | null;
  /** Permet à AdminSEBN de changer le site actif (null = vue globale). */
  setSiteId: (id: string | null) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

/** Décode le claim `siteId` du JWT sans librairie tierce. */
function getSiteIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.siteId ?? null;
  } catch {
    return null;
  }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { token, roles } = useAuth();
  const isAdmin = roles.includes('AdminSEBN');

  // Pour AdminSEBN : siteId est mutable (null = vue globale). Pour les autres : fixe depuis le JWT.
  const tokenSiteId = useMemo(() => getSiteIdFromToken(token), [token]);
  const [adminSiteId, setAdminSiteId] = useState<string | null>(null);

  const siteId = isAdmin ? adminSiteId : tokenSiteId;
  const setSiteId = (id: string | null) => {
    if (isAdmin) setAdminSiteId(id);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
