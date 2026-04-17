import { useState } from 'react';
import { Button, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLecteurs,
  createLecteur,
  updateLecteur,
  deleteLecteur,
} from '../../api/lecteurs';
import type { LecteurDto, CreateLecteurDto, UpdateLecteurDto } from '../../api/lecteurs';
import LecteurFormModal from '../../components/LecteurFormModal';

const { Title } = Typography;

export default function LecteursPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<LecteurDto | null>(null);

  const { data: lecteurs = [], isLoading } = useQuery({
    queryKey: ['lecteurs'],
    queryFn: fetchLecteurs,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateLecteurDto) => createLecteur(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      message.success('Lecteur ajouté');
      setModalOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? "Erreur lors de l'ajout");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateLecteurDto }) => updateLecteur(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      message.success('Lecteur modifié');
      setModalOpen(false);
      setSelected(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Erreur lors de la modification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLecteur(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      message.success('Lecteur supprimé');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message ?? 'Erreur lors de la suppression');
    },
  });

  const handleSubmit = (values: CreateLecteurDto | UpdateLecteurDto) => {
    if (selected) {
      updateMutation.mutate({ id: selected.id, dto: values as UpdateLecteurDto });
    } else {
      createMutation.mutate(values as CreateLecteurDto);
    }
  };

  const openAdd = () => {
    setSelected(null);
    setModalOpen(true);
  };

  const openEdit = (record: LecteurDto) => {
    setSelected(record);
    setModalOpen(true);
  };

  const columns: ColumnsType<LecteurDto> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      sorter: (a, b) => a.nom.localeCompare(b.nom),
    },
    {
      title: 'Adresse IP',
      dataIndex: 'adresseIP',
      key: 'adresseIP',
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'actif',
      render: (actif: boolean) =>
        actif ? <Tag color="green">Actif</Tag> : <Tag color="default">Inactif</Tag>,
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false },
      ],
      onFilter: (value, record) => record.actif === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Modifier
          </Button>
          <Popconfirm
            title="Supprimer ce lecteur ?"
            description="Cette action est irréversible si aucun pointage n'y est lié."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const total = lecteurs.length;
  const enligne = lecteurs.filter(l => l.actif).length;
  const horsligne = total - enligne;

  return (
    <div style={{ padding: 18 }}>
      {/* Compteurs résumé */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--primary)' }}>{total}</div>
          <div className="sl">Total</div>
        </div>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--success)' }}>{enligne}</div>
          <div className="sl">En ligne</div>
        </div>
        <div className="summary-stat">
          <div className="sv" style={{ color: 'var(--danger)' }}>{horsligne}</div>
          <div className="sl">Hors ligne</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="admin-card">
        <div className="admin-hdr">
          <span style={{ fontSize: 14, fontWeight: 600 }}>Lecteurs</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} size="small">
            Ajouter
          </Button>
        </div>
        <Table
          dataSource={lecteurs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </div>

      <LecteurFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null); }}
        onSubmit={handleSubmit}
        initialValues={selected}
        loading={isMutating}
      />
    </div>
  );
}
