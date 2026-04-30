import { useEffect, useRef, useState, useMemo } from 'react';
import { Col, Row, Button, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList, Label,
} from 'recharts';
import dayjs from 'dayjs';
import {
  getHistoriqueJour, getStatsJour, getExportExcel, getExportGlobal, type PassageDto,
} from '../api/repas';
import { useAuth } from '../auth/AuthContext';
import KpiCard from '../components/KpiCard';
import RoleGate from '../components/RoleGate';
import DashboardFilters, { type FiltreState } from '../components/DashboardFilters';

// ── Helpers ───────────────────────────────────────────────────────────────────

type ChartMode = 'heure' | 'jour' | 'mois';

function getChartMode(dateDebut: string, dateFin: string): ChartMode {
  const diff = dayjs(dateFin).diff(dayjs(dateDebut), 'day');
  if (diff === 0) return 'heure';
  if (diff <= 60) return 'jour';
  return 'mois';
}

function buildChartData(passages: PassageDto[], mode: ChartMode, dateDebut: string, dateFin: string) {
  const count = (list: PassageDto[], type: string) => list.filter(p => p.repasType === type).length;

  if (mode === 'heure') {
    const platChaud: Record<number, number> = {};
    const sandwich:  Record<number, number> = {};
    for (let h = 0; h < 24; h++) { platChaud[h] = 0; sandwich[h] = 0; }
    for (const p of passages) {
      const h = dayjs(p.timestamp).hour();
      if (p.repasType === 'PlatChaud') platChaud[h]++; else sandwich[h]++;
    }
    return Array.from({ length: 24 }, (_, h) => h)
      .filter(h => h >= 6 && h <= 20)
      .map(h => ({ label: `${h}h`, platChaud: platChaud[h], sandwich: sandwich[h] }));
  }

  if (mode === 'jour') {
    const result = [];
    let cur = dayjs(dateDebut);
    const fin = dayjs(dateFin);
    while (!cur.isAfter(fin)) {
      const dayStr = cur.format('YYYY-MM-DD');
      const dayP = passages.filter(p => dayjs(p.timestamp).format('YYYY-MM-DD') === dayStr);
      result.push({ label: cur.format('DD/MM'), platChaud: count(dayP, 'PlatChaud'), sandwich: count(dayP, 'Sandwich') });
      cur = cur.add(1, 'day');
    }
    return result;
  }

  // mois
  const result = [];
  let cur = dayjs(dateDebut).startOf('month');
  const fin = dayjs(dateFin).startOf('month');
  while (!cur.isAfter(fin)) {
    const monthStr = cur.format('YYYY-MM');
    const monthP = passages.filter(p => dayjs(p.timestamp).format('YYYY-MM') === monthStr);
    result.push({ label: cur.format('MMM YY'), platChaud: count(monthP, 'PlatChaud'), sandwich: count(monthP, 'Sandwich') });
    cur = cur.add(1, 'month');
  }
  return result;
}

function todayStr() { return dayjs().format('YYYY-MM-DD'); }
function defaultFiltre(): FiltreState {
  return { dateDebut: todayStr(), dateFin: todayStr(), heureDebut: '00:00', heureFin: '23:59', repasType: undefined, siteId: undefined };
}
function filtreIsToday(f: FiltreState) {
  const today = todayStr();
  return f.dateDebut <= today && today <= f.dateFin;
}

const PIE_COLORS = ['#2563eb', '#7c3aed'];

// ── Page Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { roles, siteId: authSiteId } = useAuth();
  const isAdmin = roles.includes('AdminSEBN');
  // ssePassages = passages temps-réel ajoutées via SSE uniquement
  const [ssePassages, setSsePassages] = useState<PassageDto[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportGlobalLoading, setExportGlobalLoading] = useState(false);
  const [filtre, setFiltre] = useState<FiltreState>(defaultFiltre);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAdmin && authSiteId) {
      setFiltre(prev => ({ ...prev, siteId: authSiteId }));
    }
  }, [isAdmin, authSiteId]);

  // Stabiliser filtreParams pour éviter de nouveaux objets à chaque render
  const filtreParams = useMemo(() => ({
    dateDebut: filtre.dateDebut,
    dateFin: filtre.dateFin,
    heureDebut: filtre.heureDebut,
    heureFin: filtre.heureFin,
    siteId: filtre.siteId,
    repasType: filtre.repasType,
  }), [filtre.dateDebut, filtre.dateFin, filtre.heureDebut, filtre.heureFin, filtre.siteId, filtre.repasType]);

  const sseActif = filtreIsToday(filtre);

  const { data: stats = [] } = useQuery({
    queryKey: ['repas-stats-jour', filtreParams],
    queryFn: () => getStatsJour(filtreParams),
    refetchInterval: sseActif ? 30_000 : false,
  });

  const hierParams = useMemo(() => {
    const hier = dayjs(filtre.dateDebut).subtract(1, 'day').format('YYYY-MM-DD');
    return { dateDebut: hier, dateFin: hier, heureDebut: filtre.heureDebut, heureFin: filtre.heureFin, siteId: filtre.siteId, repasType: filtre.repasType };
  }, [filtre.dateDebut, filtre.heureDebut, filtre.heureFin, filtre.siteId, filtre.repasType]);

  const { data: statsHier = [] } = useQuery({
    queryKey: ['repas-stats-hier', hierParams],
    queryFn: () => getStatsJour(hierParams),
  });

  const chartMode = useMemo(() => getChartMode(filtre.dateDebut, filtre.dateFin), [filtre.dateDebut, filtre.dateFin]);
  const histLimit = chartMode === 'heure' ? 500 : chartMode === 'jour' ? 2000 : 5000;

  // historique = données depuis l'API (filtrées)
  const { data: historique = [] } = useQuery({
    queryKey: ['repas-historique-jour', filtreParams, histLimit],
    queryFn: () => getHistoriqueJour(histLimit, filtreParams),
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

  async function handleExportGlobal() {
    setExportGlobalLoading(true);
    try {
      const blob = await getExportGlobal(filtreParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-repas-${filtre.dateDebut}-${filtre.dateFin}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Erreur lors de l\'export global');
    } finally {
      setExportGlobalLoading(false);
    }
  }

  // ── Agrégats ────────────────────────────────────────────────────────────────
  const totalPassages = stats.reduce((s, x) => s + x.totalPassages, 0);
  const totalPlatChaud = stats.reduce((s, x) => s + x.platChaud, 0);
  const totalSandwich  = stats.reduce((s, x) => s + x.sandwich, 0);

  const hierPassages  = statsHier.reduce((s, x) => s + x.totalPassages, 0);
  const hierPlatChaud = statsHier.reduce((s, x) => s + x.platChaud, 0);
  const hierSandwich  = statsHier.reduce((s, x) => s + x.sandwich, 0);
  function calcTrend(today: number, hier: number): number | null {
    if (statsHier.length === 0) return null;
    if (hier === 0) return today > 0 ? 100 : null;
    return ((today - hier) / hier) * 100;
  }

  const trendPassages  = calcTrend(totalPassages, hierPassages);
  const trendPlatChaud = calcTrend(totalPlatChaud, hierPlatChaud);
  const trendSandwich  = calcTrend(totalSandwich, hierSandwich);
  // filteredFeed : pour le feed en direct uniquement (SSE ou historique)
  const filteredFeed = useMemo(() => {
    let result = feedPassages;
    if (filtre.repasType) result = result.filter(p => p.repasType === filtre.repasType);
    if (filtre.matricule) result = result.filter(p => p.matricule.toLowerCase().includes(filtre.matricule!.toLowerCase()));
    return result;
  }, [feedPassages, filtre.repasType, filtre.matricule]);

  // historiqueFiltré : historique complet du jour (API), filtré par matricule/type
  // Utilisé pour KPIs et graphiques — pas affecté par la limite SSE de 50 passages
  const historiqueFiltré = useMemo(() => {
    let result = historique;
    if (filtre.repasType) result = result.filter(p => p.repasType === filtre.repasType);
    if (filtre.matricule) result = result.filter(p => p.matricule.toLowerCase().includes(filtre.matricule!.toLowerCase()));
    return result;
  }, [historique, filtre.repasType, filtre.matricule]);

  const kpiPassages  = filtre.matricule ? historiqueFiltré.length : totalPassages;
  const kpiPlatChaud = filtre.matricule
    ? historiqueFiltré.filter(p => p.repasType === 'PlatChaud').length
    : totalPlatChaud;
  const kpiSandwich  = filtre.matricule
    ? historiqueFiltré.filter(p => p.repasType === 'Sandwich').length
    : totalSandwich;

  const chartData = useMemo(() => buildChartData(historiqueFiltré, chartMode, filtre.dateDebut, filtre.dateFin),
    [historiqueFiltré, chartMode, filtre.dateDebut, filtre.dateFin]);
  const pieData = useMemo(() => [
    { name: 'Plats chauds', value: kpiPlatChaud },
    { name: 'Sandwich', value: kpiSandwich },
  ], [kpiPlatChaud, kpiSandwich]);

  const siteData = useMemo(() => {
    if (filtre.matricule) {
      const grouped: Record<string, { platChaud: number; sandwich: number }> = {};
      for (const p of historiqueFiltré) {
        if (!grouped[p.siteId]) grouped[p.siteId] = { platChaud: 0, sandwich: 0 };
        if (p.repasType === 'PlatChaud') grouped[p.siteId].platChaud++;
        else grouped[p.siteId].sandwich++;
      }
      // Tous les sites toujours visibles, groupés par siteId pour éviter les incohérences de noms
      return stats.map(s => ({
        site: s.nomSite,
        platChaud: grouped[s.siteId]?.platChaud ?? 0,
        sandwich: grouped[s.siteId]?.sandwich ?? 0,
      }));
    }
    return stats.map(s => ({ site: s.nomSite, platChaud: s.platChaud, sandwich: s.sandwich }));
  }, [filtre.matricule, historiqueFiltré, stats]);

  return (
    <div style={{ padding: 18 }}>

      {/* Panneau filtres */}
      <DashboardFilters onApply={setFiltre} />

      {/* Barre d'actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <RoleGate allowed={['Prestataire', 'AdminSEBN', 'ResponsableCantine']}>
          <Button onClick={handleExportGlobal} loading={exportGlobalLoading} type="primary" ghost>
            Export résumé
          </Button>
        </RoleGate>
        <RoleGate allowed={['AdminSEBN', 'ResponsableCantine']}>
          <Button onClick={handleExportExcel} loading={exportLoading} type="primary" ghost>
            Export détaillé
          </Button>
        </RoleGate>
      </div>

      {/* KPI grid */}
      {(() => {
        const jourUnique = filtre.dateDebut === filtre.dateFin;
        return (
          <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
            <Col xs={12} sm={8}>
              <KpiCard label="Repas servis" value={kpiPassages} color="#2563eb" bgColor="#eff6ff"
                icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>}
                percent={Math.min(100, Math.round(kpiPassages / 5))} trend={jourUnique && !filtre.matricule ? trendPassages : undefined} />
            </Col>
            <Col xs={12} sm={8}>
              <KpiCard label="Plats chauds" value={kpiPlatChaud} color="#2563eb" bgColor="#eff6ff"
                icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                percent={kpiPassages ? Math.round(kpiPlatChaud / kpiPassages * 100) : 0} trend={jourUnique && !filtre.matricule ? trendPlatChaud : undefined} />
            </Col>
            <Col xs={12} sm={8}>
              <KpiCard label="Sandwichs" value={kpiSandwich} color="#7c3aed" bgColor="#fdf4ff"
                icon={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
                percent={kpiPassages ? Math.round(kpiSandwich / kpiPassages * 100) : 0} trend={jourUnique && !filtre.matricule ? trendSandwich : undefined} />
            </Col>
          </Row>
        );
      })()}

      {/* Graphiques — carte unique divisée */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 2fr', gap: 0 }}>

          {/* ── Gauche : Répartition plats (Pie donut) ── */}
          <div style={{ paddingRight: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text1)' }}>
              Répartition plats
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginLeft: 6 }}>
                {filtre.dateDebut === filtre.dateFin ? filtre.dateDebut : `${filtre.dateDebut} → ${filtre.dateFin}`}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  dataKey="value"
                  labelLine={false}
                  label={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  <Label content={({ viewBox }) => {
                    const { cx, cy } = viewBox as { cx: number; cy: number };
                    return (
                      <g>
                        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 800, fill: '#0f172a' }}>
                          {kpiPassages.toLocaleString('fr')}
                        </text>
                        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#64748b' }}>
                          repas
                        </text>
                      </g>
                    );
                  }} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Légende manuelle avec détails */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {[
                { label: 'Plats chauds', value: kpiPlatChaud, color: '#2563eb', bg: '#eff6ff' },
                { label: 'Sandwich',     value: kpiSandwich,  color: '#7c3aed', bg: '#fdf4ff' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: item.bg, borderRadius: 8, padding: '6px 10px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value.toLocaleString('fr')}</span>
                  {kpiPassages > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      ({Math.round(item.value / kpiPassages * 100)}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Séparateur vertical */}
          <div style={{ background: 'var(--border)' }} />

          {/* ── Droite : Passages par heure/jour/mois + Repas par site ── */}
          <div style={{ paddingLeft: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text1)' }}>
              {chartMode === 'heure' ? 'Passages par heure' : chartMode === 'jour' ? 'Passages par jour' : 'Passages par mois'}
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginLeft: 6 }}>
                {filtre.dateDebut === filtre.dateFin ? filtre.dateDebut : `${filtre.dateDebut} → ${filtre.dateFin}`}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: chartMode === 'jour' && chartData.length > 20 ? 9 : 11 }} interval={chartMode === 'jour' && chartData.length > 14 ? Math.ceil(chartData.length / 14) : 0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="platChaud" name="Plat chaud" stackId="a" fill="#2563eb" />
                <Bar dataKey="sandwich"  name="Sandwich"   stackId="a" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Repas par site (divider + bar horizontal) */}
            <RoleGate allowed={['AdminSEBN']}>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text1)' }}>
                  Repas par site
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* Noms des sites en HTML — alignés en haut de chaque barre */}
                  <div style={{ width: 148, flexShrink: 0, display: 'flex', flexDirection: 'column', paddingBottom: 30 }}>
                    {siteData.map(s => (
                      <div key={s.site} style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: 2, paddingRight: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', lineHeight: 1.2, textAlign: 'right' }}>
                          {s.site}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* BarChart sans YAxis */}
                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height={Math.max(100, siteData.length * 44 + 40)}>
                      <BarChart data={siteData} layout="vertical" margin={{ top: 8, right: 48, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="site" width={0} tick={false} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="platChaud" name="Plat chaud" fill="#2563eb" radius={[0, 3, 3, 0]}>
                          <LabelList dataKey="platChaud" position="right" style={{ fontSize: 10, fill: '#2563eb', fontWeight: 600 }} />
                        </Bar>
                        <Bar dataKey="sandwich" name="Sandwich" fill="#7c3aed" radius={[0, 3, 3, 0]}>
                          <LabelList dataKey="sandwich" position="right" style={{ fontSize: 10, fill: '#7c3aed', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </RoleGate>
          </div>
        </div>
      </div>

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
            {filteredFeed.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Aucun passage sur cette période</td></tr>
            ) : filteredFeed.slice(0, 8).map(p => (
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
