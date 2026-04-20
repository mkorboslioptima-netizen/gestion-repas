import { useEffect, useRef, useState, useMemo } from 'react';
import { Col, Row, Button, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import {
  getHistoriqueJour, getStatsJour, getExportExcel, type PassageDto,
} from '../api/repas';
import KpiCard from '../components/KpiCard';
import RoleGate from '../components/RoleGate';
import DashboardFilters, { type FiltreState } from '../components/DashboardFilters';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHourlyData(passages: PassageDto[]) {
  const counts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) counts[h] = 0;
  for (const p of passages) counts[dayjs(p.timestamp).hour()]++;
  return Object.entries(counts)
    .filter(([h]) => Number(h) >= 6 && Number(h) <= 20)
    .map(([h, count]) => ({ heure: `${h}h`, passages: count }));
}

function todayStr() { return dayjs().format('YYYY-MM-DD'); }
function defaultFiltre(): FiltreState {
  return { dateDebut: todayStr(), dateFin: todayStr(), heureDebut: '00:00', heureFin: '23:59' };
}
function filtreIsToday(f: FiltreState) {
  const today = todayStr();
  return f.dateDebut <= today && today <= f.dateFin;
}

const PIE_COLORS = ['#2563eb', '#7c3aed'];

// ── Page Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  // ssePassages = passages temps-réel ajoutées via SSE uniquement
  const [ssePassages, setSsePassages] = useState<PassageDto[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [filtre, setFiltre] = useState<FiltreState>(defaultFiltre);
  const esRef = useRef<EventSource | null>(null);

  // Stabiliser filtreParams pour éviter de nouveaux objets à chaque render
  const filtreParams = useMemo(() => ({
    dateDebut: filtre.dateDebut,
    dateFin: filtre.dateFin,
    heureDebut: filtre.heureDebut,
    heureFin: filtre.heureFin,
  }), [filtre.dateDebut, filtre.dateFin, filtre.heureDebut, filtre.heureFin]);

  const sseActif = filtreIsToday(filtre);

  const { data: stats = [] } = useQuery({
    queryKey: ['repas-stats-jour', filtreParams],
    queryFn: () => getStatsJour(filtreParams),
    refetchInterval: sseActif ? 30_000 : false,
  });

  // historique = données depuis l'API (filtrées)
  const { data: historique = [] } = useQuery({
    queryKey: ['repas-historique-jour', filtreParams],
    queryFn: () => getHistoriqueJour(50, filtreParams),
  });

  // Réinitialiser les passages SSE quand le filtre change
  useEffect(() => {
    setSsePassages([]);
  }, [filtreParams]);

  // ── SSE conditionnel ────────────────────────────────────────────────────────
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

  useEffect(() => {
    if (!sseActif) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    const es = new EventSource(`${API_BASE}/api/repas/flux`);
    esRef.current = es;
    es.onmessage = (event) => {
      try {
        const p: PassageDto = JSON.parse(event.data);
        setSsePassages(prev => [p, ...prev].slice(0, 50));
        queryClient.invalidateQueries({ queryKey: ['repas-stats-jour'] });
      } catch { /* ignore */ }
    };
    return () => { es.close(); esRef.current = null; };
  }, [queryClient, API_BASE, sseActif]);

  // ── Feed affiché : SSE en temps réel OU historique filtré ──────────────────
  // Pas de useEffect de sync → pas de boucle
  const feedPassages = sseActif && ssePassages.length > 0 ? ssePassages : historique;

  // ── Export Excel ────────────────────────────────────────────────────────────
  async function handleExportExcel() {
    setExportLoading(true);
    try {
      const blob = await getExportExcel(filtreParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passages-${filtre.dateDebut}-${filtre.dateFin}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Erreur lors de l\'export Excel');
    } finally {
      setExportLoading(false);
    }
  }

  // ── Agrégats ────────────────────────────────────────────────────────────────
  const totalPassages = stats.reduce((s, x) => s + x.totalPassages, 0);
  const totalPlatChaud = stats.reduce((s, x) => s + x.platChaud, 0);
  const totalSandwich  = stats.reduce((s, x) => s + x.sandwich, 0);
  const totalQuota     = stats.reduce((s, x) => s + x.quotaAtteint, 0);

  const hourlyData = useMemo(() => buildHourlyData(feedPassages), [feedPassages]);
  const pieData = useMemo(() => [
    { name: 'Plats chauds', value: totalPlatChaud },
    { name: 'Sandwich', value: totalSandwich },
  ], [totalPlatChaud, totalSandwich]);

  return (
    <div style={{ padding: 18 }}>

      {/* Panneau filtres */}
      <DashboardFilters onApply={setFiltre} />

      {/* Barre d'actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <RoleGate allowed={['Prestataire', 'AdminSEBN', 'ResponsableCantine']}>
          <Button onClick={handleExportExcel} loading={exportLoading} type="primary" ghost>
            Exporter en Excel
          </Button>
        </RoleGate>
      </div>

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
          <KpiCard label="Quota atteint" value={totalQuota}
            color={totalQuota > 0 ? '#dc2626' : '#16a34a'}
            bgColor={totalQuota > 0 ? '#fef2f2' : '#f0fdf4'}
            icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
            percent={undefined} />
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={24} md={8}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Répartition plats
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginLeft: 6 }}>
                {filtre.dateDebut === filtre.dateFin ? filtre.dateDebut : `${filtre.dateDebut} → ${filtre.dateFin}`}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>

        <Col xs={24} md={16}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Passages par heure
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginLeft: 6 }}>
                {filtre.heureDebut}–{filtre.heureFin}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="heure" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="passages" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Feed */}
      <div className="feed-card">
        <div className="feed-hdr">
          <span className="feed-title">Feed</span>
          {sseActif ? (
            <div className="live-badge"><div className="pulse" />En direct</div>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Données historiques</span>
          )}
        </div>
        <table className="app-table">
          <thead>
            <tr><th>Nom</th><th>Matricule</th><th>Type de repas</th><th>Pointage</th></tr>
          </thead>
          <tbody>
            {feedPassages.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Aucun passage sur cette période</td></tr>
            ) : feedPassages.slice(0, 8).map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nom} {p.prenom}</td>
                <td style={{ color: 'var(--text2)' }}>{p.matricule}</td>
                <td>
                  <span className={`badge-repas ${p.repasType === 'PlatChaud' ? 'badge-plat' : 'badge-sandwich'}`}>
                    {p.repasType === 'PlatChaud' ? 'Plat chaud' : 'Sandwich'}
                  </span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>
                  {dayjs(p.timestamp).format('DD/MM HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
