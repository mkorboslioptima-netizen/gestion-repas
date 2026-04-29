import { useEffect, useRef, useState, useCallback } from 'react';
import { Badge, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { getHistoriqueJour, getStatsJour, type PassageDto } from '../api/repas';
import dayjs from 'dayjs';

const { Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
const MAX_FEED = 50;

type SseStatus = 'connecting' | 'live' | 'reconnecting';

export default function LiveSupervisionPage() {
  const [passages, setPassages] = useState<PassageDto[]>([]);
  const [counters, setCounters] = useState({ total: 0, platChaud: 0, sandwich: 0 });
  const [sseStatus, setSseStatus] = useState<SseStatus>('connecting');
  const esRef = useRef<EventSource | null>(null);
  const knownIds = useRef<Set<number>>(new Set());

  // Charger les 50 derniers pointages du jour au montage
  useEffect(() => {
    getHistoriqueJour(MAX_FEED).then(data => {
      setPassages(data);
      data.forEach(p => knownIds.current.add(p.id));
    }).catch(() => {/* silencieux — SSE prendra le relais */});
  }, []);

  const { data: statsJour = [], refetch: refetchStats } = useQuery({
    queryKey: ['supervision-stats-jour'],
    queryFn: () => getStatsJour(),
  });

  const initCounters = useCallback((stats: typeof statsJour) => {
    const total = stats.reduce((s, r) => s + r.totalPassages, 0);
    const platChaud = stats.reduce((s, r) => s + r.platChaud, 0);
    const sandwich = stats.reduce((s, r) => s + r.sandwich, 0);
    setCounters({ total, platChaud, sandwich });
  }, []);

  useEffect(() => {
    initCounters(statsJour);
  }, [statsJour, initCounters]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      setSseStatus('connecting');
      const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? '';
      const es = new EventSource(`${API_BASE}/api/repas/flux?access_token=${token}`);
      esRef.current = es;

      es.onopen = () => setSseStatus('live');

      es.onmessage = (event) => {
        try {
          const p: PassageDto = JSON.parse(event.data);
          if (knownIds.current.has(p.id)) return;
          knownIds.current.add(p.id);
          setPassages(prev => [p, ...prev].slice(0, MAX_FEED));
          setCounters(prev => ({
            total: prev.total + 1,
            platChaud: prev.platChaud + (p.repasType === 'PlatChaud' ? 1 : 0),
            sandwich: prev.sandwich + (p.repasType === 'Sandwich' ? 1 : 0),
          }));
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setSseStatus('reconnecting');
        reconnectTimer = setTimeout(async () => {
          const result = await refetchStats();
          if (result.data) initCounters(result.data);
          connect();
        }, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [refetchStats, initCounters]);

  const columns: ColumnsType<PassageDto> = [
    {
      title: 'Heure',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 80,
      render: (v: string) => dayjs(v).format('HH:mm:ss'),
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      width: 130,
    },
    {
      title: 'Prénom',
      dataIndex: 'prenom',
      key: 'prenom',
      width: 130,
    },
    {
      title: 'Matricule',
      dataIndex: 'matricule',
      key: 'matricule',
      width: 110,
    },
    {
      title: 'Type repas',
      dataIndex: 'repasType',
      key: 'repasType',
      width: 120,
      render: (v: string) => (
        <Tag color={v === 'PlatChaud' ? 'blue' : v === 'Sandwich' ? 'purple' : 'default'}>
          {v === 'PlatChaud' ? 'Plat chaud' : v === 'Sandwich' ? 'Sandwich' : v}
        </Tag>
      ),
    },
    {
      title: 'Lecteur',
      dataIndex: 'lecteurNom',
      key: 'lecteurNom',
      width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Site',
      dataIndex: 'siteId',
      key: 'siteId',
      width: 90,
      render: (v: string | null) => v ?? '—',
    },
  ];

  return (
    <div style={{ padding: 18 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Flux en direct</span>
        {sseStatus === 'live' && (
          <Badge color="green" text={<Text style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>En direct</Text>} />
        )}
        {sseStatus === 'reconnecting' && (
          <Badge color="orange" text={<Text style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>Reconnexion...</Text>} />
        )}
        {sseStatus === 'connecting' && (
          <Badge color="default" text={<Text style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Connexion...</Text>} />
        )}
      </div>

      {/* Compteurs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Total passages" value={counters.total} valueStyle={{ color: '#2563eb', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Plats chauds" value={counters.platChaud} valueStyle={{ color: '#059669', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Sandwichs" value={counters.sandwich} valueStyle={{ color: '#7c3aed', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* Tableau des 50 derniers pointages */}
      <style>{`
        .passage-row-latest td { background-color: #eff6ff !important; font-weight: 500; }
        [data-theme="dark"] .passage-row-latest td { background-color: #1e3a5f !important; }
      `}</style>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>
        Derniers pointages ({passages.length > 0 ? `${passages.length} affichés` : 'en attente...'})
      </div>
      <Table
        dataSource={passages}
        columns={columns}
        rowKey={p => `${p.id}-${p.timestamp}`}
        size="small"
        pagination={false}
        scroll={{ y: 420 }}
        locale={{ emptyText: 'En attente des passages biométriques...' }}
        rowClassName={(_, index) => index === 0 ? 'passage-row-latest' : ''}
      />
    </div>
  );
}
