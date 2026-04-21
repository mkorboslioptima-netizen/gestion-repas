import { useState, useMemo } from 'react';
import { Button, DatePicker, Select, Space, TimePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { getSites } from '../api/sites';
import { getEmployes } from '../api/employes';
import { useRole } from '../auth/useRole';

export interface FiltreState {
  dateDebut: string;
  dateFin: string;
  heureDebut: string;
  heureFin: string;
  repasType?: 'PlatChaud' | 'Sandwich';
  siteId?: string;
  matricule?: string;
}

interface Props {
  onApply: (f: FiltreState) => void;
}

const FMT_DATE = 'YYYY-MM-DD';
const FMT_TIME = 'HH:mm';

function today() { return dayjs().format(FMT_DATE); }

export default function DashboardFilters({ onApply }: Props) {
  const role = useRole();
  const [dates, setDates] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [heureDebut, setHeureDebut] = useState<Dayjs>(dayjs('00:00', FMT_TIME));
  const [heureFin, setHeureFin]     = useState<Dayjs>(dayjs('23:59', FMT_TIME));
  const [repasType, setRepasType]   = useState<'PlatChaud' | 'Sandwich' | undefined>(undefined);
  const [siteId, setSiteId]         = useState<string | undefined>(undefined);
  const [matricule, setMatricule]   = useState<string | undefined>(undefined);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: role === 'AdminSEBN',
  });

  // Charge les employés du site sélectionné (ou tous si admin sans filtre site)
  const { data: employes = [] } = useQuery({
    queryKey: ['employes-filtre', siteId],
    queryFn: () => getEmployes(siteId ?? ''),
    enabled: !!siteId || role !== 'AdminSEBN',
  });

  // Pour admin sans site sélectionné : charge tous les sites et fusionne
  const { data: allSites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
    enabled: role === 'AdminSEBN' && !siteId,
  });

  const { data: employesSite1 = [] } = useQuery({
    queryKey: ['employes-filtre', allSites[0]?.siteId],
    queryFn: () => getEmployes(allSites[0]?.siteId ?? ''),
    enabled: role === 'AdminSEBN' && !siteId && allSites.length > 0,
  });

  const { data: employesSite2 = [] } = useQuery({
    queryKey: ['employes-filtre', allSites[1]?.siteId],
    queryFn: () => getEmployes(allSites[1]?.siteId ?? ''),
    enabled: role === 'AdminSEBN' && !siteId && allSites.length > 1,
  });

  const tousEmployes = useMemo(() => {
    if (siteId) return employes;
    return [...employesSite1, ...employesSite2];
  }, [siteId, employes, employesSite1, employesSite2]);

  const matriculeOptions = useMemo(() => [
    { value: '', label: 'Tous les employés' },
    ...tousEmployes.map(e => ({
      value: e.matricule,
      label: `${e.matricule} — ${e.nom} ${e.prenom}`,
    })),
  ], [tousEmployes]);

  function buildState(overrides: Partial<FiltreState> = {}): FiltreState {
    return {
      dateDebut: dates[0].format(FMT_DATE),
      dateFin:   dates[1].format(FMT_DATE),
      heureDebut: heureDebut.format(FMT_TIME),
      heureFin:   heureFin.format(FMT_TIME),
      repasType,
      siteId,
      matricule: matricule || undefined,
      ...overrides,
    };
  }

  function handleApply() { onApply(buildState()); }

  function handleReset() {
    const now = dayjs();
    setDates([now, now]);
    setHeureDebut(dayjs('00:00', FMT_TIME));
    setHeureFin(dayjs('23:59', FMT_TIME));
    setRepasType(undefined);
    setSiteId(undefined);
    setMatricule(undefined);
    onApply({ dateDebut: today(), dateFin: today(), heureDebut: '00:00', heureFin: '23:59', repasType: undefined, siteId: undefined, matricule: undefined });
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', marginBottom: 16,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginRight: 4 }}>Filtres</span>

      <DatePicker.RangePicker
        size="small"
        format="DD/MM/YYYY"
        value={dates}
        onChange={(vals) => { if (vals?.[0] && vals?.[1]) setDates([vals[0], vals[1]]); }}
        allowClear={false}
      />

      <Space size={4}>
        <TimePicker
          size="small"
          format={FMT_TIME}
          value={heureDebut}
          onChange={(t) => { if (t) setHeureDebut(t); }}
          placeholder="Début"
          allowClear={false}
        />
        <span style={{ color: 'var(--text2)', fontSize: 12 }}>→</span>
        <TimePicker
          size="small"
          format={FMT_TIME}
          value={heureFin}
          onChange={(t) => { if (t) setHeureFin(t); }}
          placeholder="Fin"
          allowClear={false}
        />
      </Space>

      <Select
        size="small"
        style={{ width: 130 }}
        value={repasType ?? ''}
        onChange={(v) => {
          const val = v === '' ? undefined : v as 'PlatChaud' | 'Sandwich';
          setRepasType(val);
          onApply(buildState({ repasType: val }));
        }}
        options={[
          { value: '', label: 'Tous les repas' },
          { value: 'PlatChaud', label: 'Plat chaud' },
          { value: 'Sandwich', label: 'Sandwich' },
        ]}
      />

      {role === 'AdminSEBN' && (
        <Select
          size="small"
          style={{ width: 130 }}
          value={siteId ?? ''}
          onChange={(v) => {
            const val = v === '' ? undefined : v;
            setSiteId(val);
            onApply(buildState({ siteId: val }));
          }}
          options={[
            { value: '', label: 'Tous les sites' },
            ...sites.filter(s => s.actif).map(s => ({ value: s.siteId, label: s.nom })),
          ]}
        />
      )}

      <Select
        size="small"
        style={{ width: 200 }}
        showSearch
        allowClear
        placeholder="Employé / Matricule"
        value={matricule ?? ''}
        onChange={(v) => {
          const val = v === '' ? undefined : v;
          setMatricule(val);
          onApply(buildState({ matricule: val }));
        }}
        onClear={() => { setMatricule(undefined); onApply(buildState({ matricule: undefined })); }}
        filterOption={(input, option) =>
          (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
        }
        options={matriculeOptions}
      />

      <Button size="small" onClick={() => {
        const now = dayjs();
        setDates([now, now]);
        setHeureDebut(dayjs('00:00', FMT_TIME));
        setHeureFin(dayjs('23:59', FMT_TIME));
        onApply(buildState({ dateDebut: today(), dateFin: today(), heureDebut: '00:00', heureFin: '23:59' }));
      }}>
        Aujourd'hui
      </Button>
      <Button size="small" type="primary" onClick={handleApply}>
        Appliquer
      </Button>
      <Button size="small" onClick={handleReset}>
        Réinitialiser
      </Button>
    </div>
  );
}
