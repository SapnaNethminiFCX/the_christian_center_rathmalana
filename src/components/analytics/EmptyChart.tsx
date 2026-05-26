import { Icon } from "@/components/ui/Icon";

interface Props {
  message?: string;
  height?: number;
}

/** Friendly "no data yet" placeholder used inside ChartCard while the API
 * returns an empty array or while a fresh cell has no reports yet. */
export function EmptyChart({
  message = "Not enough data yet — file a few cell reports to start seeing trends.",
  height = 180,
}: Props) {
  return (
    <div
      style={{
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "var(--color-muted)",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        padding: "0 16px",
        textAlign: "center",
      }}
    >
      <Icon name="bar-chart" size={26} style={{ opacity: 0.45 }} />
      <span>{message}</span>
    </div>
  );
}
