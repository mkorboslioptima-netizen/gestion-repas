import { useEffect, useRef, useState } from 'react';
import { Col, Row } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { getHistoriqueJour, getStatsJour, type PassageDto } from '../api/repas';
import KpiCard from '../components/KpiCard';

// ── Graphique passages par heure ─────────────────────────────────────────
function buildHourlyData(passages: PassageDto[]) {
  const counts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) counts[h] = 0;
  for (const p of passages) counts[dayjs(p.timestamp).hour()]++;
  return Object.entries(counts)
    .filter(([h]) => Number(h) >= 6 && Number(h) <= 20)
    .map(([h, count]) => ({ heure: `${h}h`, passages: count }));
}

const PIE_COLORS = ['#2563eb', '#7c3aed'];

// ── Page Dashboard ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [passages, setPassages] = useState<PassageDto[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const { data: stats = [] } = useQuery({
    queryKey: ['repas-stats-jour'],
    queryFn: getStatsJour,
    refetchInterval: 30_000,
  });

  const { data: historique = [] } = useQuery({
    queryKey: ['repas-historique-jour'],
    queryFn: () => getHistoriqueJour(50),
  });

  useEffect(() => {
    if (historique.length > 0) {
      setPassages(prev => prev.length === 0 ? historique : prev);
    }
  }, [historique]);

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/repas/flux`);
    esRef.current = es;
    es.onmessage = (event) => {
      try {
        const p: PassageDto = JSON.parse(event.data);
        setPassages(prev => [p, ...prev].slice(0, 50));
        queryClient.invalidateQueries({ queryKey: ['repas-stats-jour'] });
      } catch { /* ignore */ }
    };
    return () => { es.close(); esRef.current = null; };
  }, [queryClient, API_BASE]);

  // Totaux agrégés
  const totalPassages = stats.reduce((s, x) => s + x.totalPassages, 0);
  const totalPlatChaud = stats.reduce((s, x) => s + x.platChaud, 0);
  const totalSandwich  = stats.reduce((s, x) => s + x.sandwich, 0);
  const totalQuota     = stats.reduce((s, x) => s + x.quotaAtteint, 0);

  const hourlyData = buildHourlyData(passages);
  const pieData = [
    { name: 'Plats chauds', value: totalPlatChaud },
    { name: 'Sandwich', value: totalSandwich },
  ];

  return (
    <div style={{ padding: 18 }}>

      {/* KPI grid */}
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={12} sm={6}>
          <KpiCard label="Repas servis" value={totalPassages} color="#2563eb" bgColor="#eff6ff"
            icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>}
            percent={Math.min(100, Math.round(totalPassages / 5))} />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard label="Plats chauds" value={totalPlatChaud} color="#16a34a" bgColor="#f0fdf4"
            icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
            percent={totalPassages ? Math.round(totalPlatChaud / totalPassages * 100) : 0} />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard label="Sandwichs" value={totalSandwich} color="#7c3aed" bgColor="#fdf4ff"
            icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
            percent={totalPassages ? Math.round(totalSandwich / totalPassages * 100) : 0} />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard label="Quota atteint" value={totalQuota} color={totalQuota > 0 ? '#dc2626' : '#16a34a'} bgColor={totalQuota > 0 ? '#fef2f2' : '#f0fdf4'}
            icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
            percent={undefined} />
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        {/* Camembert répartition */}
        <Col xs={24} md={8}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Répartition plats <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>Aujourd'hui</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString('fr')} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* Histogramme horaire */}
        <Col xs={24} md={16}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Passages par heure <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>Aujourd'hui</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="heure" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="passages" fill="#2563eb" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Feed live */}
      <div className="feed-card">
        <div className="feed-hdr">
          <span className="feed-title">Feed Live</span>
          <div className="live-badge">
            <div className="pulse" />
            En direct
          </div>
        </div>
        <table className="app-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Matricule</th>
              <th>Type de repas</th>
              <th>Pointage</th>
            </tr>
          </thead>
          <tbody>
            {passages.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Aucun passage aujourd'hui</td></tr>
            ) : passages.slice(0, 8).map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nom} {p.prenom}</td>
                <td style={{ color: 'var(--text2)' }}>{p.matricule}</td>
                <td>
                  <span className={`badge-repas ${p.repasType === 'PlatChaud' ? 'badge-plat' : 'badge-sandwich'}`}>
                    {p.repasType === 'PlatChaud' ? 'Plat chaud' : 'Sandwich'}
                  </span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>
                  {dayjs(p.timestamp).format('HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
