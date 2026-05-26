interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, showLabel = true, className }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 9999,
          background: "#EEF1EF",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", width: `${v}%`, background: "#BCE955" }} />
      </div>
      {showLabel && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#41574A" }}>{v}%</span>
      )}
    </div>
  );
}
