export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(21,42,36,0.15)",
        borderTopColor: "#152A24",
        borderRadius: "50%",
        animation: "edupath-spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes edupath-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
