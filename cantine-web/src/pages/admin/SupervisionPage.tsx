import { useEffect, useRef, useState } from 'react';
import { Badge, Card, Col, Row, Tag, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getSupervisionStatus, type EquipmentStatusDto } from '../../api/supervision';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export default function SupervisionPage() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, EquipmentStatusDto>>({});

  const { data: initialStatuses = [], isLoading } = useQuery({
    queryKey: ['supervision-status'],
    queryFn: getSupervisionStatus,
    refetchInterval: 30_000,
  });

  // Connecter SSE pour les changements d'état
  useEffect(() => {
    const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? '';
    const es = new EventSource(`${API_BASE}/api/supervision/stream?access_token=${token}`);
    esRef.current = es;
    es.onmessage = (event) => {
      try {
        const dto: EquipmentStatusDto = JSON.parse(event.data);
        setLiveStatuses(prev => ({ ...prev, [dto.id]: dto }));
        queryClient.invalidateQueries({ queryKey: ['supervision-status'] });
      } catch { /* ignore */ }
    };
    return () => { es.close(); esRef.current = null; };
  }, [queryClient]);

  const statuses = initialStatuses.map(s => liveStatuses[s.id] ?? s);
  const lecteurs    = statuses.filter(s => s.type === 'lecteur');
  const imprimantes = statuses.filter(s => s.type === 'imprimante');

  function EquipCard({ eq }: { eq: EquipmentStatusDto }) {
    return (
      <Card
        size="small"
        style={{
          borderLeft: `4px solid ${eq.connecte ? '#22c55e' : '#ef4444'}`,
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>{eq.nom}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{eq.adresseIP}</Text>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge
              status={eq.connecte ? 'success' : 'error'}
              text={
                <Text style={{ fontSize: 12, color: eq.connecte ? '#166534' : '#991b1b', fontWeight: 500 }}>
                  {eq.connecte ? 'Connecté' : 'Déconnecté'}
                </Text>
              }
            />
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
              {dayjs(eq.dernierCheck).fromNow()}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Supervision</Title>
        <Tag color={statuses.every(s => s.connecte) ? 'green' : statuses.some(s => !s.connecte) ? 'red' : 'default'}>
          {statuses.filter(s => s.connecte).length}/{statuses.length} connectés
        </Tag>
      </div>

      {isLoading ? (
        <Text type="secondary">Chargement...</Text>
      ) : statuses.length === 0 ? (
        <Text type="secondary">Aucun équipement enregistré. Démarrez le service TCP pour initialiser la supervision.</Text>
      ) : (
        <>
          {lecteurs.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>
                Lecteurs ({lecteurs.length})
              </div>
              <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {lecteurs.map(eq => (
                  <Col key={eq.id} xs={24} sm={12} lg={8}>
                    <EquipCard eq={eq} />
                  </Col>
                ))}
              </Row>
            </>
          )}

          {imprimantes.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>
                Imprimantes ({imprimantes.length})
              </div>
              <Row gutter={[12, 12]}>
                {imprimantes.map(eq => (
                  <Col key={eq.id} xs={24} sm={12} lg={8}>
                    <EquipCard eq={eq} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}
    </div>
  );
}
