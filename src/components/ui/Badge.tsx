import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "error" | "archive" | "progress" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = "success", children, className }: BadgeProps) {
  return <span className={cn("badge", `badge--${tone}`, className)}>{children}</span>;
}
