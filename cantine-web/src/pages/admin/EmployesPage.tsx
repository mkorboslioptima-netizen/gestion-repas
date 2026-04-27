import { useState, useMemo, useEffect } from 'react';
import {
  Button, Card, Col, Input, Row, Select, Space,
  Statistic, Table, Tag, Typography, notification,
} from 'antd';
import { DownloadOutlined, ImportOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import { getSites } from '../../api/sites';
import {
  getEmployeStats,
  getEmployes,
  getExportEmployes,
  importDepuisMorpho,
  type EmployeeDto,
  type EmployeeSiteStatsDto,
} from '../../api/employes';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../auth/AuthContext';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;

// ─── Carte statistiques par site ────────────────────────────────────────────

function SiteStatCard({ stat }: { stat: EmployeeSiteStatsDto }) {
  const s = stat.derniereSynchro;
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>{stat.nomSite}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{stat.siteId}</Text>
        </div>
        <Statistic
          title="Employés actifs"
          value={stat.totalActifs}
          prefix={<TeamOutlined />}
          valueStyle={{ fontSize: 22, color: '#1677ff' }}
        />
      </div>

      {s ? (
        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
          <Text type="secondary">
            Dernière synchro : <strong>{dayjs(s.occurredAt).fromNow()}</strong>
            {' '}
            <Tag color={s.source === 'Auto' ? 'blue' : 'green'} style={{ fontSize: 11 }}>
              {s.source === 'Auto' ? 'Auto' : 'Manuel'}
            </Tag>
          </Text>
          <br />
          <Text style={{ fontSize: 12 }}>
            {s.importes > 0 && <span style={{ color: '#389e0d' }}>+{s.importes} nouveaux </span>}
            {s.misAJour > 0 && <span style={{ color: '#d48806' }}>· {s.misAJour} mis à jour </span>}
            {s.desactives > 0 && <span style={{ color: '#cf1322' }}>· {s.desactives} désactivés </span>}
            {s.importes === 0 && s.misAJour === 0 && s.desactives === 0 && (
              <span style={{ color: '#999' }}>{s.ignores} inchangés</span>
            )}
          </Text>
        </div>
      ) : (
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          Aucune synchronisation effectuée
        </Text>
      )}
    </Card>
  );
}

// ─── Tableau des employés ───────────────────────────────────────────────────

const COLONNES = [
  { title: 'Matricule', dataIndex: 'matricule', key: 'matricule', sorter: (a: EmployeeDto, b: EmployeeDto) => a.matricule.localeCompare(b.matricule) },
  { title: 'Nom', dataIndex: 'nom', key: 'nom', sorter: (a: EmployeeDto, b: EmployeeDto) => a.nom.localeCompare(b.nom) },
  { title: 'Prénom', dataIndex: 'prenom', key: 'prenom', sorter: (a: EmployeeDto, b: EmployeeDto) => a.prenom.localeCompare(b.prenom) },
  {
    title: 'Statut', dataIndex: 'actif', key: 'actif',
    render: (actif: boolean) => <Tag color={actif ? 'green' : 'default'}>{actif ? 'Actif' : 'Inactif'}</Tag>,
  },
  { title: 'Quota', dataIndex: 'maxMealsPerDay', key: 'maxMealsPerDay', render: (v: number) => `${v} repas/j` },
];

// ─── Page principale ────────────────────────────────────────────────────────

export default function EmployesPage() {
  const { roles, siteId: authSiteId } = useAuth();
  const { siteId, setSiteId } = useSite();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes('AdminSEBN');
  const isGestionnaire = roles.includes('ResponsableCantine');

  const [loadingImport, setLoadingImport] = useState(false);
  const [filtreSite, setFiltreSite] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'inactif'>('tous');
  const [filtreQuota, setFiltreQuota] = useState<'tous' | '1' | '2'>('tous');
  const [exportLoading, setExportLoading] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: isAdmin,
  });

  const { data: allStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['employe-stats'],
    queryFn: getEmployeStats,
  });

  // Gestionnaire ne voit que les stats de son propre site
  const stats = isGestionnaire && authSiteId
    ? allStats.filter(s => s.siteId === authSiteId)
    : allStats;

  // Initialiser filtreSite au premier site disponible (admin uniquement)
  useEffect(() => {
    if (isAdmin && sites.length > 0 && filtreSite === null) {
      setFiltreSite(sites[0].siteId);
    }
  }, [isAdmin, sites, filtreSite]);

  // Site actif : filtreSite pour admin, site propre pour gestionnaire
  const tableSiteId = isAdmin
    ? (filtreSite ?? (sites.length > 0 ? sites[0].siteId : null))
    : (authSiteId ?? null);

  const { data: employes = [], isLoading: employesLoading } = useQuery({
    queryKey: ['employes', tableSiteId],
    queryFn: () => getEmployes(tableSiteId!),
    enabled: !!tableSiteId,
  });

  const employesFiltres = useMemo(() => {
    return employes.filter(e => {
      const q = search.toLowerCase();
      const matchTexte = !q
        || e.matricule.toLowerCase().includes(q)
        || e.nom.toLowerCase().includes(q)
        || e.prenom.toLowerCase().includes(q);
      const matchStatut = filtreStatut === 'tous'
        || (filtreStatut === 'actif' && e.actif)
        || (filtreStatut === 'inactif' && !e.actif);
      const matchQuota = filtreQuota === 'tous'
        || e.maxMealsPerDay === Number(filtreQuota);
      return matchTexte && matchStatut && matchQuota;
    });
  }, [employes, search, filtreStatut, filtreQuota]);

  async function handleExportExcel() {
    if (!tableSiteId) return;
    setExportLoading(true);
    try {
      const blob = await getExportEmployes(tableSiteId, {
        search: search || undefined,
        actif: filtreStatut === 'tous' ? undefined : filtreStatut === 'actif',
        maxMealsPerDay: filtreQuota === 'tous' ? undefined : Number(filtreQuota),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employes-${tableSiteId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notification.error({ message: 'Erreur lors de l\'export Excel' });
    } finally {
      setExportLoading(false);
    }
  }

  const invalidateStats = () => {
    queryClient.invalidateQueries({ queryKey: ['employe-stats'] });
    queryClient.invalidateQueries({ queryKey: ['employes', tableSiteId] });
  };

  const handleImport = async () => {
    if (!tableSiteId) {
      notification.warning({ message: 'Sélectionnez un site avant de lancer l\'import.' });
      return;
    }
    setLoadingImport(true);
    try {
      const result = await importDepuisMorpho(tableSiteId);
      notification.success({
        message: 'Import terminé',
        description: `Importés : ${result.importes} · Mis à jour : ${result.misAJour} · Désactivés : ${result.desactives} · Inchangés : ${result.ignores}`,
        duration: 8,
      });
      invalidateStats();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de la connexion à MorphoManager.';
      notification.error({ message: 'Échec de l\'import', description: msg, duration: 0 });
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      {/* ── Section statistiques par site ── */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>État par site</div>
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        {statsLoading
          ? <Col><Text type="secondary">Chargement...</Text></Col>
          : stats.map((s) => (
            <Col key={s.siteId} xs={24} sm={12} xl={8}>
              <SiteStatCard stat={s} />
            </Col>
          ))}
      </Row>

      {/* ── Section import / synchro — masquée pour les gestionnaires ── */}
      {isAdmin && <div className="admin-card" style={{ maxWidth: 560, marginBottom: 24, padding: 20 }}>
        <Title level={5} style={{ marginBottom: 8 }}>Import depuis MorphoManager</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Importe ou met à jour les employés d'un site spécifique. Opération idempotente — sans doublons ni désactivation.
        </Text>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {isAdmin && sites.length > 1 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Site</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Sélectionnez un site"
                value={siteId ?? undefined}
                onChange={(v) => setSiteId(v)}
              >
                {sites.map((s) => (
                  <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {!isAdmin && tableSiteId && (
            <Text>Site : <Text strong>{tableSiteId}</Text></Text>
          )}

          <Button
            type="primary"
            icon={<ImportOutlined />}
            loading={loadingImport}
            disabled={!tableSiteId}
            onClick={handleImport}
            size="large"
          >
            Importer depuis MorphoManager
          </Button>
        </Space>

        {/* Synchronisation tous les sites — masquée temporairement */}
      </div>}

      {/* ── Tableau des employés ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={5} style={{ margin: 0 }}>
          Liste des employés
          {tableSiteId && <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>— {tableSiteId}</Text>}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({employesFiltres.length})</Text>
        </Title>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportExcel}
          loading={exportLoading}
          disabled={!tableSiteId}
          type="primary"
          ghost
        >
          Export Excel
        </Button>
      </div>

      {/* Barre de filtres */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {isAdmin && (
          <Select
            value={filtreSite ?? undefined}
            onChange={setFiltreSite}
            style={{ width: 180 }}
            placeholder="Sélectionner un site..."
          >
            {sites.map(s => (
              <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
            ))}
          </Select>
        )}
        <Input.Search
          placeholder="Rechercher nom, prénom, matricule..."
          allowClear
          style={{ width: 280 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={filtreStatut}
          onChange={setFiltreStatut}
          style={{ width: 130 }}
        >
          <Select.Option value="tous">Tous statuts</Select.Option>
          <Select.Option value="actif">Actif</Select.Option>
          <Select.Option value="inactif">Inactif</Select.Option>
        </Select>
        <Select
          value={filtreQuota}
          onChange={setFiltreQuota}
          style={{ width: 140 }}
        >
          <Select.Option value="tous">Tous quotas</Select.Option>
          <Select.Option value="1">1 repas/j</Select.Option>
          <Select.Option value="2">2 repas/j</Select.Option>
        </Select>
      </div>

      <Table
        dataSource={employesFiltres}
        columns={COLONNES}
        rowKey="matricule"
        loading={employesLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
        locale={{ emptyText: 'Aucun employé trouvé' }}
        style={{ background: '#fff', borderRadius: 8 }}
      />
    </div>
  );
}
