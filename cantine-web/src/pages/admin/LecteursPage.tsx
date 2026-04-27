import { useState, useEffect, useRef } from 'react';
import { Button, Popconfirm, Space, Table, Tag, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLecteurs,
  createLecteur,
  updateLecteur,
  deleteLecteur,
} from '../../api/lecteurs';
import type { LecteurDto, CreateLecteurDto, UpdateLecteurDto } from '../../api/lecteurs';
import LecteurFormModal from '../../components/LecteurFormModal';
import { getSupervisionStatus, checkLecteur } from '../../api/supervision';
import type { EquipmentStatusDto } from '../../api/supervision';


export default function LecteursPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<LecteurDto | null>(null);

  const { data: lecteurs = [], isLoading } = useQuery({
    queryKey: ['lecteurs'],
    queryFn: fetchLecteurs,
  });

  const [supervisionStatuses, setSupervisionStatuses] = useState<EquipmentStatusDto[]>([]);
  const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

  // Chargement initial des statuts
  useEffect(() => {
    getSupervisionStatus().then(setSupervisionStatuses).catch(() => {});
  }, []);

  // SSE pour mises à jour live
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/supervision/stream`);
    esRef.current = es;
    es.onmessage = (event) => {
      try {
        const dto: EquipmentStatusDto = JSON.parse(event.data);
        setSupervisionStatuses(prev =>
          prev.some(s => s.id === dto.id)
            ? prev.map(s => s.id === dto.id ? dto : s)
            : [...prev, dto]
        );
      } catch { /* ignore */ }
    };
    return () => { es.close(); esRef.current = null; };
  }, [API_BASE]);

  const handleCheck = async (lecteurId: number) => {
    setCheckingIds(prev => new Set(prev).add(lecteurId));
    try {
      const result = await checkLecteur(lecteurId);
      setSupervisionStatuses(prev => {
        const filtered = prev.filter(
          s => s.id !== result.lecteur.id && s.id !== result.imprimante?.id
        );
        return [...filtered, result.lecteur, ...(result.imprimante ? [result.imprimante] : [])];
      });
    } catch {
      message.error('Impossible de vérifier la connexion');
    } finally {
      setCheckingIds(prev => { const s = new Set(prev); s.delete(lecteurId); return s; });
    }
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateLecteurDto) => createLecteur(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecteurs'] });
      queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
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
      queryClient.invalidateQueries({ queryKey: ['imprimantes'] });
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
      title: 'Imprimante',
      key: 'imprimante',
      render: (_, record) => {
        const impStatus = supervisionStatuses.find(
          s => s.type === 'imprimante' && s.adresseIP === record.printerIP
        );
        return record.imprimanteConfiguree ? (
          <Tooltip title={`${record.printerIP} : ${record.portImprimante}`}>
            <div>
              <Tag color="green" style={{ marginBottom: 2 }}>Configurée</Tag>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                {record.nomImprimante ?? record.printerIP}
              </div>
              {impStatus && (
                <Tag
                  color={impStatus.connecte ? 'green' : 'red'}
                  style={{ fontSize: 10, marginTop: 2 }}
                >
                  {impStatus.connecte ? 'Imprimante OK' : 'Hors ligne'}
                </Tag>
              )}
            </div>
          </Tooltip>
        ) : (
          <Tag color="default">Non configurée</Tag>
        );
      },
    },
    {
      title: 'Connexion',
      key: 'connexion',
      render: (_, record) => {
        const status = supervisionStatuses.find(
          s => s.type === 'lecteur' && s.adresseIP === record.adresseIP
        );
        if (!status) return <Tag color="default">Inconnu</Tag>;
        return <Tag color={status.connecte ? 'green' : 'red'}>{status.connecte ? 'Connecté' : 'Déconnecté'}</Tag>;
      },
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
          <Button
            icon={<ReloadOutlined />}
            size="small"
            loading={checkingIds.has(record.id)}
            onClick={() => handleCheck(record.id)}
            title="Vérifier la connexion"
          />
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
