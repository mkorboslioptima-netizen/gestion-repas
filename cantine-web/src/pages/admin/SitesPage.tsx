import { useState } from 'react';
import {
  Button, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Spin, Switch, Tag, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  DatabaseOutlined, TeamOutlined, EyeInvisibleOutlined, EyeTwoTone,
  SyncOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSites, createSite, updateSite, deleteSite,
  getMorphoConfig, updateMorphoConfig, syncSiteEmployees,
} from '../../api/sites';
import type { SiteDto, MorphoConfigDto } from '../../api/sites';

// ── Morpho config modal ───────────────────────────────────────────────────────

function MorphoModal({ site, onClose }: { site: SiteDto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MorphoConfigDto>();

  const { isLoading } = useQuery({
    queryKey: ['morpho-config', site.siteId],
    queryFn: () => getMorphoConfig(site.siteId),
    retry: false,
    onSuccess: (data: MorphoConfigDto) => form.setFieldsValue(data),
  });

  const saveMutation = useMutation({
    mutationFn: (values: MorphoConfigDto) =>
      updateMorphoConfig(site.siteId, { ...values, siteId: site.siteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morpho-config', site.siteId] });
      message.success('Configuration sauvegardée');
      onClose();
    },
    onError: () => message.error('Erreur lors de la sauvegarde'),
  });

  return (
    <Modal
      open
      title={
        <span>
          <DatabaseOutlined style={{ marginRight: 8, color: '#7c3aed' }} />
          MorphoManager — {site.nom}
        </span>
      }
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ siteId: site.siteId, connectionString: '', query: '', commandTimeout: 30 }}
          onFinish={saveMutation.mutate}
        >
          <Form.Item
            label="Chaîne de connexion"
            name="connectionString"
            rules={[{ required: true, message: 'Obligatoire' }]}
            tooltip="La chaîne de connexion à la base MorphoManager (masquée par défaut)"
          >
            <Input.Password
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              placeholder="Server=...;Database=...;User Id=...;Password=..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>

          <Form.Item
            label="Requête SQL"
            name="query"
            rules={[{ required: true, message: 'Obligatoire' }]}
          >
            <Input.TextArea
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="SELECT Matricule, Nom, Prenom FROM Employes WHERE Actif = 1"
            />
          </Form.Item>

          <Form.Item
            label="Timeout (secondes)"
            name="commandTimeout"
            rules={[{ required: true, type: 'number', min: 1, max: 300 }]}
          >
            <InputNumber min={1} max={300} style={{ width: 140 }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>Annuler</Button>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}

// ── Add / Edit site modal ─────────────────────────────────────────────────────

interface EditModalProps {
  site?: SiteDto;
  onClose: () => void;
}

function SiteModal({ site, onClose }: EditModalProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!site;

  const createMutation = useMutation({
    mutationFn: (values: { siteId: string; nom: string }) => createSite(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      message.success('Site créé');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err?.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: { nom: string; actif: boolean }) =>
      updateSite(site!.siteId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      message.success('Site mis à jour');
      onClose();
    },
    onError: () => message.error('Erreur lors de la mise à jour'),
  });

  function handleFinish(values: Record<string, unknown>) {
    if (isEdit) {
      updateMutation.mutate({ nom: values.nom as string, actif: values.actif as boolean });
    } else {
      createMutation.mutate({ siteId: values.siteId as string, nom: values.nom as string });
    }
  }

  return (
    <Modal
      open
      title={isEdit ? `Modifier — ${site!.nom}` : 'Ajouter un site'}
      onCancel={onClose}
      footer={null}
      width={440}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={isEdit ? { nom: site!.nom, actif: site!.actif } : { actif: true }}
        onFinish={handleFinish}
        style={{ marginTop: 16 }}
      >
        {!isEdit && (
          <Form.Item
            label="Identifiant (SiteId)"
            name="siteId"
            rules={[
              { required: true, message: 'Obligatoire' },
              { pattern: /^[A-Z0-9_-]+$/i, message: 'Lettres, chiffres, tirets uniquement' },
            ]}
            tooltip="Identifiant unique interne, ex: SEBN-TUN-01"
          >
            <Input placeholder="SEBN-TUN-03" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        )}

        <Form.Item
          label="Nom du site"
          name="nom"
          rules={[{ required: true, message: 'Obligatoire' }]}
        >
          <Input placeholder="SEBN Tunis 03" />
        </Form.Item>

        {isEdit && (
          <Form.Item label="Statut" name="actif" valuePropName="checked">
            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
          </Form.Item>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

// ── Site card ─────────────────────────────────────────────────────────────────

interface SiteCardProps {
  site: SiteDto;
  onEdit: (s: SiteDto) => void;
  onMorpho: (s: SiteDto) => void;
}

function SiteCard({ site, onEdit, onMorpho }: SiteCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteSite(site.siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      message.success(`Site "${site.nom}" supprimé`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err?.response?.data?.message ?? 'Impossible de supprimer ce site'),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncSiteEmployees(site.siteId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      message.success(
        `Synchronisation OK — ${res.importes} importés, ${res.misAJour} mis à jour, ${res.employeCount} actifs`,
      );
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err?.response?.data?.message ?? 'Erreur de synchronisation'),
  });

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', lineHeight: 1.3 }}>
            {site.nom}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontFamily: 'monospace' }}>
            {site.siteId}
          </div>
        </div>
        <Tag
          color={site.actif ? 'green' : 'default'}
          style={{ borderRadius: 20, fontSize: 11, margin: 0 }}
        >
          {site.actif ? 'Actif' : 'Inactif'}
        </Tag>
      </div>

      {/* Metric */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg)', borderRadius: 8, padding: '6px 10px',
      }}>
        <TeamOutlined style={{ color: '#2563eb', fontSize: 14 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
          {site.employeCount}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>employés actifs</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(site)}
          style={{ flex: 1 }}
        >
          Modifier
        </Button>
        <Button
          size="small"
          icon={<DatabaseOutlined />}
          onClick={() => onMorpho(site)}
          style={{ flex: 1, color: '#7c3aed', borderColor: '#7c3aed' }}
        >
          MorphoDB
        </Button>
        <Popconfirm
          title="Supprimer ce site ?"
          description="Cette action est irréversible."
          okText="Supprimer"
          okButtonProps={{ danger: true }}
          cancelText="Annuler"
          onConfirm={() => deleteMutation.mutate()}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deleteMutation.isPending}
          />
        </Popconfirm>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SitesPage() {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
  });

  const [editSite, setEditSite] = useState<SiteDto | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [morphoSite, setMorphoSite] = useState<SiteDto | null>(null);

  const actifCount = sites.filter((s) => s.actif).length;

  return (
    <div style={{ padding: 18 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Gestion des sites</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {sites.length} site{sites.length !== 1 ? 's' : ''} au total — {actifCount} actif{actifCount !== 1 ? 's' : ''}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          Ajouter un site
        </Button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : sites.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text2)',
          border: '2px dashed var(--border)', borderRadius: 12,
        }}>
          Aucun site configuré. Cliquez sur "Ajouter un site" pour commencer.
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {sites.map((site) => (
            <Col key={site.siteId} xs={24} sm={12} xl={8}>
              <SiteCard
                site={site}
                onEdit={setEditSite}
                onMorpho={setMorphoSite}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Modals */}
      {addOpen && <SiteModal onClose={() => setAddOpen(false)} />}
      {editSite && <SiteModal site={editSite} onClose={() => setEditSite(null)} />}
      {morphoSite && <MorphoModal site={morphoSite} onClose={() => setMorphoSite(null)} />}
    </div>
  );
}
