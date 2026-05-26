import { cn } from "@/lib/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  style?: React.CSSProperties;
  className?: string;
}

export function Avatar({ src, name = "?", size = "md", style, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cn("avatar", `avatar--${size}`, className)} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} />
      ) : (
        initials
      )}
    </span>
  );
}
