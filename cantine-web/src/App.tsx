import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme as antTheme } from 'antd';
import { AuthProvider, useAuth } from './auth/AuthContext';
import PrivateRoute from './auth/PrivateRoute';
import { useRole } from './auth/useRole';
import { SiteProvider, useSite } from './context/SiteContext';
import { useQuery } from '@tanstack/react-query';
import { getSites } from './api/sites';
import { createContext, useContext, useState, useEffect } from 'react';
import LecteursPage from './pages/admin/LecteursPage';
import SitesPage from './pages/admin/SitesPage';
import EmployesPage from './pages/admin/EmployesPage';
import ImprimantesPage from './pages/admin/ImprimantesPage';
import SupervisionPage from './pages/admin/SupervisionPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import GestionComptesPage from './pages/admin/GestionComptesPage';
import 'antd/dist/reset.css';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const queryClient = new QueryClient();

// ── Dark mode context ──────────────────────────────────────────────────────
const DarkModeContext = createContext<{ isDark: boolean; toggle: () => void }>({
  isDark: false,
  toggle: () => {},
});
const useDarkMode = () => useContext(DarkModeContext);

// ── Mapping route → titre page ────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/admin/lecteurs': 'Lecteurs',
  '/admin/employes': 'Employés',
  '/admin/sites': 'Sites',
  '/admin/comptes': 'Gestion des comptes',
  '/admin/imprimantes': 'Imprimantes',
  '/admin/shifts': 'Shifts — Créneaux horaires',
  '/admin/supervision': 'Supervision',
};

// ── Header bar ─────────────────────────────────────────────────────────────
function AppHeader() {
  const { siteId } = useSite();
  const location = useLocation();
  const { isDark, toggle } = useDarkMode();
  const title = PAGE_TITLES[location.pathname] ?? 'Cantine SEBN';

  return (
    <div className="app-header">
      <span className="app-header-title">{title}</span>
      {siteId && <span className="app-header-site">{siteId}</span>}
      <span className="app-header-date">
        {dayjs().format('ddd D MMM YYYY')}
      </span>
      <button
        className="app-header-theme-btn"
        onClick={toggle}
        title={isDark ? 'Mode clair' : 'Mode sombre'}
      >
        {isDark ? (
          /* Soleil */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          /* Lune */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar() {
  const { logout, siteId: authSiteId } = useAuth();
  const role = useRole();
  const isAdmin = role === 'AdminSEBN';
  const isGestionnaire = role === 'ResponsableCantine';
  const isPrestataire = role === 'Prestataire';

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
  });

  const initials = isAdmin ? 'AD' : isPrestataire ? 'PR' : 'RC';
  const avatarColor = isAdmin ? '#2563eb' : isPrestataire ? '#7c3aed' : '#059669';
  const userName = isAdmin ? 'Admin SEBN' : isPrestataire ? 'Prestataire' : (authSiteId ?? 'Responsable');

  return (
    <div style={{
      width: 220, minWidth: 220, background: 'var(--sidebar)',
      display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0,
    }}>
      {/* Marque */}
      <div className="sb-brand">
        <img src="/sebn.png" className="sb-brand-icon" alt="SEBN" />
        <div>
          <div className="sb-brand-name">Cantine SEBN</div>
          <div className="sb-brand-sub">v1.0 • {sites.length} sites</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        <div className="sb-section">
          <div className="sb-section-label">Principal</div>
          <NavLink to="/" end className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
            Tableau de bord
          </NavLink>
        </div>

        {(isAdmin || isGestionnaire) && (
          <div className="sb-section">
            <div className="sb-section-label">Gestion</div>
            {isAdmin && (
              <NavLink to="/admin/lecteurs" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
                <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
                Lecteurs
              </NavLink>
            )}
            <NavLink to="/admin/employes" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
              Employés
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/sites" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Sites
              </NavLink>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="sb-section">
            <div className="sb-section-label">Administration</div>
            <NavLink to="/admin/comptes" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              Gestion des comptes
            </NavLink>
            <NavLink to="/admin/imprimantes" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimantes
            </NavLink>
            <NavLink to="/admin/supervision" className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><path d="M1 6l5.5 5.5L10 8l4 8 3-5 2.5 2.5L23 6"/></svg>
              Supervision
            </NavLink>
          </div>
        )}
      </nav>

      {/* Créé par OPTIMA */}
      <div className="sb-optima">
        <span className="sb-optima-label">Créé par</span>
        <img src="/optima-blanc.svg" className="sb-optima-logo" alt="OPTIMA" />
      </div>

      {/* Pied de page */}
      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar" style={{ background: avatarColor }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-uname">{userName}</div>
            <div className="sb-urole">{role ?? ''}</div>
          </div>
          <button className="sb-logout" onClick={logout} title="Déconnexion">
            <svg viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Layout authentifié ─────────────────────────────────────────────────────
function AuthenticatedLayout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <AppHeader />
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admin/lecteurs" element={<LecteursPage />} />
            <Route
              path="/admin/employes"
              element={
                <PrivateRoute allowed={['AdminSEBN', 'ResponsableCantine']}>
                  <EmployesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/sites"
              element={
                <PrivateRoute requiredRole="AdminSEBN">
                  <SitesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/comptes"
              element={
                <PrivateRoute allowed={['AdminSEBN']}>
                  <GestionComptesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/imprimantes"
              element={
                <PrivateRoute allowed={['AdminSEBN']}>
                  <ImprimantesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/supervision"
              element={
                <PrivateRoute allowed={['AdminSEBN']}>
                  <SupervisionPage />
                </PrivateRoute>
              }
            />
            <Route path="/unauthorized" element={<div style={{ padding: 24 }}>Accès refusé.</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// ── Layout principal ───────────────────────────────────────────────────────
function AppLayout() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<AuthenticatedLayout />} />
    </Routes>
  );
}

// ── App root ───────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = () => setIsDark(d => !d);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteProvider>
            <ConfigProvider theme={{
              algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
              token: {
                colorPrimary: '#2563eb',
                borderRadius: 8,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
            }}>
              <BrowserRouter>
                <AppLayout />
              </BrowserRouter>
            </ConfigProvider>
          </SiteProvider>
        </AuthProvider>
      </QueryClientProvider>
    </DarkModeContext.Provider>
  );
}
