import type { ReactNode } from "react";

interface Props {
  title: string;
  sub?: string;
  right?: ReactNode;
  legend?: { label: string; color: string }[];
  children: ReactNode;
}

export function ChartCard({ title, sub, right, legend, children }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <div>
          <h3>{title}</h3>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {right}
      </div>
      {legend && legend.length > 0 && (
        <div className="legend" style={{ marginBottom: 12 }}>
          {legend.map((l) => (
            <span key={l.label}>
              <i style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
