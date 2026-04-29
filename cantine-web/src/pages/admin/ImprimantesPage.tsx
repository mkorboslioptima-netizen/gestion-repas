import { useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Select, Space, Tag, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, ApiOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/axios';
import {
  fetchImprimantes,
  updateImprimante,
  testImprimante,
} from '../../api/imprimantes';
import type { ImprimanteDto, UpdateImprimanteDto } from '../../api/imprimantes';

interface ImprimanteDiscoveredDto {
  adresseIP: string;
  nomImprimante: string | null;
  source: 'windows' | 'reseau';
  sousReseau?: string;
  port?: number;
}

export default function ImprimantesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<ImprimanteDto | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<ImprimanteDiscoveredDto[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subnetCount, setSubnetCount] = useState(0);
  const [form] = Form.useForm();

  const { data: imprimantes = [], isLoading } = useQuery({
    queryKey: ['imprimantes'],
    queryFn: fetchImprimantes,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateImprimanteDto }) =>
      updateImprimante(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      message.success('Configuration mise à jour');
      setModalOpen(false);
      setSelected(null);
    },
    onError: () => {
      message.error('Erreur lors de la mise à jour');
    },
  });

  const openConfig = (imp: ImprimanteDto) => {
    setSelected(imp);
    form.setFieldsValue({
      nomImprimante: imp.nomImprimante ?? '',
      printerIP: imp.printerIP ?? '',
      portImprimante: imp.portImprimante,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!selected) return;
    form.validateFields().then(values => {
      updateMutation.mutate({
        id: selected.lecteurId,
        dto: {
          nomImprimante: values.nomImprimante || null,
          printerIP: values.printerIP || null,
          portImprimante: values.portImprimante,
        },
      });
    });
  };

  const handleTest = async (imp: ImprimanteDto) => {
    setTestingId(imp.lecteurId);
    try {
      const result = await testImprimante(imp.lecteurId);
      if (result.succes) {
        message.success(`${result.message} (${result.latenceMs} ms)`);
      } else {
        message.error(result.message);
      }
    } catch {
      message.error('Erreur lors du test de connexion');
    } finally {
      setTestingId(null);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await apiClient.post<ImprimanteDiscoveredDto[]>('/api/imprimantes/discover');
      const count = parseInt(res.headers['x-scan-subnets'] ?? '1', 10);
      setSubnetCount(count);
      setDiscovered(res.data);
      setDrawerOpen(true);
      if (res.data.length === 0)
        message.info(`Aucune imprimante découverte sur ${count} sous-réseau(x) scanné(s).`);
    } catch {
      message.error('Erreur lors de la découverte des imprimantes');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAssociate = async (imp: ImprimanteDiscoveredDto, lecteurId: number) => {
    try {
      await updateImprimante(lecteurId, {
        nomImprimante: imp.nomImprimante,
        printerIP: imp.adresseIP,
        portImprimante: 9100,
      });
      queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      message.success(`Imprimante ${imp.adresseIP} associée`);
    } catch {
      message.error("Erreur lors de l'association");
    }
  };

  const total = imprimantes.length;
  const configurees = imprimantes.filter(i => i.configuree).length;
  const nonConfigurees = total - configurees;

  const columns: ColumnsType<ImprimanteDto> = [
    {
      title: 'Pointeuse',
      dataIndex: 'nomLecteur',
      key: 'nomLecteur',
      sorter: (a, b) => a.nomLecteur.localeCompare(b.nomLecteur),
    },
    {
      title: 'Site',
      dataIndex: 'siteId',
      key: 'siteId',
    },
    {
      title: 'Nom imprimante',
      dataIndex: 'nomImprimante',
      key: 'nomImprimante',
      render: (v: string | null) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      title: 'Adresse IP',
      dataIndex: 'printerIP',
      key: 'printerIP',
      render: (v: string | null) => v ?? <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      title: 'Port',
      dataIndex: 'portImprimante',
      key: 'portImprimante',
      width: 80,
    },
    {
      title: 'Statut',
      key: 'statut',
      render: (_, record) =>
        record.configuree
          ? <Tag color="green">Configurée</Tag>
          : <Tag color="default">Non configurée</Tag>,
      filters: [
        { text: 'Configurée', value: true },
        { text: 'Non configurée', value: false },
      ],
      onFilter: (value, record) => record.configuree === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openConfig(record)}>
            Configurer
          </Button>
          <Button
            icon={<ApiOutlined />}
            size="small"
            disabled={!record.configuree}
            loading={testingId === record.lecteurId}
            onClick={() => handleTest(record)}
          >
            Tester
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 18 }}>
      {/* Compteurs résumé */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--primary)' }}>{total}</div>
          <div className="sl">Total</div>
        </div>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--success)' }}>{configurees}</div>
          <div className="sl">Configurées</div>
        </div>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--text-muted)' }}>{nonConfigurees}</div>
          <div className="sl">Non configurées</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="admin-card">
        <div className="admin-hdr">
          <span style={{ fontSize: 14, fontWeight: 600 }}>Imprimantes thermiques</span>
          <Button
            icon={<SearchOutlined />}
            size="small"
            loading={discovering}
            onClick={handleDiscover}
          >
            Découvrir
          </Button>
        </div>
        <Table
          dataSource={imprimantes}
          columns={columns}
          rowKey="lecteurId"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </div>

      {/* Modal de configuration */}
      <Modal
        title={selected ? `Configurer — ${selected.nomLecteur}` : 'Configurer imprimante'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setSelected(null); }}
        onOk={handleSubmit}
        okText="Enregistrer"
        cancelText="Annuler"
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nomImprimante" label="Nom imprimante">
            <Input placeholder="Ex: IMP-ENTREE-A" />
          </Form.Item>
          <Form.Item name="printerIP" label="Adresse IP">
            <Input placeholder="192.168.x.x" />
          </Form.Item>
          <Form.Item
            name="portImprimante"
            label="Port TCP"
            rules={[{ required: true, message: 'Port requis' }]}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer découverte automatique */}
      <Drawer
        title={`Imprimantes découvertes (${discovered.length}) — ${subnetCount} sous-réseau(x) scanné(s)`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
      >
        {discovered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Aucune imprimante trouvée.</p>
        ) : (
          discovered.map(imp => (
            <div
              key={imp.adresseIP}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
                padding: '10px 12px',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: 6,
              }}
            >
              <Tag color={imp.source === 'windows' ? 'blue' : 'cyan'} style={{ flexShrink: 0 }}>
                {imp.source === 'windows' ? 'Windows' : (imp.sousReseau ?? 'Réseau')}
              </Tag>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{imp.adresseIP}</div>
                {imp.nomImprimante && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                    {imp.nomImprimante}
                  </div>
                )}
                {imp.port && imp.port !== 9100 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                    Port {imp.port} ({imp.port === 515 ? 'LPD' : 'IPP'})
                  </div>
                )}
              </div>
              <Select
                placeholder="Associer à..."
                style={{ width: 160 }}
                size="small"
                allowClear
                onChange={(lecteurId: number) => handleAssociate(imp, lecteurId)}
              >
                {imprimantes.map(l => (
                  <Select.Option key={l.lecteurId} value={l.lecteurId}>
                    {l.nomLecteur}
                  </Select.Option>
                ))}
              </Select>
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}
