interface Props {
  label: string;
  value: string | number;
  delta?: { direction: "up" | "dn"; value: string };
  sub?: string;
}

export function KpiMini({ label, value, delta, sub }: Props) {
  return (
    <div className="kpi-mini">
      <div className="row">
        <span className="lbl">{label}</span>
        {delta && <span className={`delta ${delta.direction}`}>{delta.value}</span>}
      </div>
      <div className="num">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
