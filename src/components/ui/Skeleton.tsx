interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, rounded = 8, className }: SkeletonProps) {
  return (
    <span
      className={className}
      style={{
        display: "block",
        width,
        height,
        borderRadius: rounded,
        background: "linear-gradient(90deg, #EEF1EF 0%, #F6F6F6 50%, #EEF1EF 100%)",
        backgroundSize: "200% 100%",
        animation: "edupath-skeleton 1.4s ease-in-out infinite",
      }}
    >
      <style>{`@keyframes edupath-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </span>
  );
}
