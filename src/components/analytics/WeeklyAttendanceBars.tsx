interface Bar {
  label: string;
  value: number;
}

interface Props {
  bars: Bar[];
  height?: number;
  /** Index of the bar to highlight (defaults to the last one). */
  highlightIndex?: number;
}

/**
 * Lightweight hand-rolled SVG bar chart used by leader / g12 weekly attendance
 * cards. No recharts dependency.
 */
export function WeeklyAttendanceBars({ bars, height = 180, highlightIndex }: Props) {
  if (bars.length === 0) return null;
  const maxVal = Math.max(...bars.map((b) => b.value)) || 1;
  const barW = 100 / bars.length;
  const padBottom = 28;
  const drawableH = height - padBottom;
  const hi = highlightIndex ?? bars.length - 1;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      {/* baseline */}
      <line x1={0} x2={100} y1={drawableH} y2={drawableH} stroke="var(--color-stroke)" strokeWidth={0.4} />
      {bars.map((b, i) => {
        const h = (b.value / maxVal) * (drawableH - 14);
        const x = i * barW + barW * 0.15;
        const w = barW * 0.7;
        const y = drawableH - h;
        const fill = i === hi ? "var(--color-accent)" : "var(--color-primary)";
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={fill} rx={1.5} />
            <text
              x={x + w / 2}
              y={drawableH + 12}
              fill="var(--color-body-green)"
              fontSize={6.5}
              fontFamily="var(--font-body)"
              textAnchor="middle"
            >
              {b.label}
            </text>
            <text
              x={x + w / 2}
              y={y - 3}
              fill={i === hi ? "var(--color-primary)" : "var(--color-body-green)"}
              fontSize={6.5}
              fontWeight={600}
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {b.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
