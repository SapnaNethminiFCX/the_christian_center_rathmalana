import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn(className)}
      style={{
        background: "#fff",
        border: "1px solid #E5E5E5",
        borderRadius: 16,
        boxShadow: "0 1px 3px 0 rgba(21,42,36,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
