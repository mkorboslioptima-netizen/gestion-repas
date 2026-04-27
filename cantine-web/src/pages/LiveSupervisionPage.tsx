import { useEffect, useRef, useState, useCallback } from 'react';
import { Badge, Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getStatsJour, type PassageDto } from '../api/repas';
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
      const es = new EventSource(`${API_BASE}/api/repas/flux`);
      esRef.current = es;

      es.onopen = () => setSseStatus('live');

      es.onmessage = (event) => {
        try {
          const p: PassageDto = JSON.parse(event.data);
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

  const repasTypeLabel = (type: string) =>
    type === 'PlatChaud' ? 'Plat chaud' : type === 'Sandwich' ? 'Sandwich' : type;

  const repasTypeColor = (type: string) =>
    type === 'PlatChaud' ? 'blue' : type === 'Sandwich' ? 'purple' : 'default';

  return (
    <div style={{ padding: 18 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Supervision en direct</span>
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

      {/* Feed live */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>
        Passages récents ({passages.length > 0 ? `${passages.length} affichés` : 'en attente...'})
      </div>

      {passages.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
          En attente des passages biométriques...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {passages.map((p) => (
            <Card
              key={`${p.id}-${p.timestamp}`}
              size="small"
              style={{
                borderLeft: `4px solid ${p.repasType === 'PlatChaud' ? '#2563eb' : '#7c3aed'}`,
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Text strong style={{ fontSize: 14 }}>{p.prenom} {p.nom}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{p.matricule}</Text>
                  <Tag color={repasTypeColor(p.repasType)} style={{ fontSize: 11, margin: 0 }}>
                    {repasTypeLabel(p.repasType)}
                  </Tag>
                  {p.lecteurNom && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{p.lecteurNom}</Text>
                  )}
                  {p.siteId && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{p.siteId}</Text>
                  )}
                </div>
                <Text style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {dayjs(p.timestamp).format('HH:mm:ss')}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
