import { useState } from 'react';
import {
  Button, Card, Col, Divider, Row, Select, Space,
  Statistic, Table, Tag, Typography, notification,
} from 'antd';
import { ImportOutlined, SyncOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import { getSites } from '../../api/sites';
import {
  getEmployeStats,
  getEmployes,
  importDepuisMorpho,
  syncMorpho,
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
  const { roles } = useAuth();
  const { siteId, setSiteId } = useSite();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes('AdminSEBN');

  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: isAdmin,
  });

  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['employe-stats'],
    queryFn: getEmployeStats,
  });

  // Site actif pour le tableau : siteId du contexte, ou premier site disponible
  const tableSiteId = siteId ?? (sites.length > 0 ? sites[0].siteId : null);

  const { data: employes = [], isLoading: employesLoading } = useQuery({
    queryKey: ['employes', tableSiteId],
    queryFn: () => getEmployes(tableSiteId!),
    enabled: !!tableSiteId,
  });

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

  const handleSync = async () => {
    setLoadingSync(true);
    try {
      await syncMorpho();
      notification.info({
        message: 'Synchronisation lancée',
        description: 'La synchronisation de tous les sites configurés est en cours en arrière-plan.',
        duration: 6,
      });
      // Rafraîchir après un délai pour laisser la synchro démarrer
      setTimeout(invalidateStats, 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors du déclenchement de la synchronisation.';
      notification.error({ message: 'Échec', description: msg, duration: 0 });
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Employés</Title>

      {/* ── Section statistiques par site ── */}
      <Title level={5} style={{ marginBottom: 12 }}>État par site</Title>
      <Row gutter={[16, 0]} style={{ marginBottom: 24 }}>
        {statsLoading
          ? <Col><Text type="secondary">Chargement...</Text></Col>
          : stats.map((s) => (
            <Col key={s.siteId} xs={24} sm={12} xl={8}>
              <SiteStatCard stat={s} />
            </Col>
          ))}
      </Row>

      {/* ── Section import / synchro ── */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 560, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 32 }}>
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

        <Divider />

        <Title level={5} style={{ marginBottom: 8 }}>Synchronisation tous les sites</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Lance la synchronisation complète de tous les sites configurés. Les employés absents de MorphoManager seront désactivés. La synchronisation automatique s'exécute aussi toutes les 6 heures.
        </Text>

        <Button
          icon={<SyncOutlined />}
          loading={loadingSync}
          onClick={handleSync}
          size="large"
        >
          Synchroniser maintenant
        </Button>
      </div>

      {/* ── Tableau des employés ── */}
      <Title level={5} style={{ marginBottom: 12 }}>
        Liste des employés
        {tableSiteId && <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>— {tableSiteId}</Text>}
      </Title>
      <Table
        dataSource={employes}
        columns={COLONNES}
        rowKey="matricule"
        loading={employesLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
        locale={{ emptyText: 'Aucun employé importé' }}
        style={{ background: '#fff', borderRadius: 8 }}
      />
    </div>
  );
}
