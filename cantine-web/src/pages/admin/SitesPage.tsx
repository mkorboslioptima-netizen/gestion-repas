import { useState } from 'react';
import { Button, Card, Col, Form, InputNumber, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSites, getMorphoConfig, updateMorphoConfig } from '../../api/sites';
import type { SiteDto, MorphoConfigDto } from '../../api/sites';

const { Title, Text } = Typography;

function MorphoConfigCard({ site }: { site: SiteDto }) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MorphoConfigDto>();

  const { data: config, isLoading } = useQuery({
    queryKey: ['morpho-config', site.siteId],
    queryFn: () => getMorphoConfig(site.siteId),
    retry: false,
    onSuccess: (data) => form.setFieldsValue(data),
  });

  const saveMutation = useMutation({
    mutationFn: (values: MorphoConfigDto) => updateMorphoConfig(site.siteId, { ...values, siteId: site.siteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morpho-config', site.siteId] });
      message.success(`Configuration MorphoManager de ${site.nom} sauvegardée`);
    },
    onError: () => message.error('Erreur lors de la sauvegarde'),
  });

  return (
    <Card
      title={
        <Space>
          <Text strong>{site.nom}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{site.siteId}</Text>
          <Tag color={site.actif ? 'green' : 'default'}>{site.actif ? 'Actif' : 'Inactif'}</Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {isLoading ? (
        <Spin />
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={config ?? { siteId: site.siteId, connectionString: '', query: '', commandTimeout: 30 }}
          onFinish={saveMutation.mutate}
        >
          <Form.Item
            label="ConnectionString MorphoManager"
            name="connectionString"
            rules={[{ required: true, message: 'Obligatoire' }]}
          >
            <input
              className="ant-input"
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="Server=...;Database=...;User Id=...;Password=..."
            />
          </Form.Item>

          <Form.Item
            label="Requête SQL"
            name="query"
            rules={[{ required: true, message: 'Obligatoire' }]}
          >
            <textarea
              className="ant-input"
              rows={3}
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="SELECT Matricule, Nom, Prenom FROM Employes WHERE Actif = 1"
            />
          </Form.Item>

          <Form.Item
            label="Timeout (secondes)"
            name="commandTimeout"
            rules={[{ required: true, type: 'number', min: 1, max: 300 }]}
          >
            <InputNumber min={1} max={300} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={saveMutation.isPending}
            >
              Enregistrer
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}

export default function SitesPage() {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
  });

  return (
    <div style={{ padding: 18 }}>
      {/* Grille de site-cards + config Morpho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Sites actifs</span>
      </div>

      {isLoading ? (
        <Spin size="large" />
      ) : (
        <>
          {/* Cards visuelles par site */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
            {sites.map((site) => (
              <div key={site.siteId} className="site-card">
                <div className="site-card-top">
                  <span className="site-card-name">{site.nom}</span>
                  <span className="site-card-badge-active">
                    <span className="sdot sdot-online" />
                    {site.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{site.siteId}</div>
              </div>
            ))}
          </div>

          {/* Config MorphoManager par site */}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>
            Configuration MorphoManager
          </div>
          <Row gutter={[16, 16]}>
            {sites.map((site) => (
              <Col key={site.siteId} xs={24} xl={12}>
                <MorphoConfigCard site={site} />
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}
