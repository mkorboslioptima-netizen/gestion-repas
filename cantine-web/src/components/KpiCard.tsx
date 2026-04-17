import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  meta?: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  percent?: number;
}

export default function KpiCard({ label, value, meta, color, bgColor, icon, percent }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-card-icon" style={{ background: bgColor, color }}>
          {icon}
        </div>
      </div>
      <div className="kpi-card-value">{typeof value === 'number' ? value.toLocaleString('fr') : value}</div>
      {meta && <div className="kpi-card-meta">{meta}</div>}
      {percent !== undefined && (
        <div className="kpi-bar">
          <div className="kpi-bar-fill" style={{ width: `${percent}%`, background: color }} />
        </div>
      )}
    </div>
  );
}
