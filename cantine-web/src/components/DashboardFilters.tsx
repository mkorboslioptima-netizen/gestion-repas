import { useState } from 'react';
import { Button, DatePicker, Space, TimePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

export interface FiltreState {
  dateDebut: string;
  dateFin: string;
  heureDebut: string;
  heureFin: string;
}

interface Props {
  onApply: (f: FiltreState) => void;
}

const FMT_DATE = 'YYYY-MM-DD';
const FMT_TIME = 'HH:mm';

function today() { return dayjs().format(FMT_DATE); }

export default function DashboardFilters({ onApply }: Props) {
  const [dates, setDates] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [heureDebut, setHeureDebut] = useState<Dayjs>(dayjs('00:00', FMT_TIME));
  const [heureFin, setHeureFin]     = useState<Dayjs>(dayjs('23:59', FMT_TIME));

  function handleApply() {
    onApply({
      dateDebut: dates[0].format(FMT_DATE),
      dateFin:   dates[1].format(FMT_DATE),
      heureDebut: heureDebut.format(FMT_TIME),
      heureFin:   heureFin.format(FMT_TIME),
    });
  }

  function handleReset() {
    const now = dayjs();
    setDates([now, now]);
    setHeureDebut(dayjs('00:00', FMT_TIME));
    setHeureFin(dayjs('23:59', FMT_TIME));
    onApply({ dateDebut: today(), dateFin: today(), heureDebut: '00:00', heureFin: '23:59' });
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

      <Button size="small" type="primary" onClick={handleApply}>
        Appliquer
      </Button>
      <Button size="small" onClick={handleReset}>
        Réinitialiser
      </Button>
    </div>
  );
}
