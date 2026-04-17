import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Layout, Menu, Select, Typography } from 'antd';
import { SettingOutlined, GlobalOutlined, TeamOutlined, DashboardOutlined } from '@ant-design/icons';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SiteProvider, useSite } from './context/SiteContext';
import PrivateRoute from './auth/PrivateRoute';
import LecteursPage from './pages/admin/LecteursPage';
import SitesPage from './pages/admin/SitesPage';
import EmployesPage from './pages/admin/EmployesPage';
import DashboardPage from './pages/DashboardPage';
import { useQuery } from '@tanstack/react-query';
import { getSites } from './api/sites';
import 'antd/dist/reset.css';


const { Sider, Content } = Layout;
const { Title } = Typography;

const queryClient = new QueryClient();

function SiteSelector() {
  const { roles } = useAuth();
  const { siteId, setSiteId } = useSite();
  const isAdmin = roles.includes('AdminSEBN');

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: isAdmin,
  });

  if (!isAdmin || sites.length < 2) return null;

  return (
    <div style={{ padding: '8px 16px' }}>
      <Select
        style={{ width: '100%' }}
        value={siteId ?? '__global__'}
        onChange={(v) => setSiteId(v === '__global__' ? null : v)}
        size="small"
      >
        <Select.Option value="__global__">Tous les sites</Select.Option>
        {sites.map((s) => (
          <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
        ))}
      </Select>
    </div>
  );
}

function AppLayout() {
  const { roles } = useAuth();
  const isAdmin = true; // TODO: remettre `roles.includes('AdminSEBN')` avant mise en production
  void roles;

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/admin/lecteurs',
      icon: <SettingOutlined />,
      label: <Link to="/admin/lecteurs">Lecteurs</Link>,
    },
    ...(isAdmin
      ? [
          {
            key: '/admin/employes',
            icon: <TeamOutlined />,
            label: <Link to="/admin/employes">Employés</Link>,
          },
          {
            key: '/admin/sites',
            icon: <GlobalOutlined />,
            label: <Link to="/admin/sites">Sites</Link>,
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ padding: '16px 24px' }}>
          <Title level={5} style={{ color: '#fff', margin: 0 }}>Cantine SEBN</Title>
        </div>
        <SiteSelector />
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>
      <Layout>
        <Content style={{ background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            {/* TODO: remettre PrivateRoute sur toutes les routes avant mise en production */}
            <Route path="/admin/lecteurs" element={<LecteursPage />} />
            <Route path="/admin/employes" element={<EmployesPage />} />
            <Route path="/admin/sites" element={<SitesPage />} />
            <Route path="/unauthorized" element={<div style={{ padding: 24 }}>Accès refusé.</div>} />
            <Route path="/login" element={<div style={{ padding: 24 }}>Page de connexion (à implémenter).</div>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteProvider>
          <ConfigProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </ConfigProvider>
        </SiteProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
