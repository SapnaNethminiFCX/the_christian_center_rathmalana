import { cn } from "@/lib/cn";

interface EyebrowProps {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}

export function Eyebrow({ children, dark, className }: EyebrowProps) {
  return <span className={cn("eyebrow", dark && "eyebrow--dark", className)}>{children}</span>;
}
