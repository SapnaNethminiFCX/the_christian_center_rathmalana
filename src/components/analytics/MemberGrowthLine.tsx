interface Point {
  label: string;
  value: number;
}

interface Props {
  points: Point[];
  height?: number;
}

export function MemberGrowthLine({ points, height = 180 }: Props) {
  if (points.length < 2) return null;
  const maxV = Math.max(...points.map((p) => p.value));
  const minV = Math.min(...points.map((p) => p.value));
  const range = maxV - minV || 1;
  const padBottom = 24;
  const padTop = 14;
  const drawableH = height - padBottom - padTop;

  const xs = points.map((_, i) => (i / (points.length - 1)) * 96 + 2);
  const ys = points.map((p) => padTop + (1 - (p.value - minV) / range) * drawableH);

  const pathD = points
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(" ");

  const areaD = `${pathD} L ${xs[xs.length - 1].toFixed(2)} ${(padTop + drawableH).toFixed(2)} L ${xs[0].toFixed(2)} ${(padTop + drawableH).toFixed(2)} Z`;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <line x1={0} x2={100} y1={padTop + drawableH} y2={padTop + drawableH} stroke="var(--color-stroke)" strokeWidth={0.4} />
      <path d={areaD} fill="rgba(188,233,85,0.25)" />
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r={1.6} fill="var(--color-accent)" stroke="var(--color-primary)" strokeWidth={0.8} />
          <text
            x={xs[i]}
            y={height - 8}
            textAnchor="middle"
            fontSize={6}
            fill="var(--color-body-green)"
            fontFamily="var(--font-body)"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
