import { useEffect, useRef, useState } from 'react';
import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import {
  ArrowUpOutlined,
  CoffeeOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { getHistoriqueJour, getStatsJour, type PassageDto } from '../api/repas';

const { Title, Text } = Typography;

// ─── Graphique passages par heure ───────────────────────────────────────────

function buildHourlyData(passages: PassageDto[]) {
  const counts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) counts[h] = 0;
  for (const p of passages) {
    const h = dayjs(p.timestamp).hour();
    counts[h] = (counts[h] ?? 0) + 1;
  }
  return Object.entries(counts).map(([h, count]) => ({
    heure: `${h}h`,
    passages: count,
  }));
}

// ─── Ligne passage ───────────────────────────────────────────────────────────

function PassageLine({ passage }: { passage: PassageDto }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13,
    }}>
      <div>
        <Text strong>{passage.nom} {passage.prenom}</Text>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          {passage.matricule}
        </Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color={passage.repasType === 'PlatChaud' ? 'orange' : 'blue'} style={{ margin: 0 }}>
          {passage.repasType === 'PlatChaud' ? 'Plat chaud' : 'Sandwich'}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12, minWidth: 40, textAlign: 'right' }}>
          {dayjs(passage.timestamp).format('HH:mm')}
        </Text>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [passages, setPassages] = useState<PassageDto[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const { data: stats = [] } = useQuery({
    queryKey: ['repas-stats-jour'],
    queryFn: getStatsJour,
    refetchInterval: 30_000,
  });

  // Chargement initial de l'historique
  const { data: historique = [] } = useQuery({
    queryKey: ['repas-historique-jour'],
    queryFn: () => getHistoriqueJour(50),
  });

  useEffect(() => {
    if (historique.length > 0) {
      setPassages((prev) => prev.length === 0 ? historique : prev);
    }
  }, [historique]);

  // Connexion SSE — URL absolue vers l'API (pas Vite)
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/repas/flux`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const passage: PassageDto = JSON.parse(event.data);
        setPassages((prev) => [passage, ...prev].slice(0, 50));
        queryClient.invalidateQueries({ queryKey: ['repas-stats-jour'] });
      } catch {
        // message malformé ignoré
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [queryClient, API_BASE]);

  // Totaux agrégés tous sites
  const totalPassages = stats.reduce((s, x) => s + x.totalPassages, 0);
  const totalPlatChaud = stats.reduce((s, x) => s + x.platChaud, 0);
  const totalSandwich = stats.reduce((s, x) => s + x.sandwich, 0);
  const totalQuota = stats.reduce((s, x) => s + x.quotaAtteint, 0);

  const hourlyData = buildHourlyData(passages);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Dashboard — {dayjs().format('dddd D MMMM YYYY')}</Title>

      {/* ── Cartes stats globales ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Passages aujourd'hui" value={totalPassages}
              prefix={<ArrowUpOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Plats chauds" value={totalPlatChaud}
              prefix={<CoffeeOutlined />} valueStyle={{ color: '#d46b08' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Sandwichs" value={totalSandwich}
              valueStyle={{ color: '#0958d9' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Quota atteint" value={totalQuota}
              prefix={<WarningOutlined />} valueStyle={{ color: totalQuota > 0 ? '#cf1322' : '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* ── Cartes par site ── */}
      {stats.length > 1 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {stats.map((s) => (
            <Col key={s.siteId} xs={24} sm={12}>
              <Card size="small" title={<><Text strong>{s.nomSite}</Text> <Text type="secondary" style={{ fontSize: 12 }}>{s.siteId}</Text></>}>
                <Row gutter={16}>
                  <Col span={8}><Statistic title="Total" value={s.totalPassages} prefix={<TeamOutlined />} /></Col>
                  <Col span={8}><Statistic title="Plat chaud" value={s.platChaud} /></Col>
                  <Col span={8}><Statistic title="Sandwich" value={s.sandwich} /></Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[24, 24]}>
        {/* ── Graphique horaire ── */}
        <Col xs={24} xl={14}>
          <Card title="Passages par heure" size="small">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="heure" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="passages" fill="#1677ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* ── Liste passages live ── */}
        <Col xs={24} xl={10}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Passages en direct</span>
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>● Live</Tag>
              </div>
            }
            size="small"
            style={{ maxHeight: 340, overflow: 'hidden' }}
            bodyStyle={{ padding: '8px 16px', overflowY: 'auto', maxHeight: 280 }}
          >
            {passages.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>Aucun passage enregistré aujourd'hui.</Text>
            ) : (
              passages.map((p) => <PassageLine key={p.id} passage={p} />)
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
