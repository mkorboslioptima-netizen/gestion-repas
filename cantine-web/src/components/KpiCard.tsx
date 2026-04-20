import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  meta?: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  percent?: number;
  trend?: number | null; // % par rapport à hier, null = pas de données hier
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return <span style={{ fontSize: 11, color: '#94a3b8' }}>— vs hier</span>;
  const up = trend >= 0;
  const arrow = up ? '▲' : '▼';
  const sign  = up ? '+' : '';
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? '#16a34a' : '#dc2626' }}>
      {arrow} {sign}{trend.toFixed(1)}% vs hier
    </span>
  );
}

export default function KpiCard({ label, value, meta, color, bgColor, icon, percent, trend }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-card-icon" style={{ background: bgColor, color }}>
          {icon}
        </div>
      </div>
      <div className="kpi-card-value">{typeof value === 'number' ? value.toLocaleString('fr') : value}</div>
      {trend !== undefined && <TrendBadge trend={trend ?? null} />}
      {meta && <div className="kpi-card-meta">{meta}</div>}
      {percent !== undefined && (
        <div className="kpi-bar">
          <div className="kpi-bar-fill" style={{ width: `${percent}%`, background: color }} />
        </div>
      )}
    </div>
  );
}
