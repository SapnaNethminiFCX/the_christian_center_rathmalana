interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
}

/**
 * SVG donut chart for meeting-type / cell-type breakdown.
 * Renders even if the total is 0 (shows a neutral ring).
 */
export function MeetingTypeDonut({ slices, size = 180 }: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 38;
  const cx = 50;
  const cy = 50;
  const stroke = 14;

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={r} stroke="var(--color-stroke)" strokeWidth={stroke} fill="none" />
        <text x={50} y={54} textAnchor="middle" fontSize={6} fill="var(--color-muted)" fontFamily="var(--font-body)">
          No data
        </text>
      </svg>
    );
  }

  let acc = 0;
  const circumference = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <circle cx={cx} cy={cy} r={r} stroke="var(--color-stroke-2)" strokeWidth={stroke} fill="none" />
      {slices.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * circumference;
        const offset = (acc / total) * circumference;
        acc += s.value;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
      })}
      <text x={50} y={48} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary)" fontFamily="var(--font-heading)">
        {total}
      </text>
      <text x={50} y={58} textAnchor="middle" fontSize={5} fill="var(--color-body-green)" fontFamily="var(--font-body)">
        total
      </text>
    </svg>
  );
}
