import { useState } from 'react';
import { Button, Divider, Select, Space, Typography, notification } from 'antd';
import { ImportOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getSites } from '../../api/sites';
import { importDepuisMorpho, syncMorpho } from '../../api/employes';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../auth/AuthContext';

const { Title, Text } = Typography;

export default function EmployesPage() {
  const { roles } = useAuth();
  const { siteId, setSiteId } = useSite();
  const isAdmin = roles.includes('AdminSEBN');

  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: isAdmin,
  });

  const selectedSiteId = siteId;

  const handleImport = async () => {
    if (!selectedSiteId) {
      notification.warning({ message: 'Sélectionnez un site avant de lancer l\'import.' });
      return;
    }
    setLoadingImport(true);
    try {
      const result = await importDepuisMorpho(selectedSiteId);
      notification.success({
        message: 'Import terminé',
        description: `Importés : ${result.importes} · Mis à jour : ${result.misAJour} · Désactivés : ${result.desactives} · Inchangés : ${result.ignores}`,
        duration: 8,
      });
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

      <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 560, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

        {/* Import ponctuel par site */}
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
                value={selectedSiteId ?? undefined}
                onChange={(v) => setSiteId(v)}
              >
                {sites.map((s) => (
                  <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {!isAdmin && selectedSiteId && (
            <Text>Site : <Text strong>{selectedSiteId}</Text></Text>
          )}

          <Button
            type="primary"
            icon={<ImportOutlined />}
            loading={loadingImport}
            disabled={!selectedSiteId}
            onClick={handleImport}
            size="large"
          >
            Importer depuis MorphoManager
          </Button>
        </Space>

        <Divider />

        {/* Synchronisation globale tous les sites */}
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
    </div>
  );
}
