"use client";

import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

interface ArrowLinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  lime?: boolean;
  className?: string;
}

export function ArrowLink({ children, href = "#", onClick, lime, className }: ArrowLinkProps) {
  return (
    <a className={cn("link", lime && "link--lime", className)} href={href} onClick={onClick}>
      {children} <Icon name="arrow-right" size={14} />
    </a>
  );
}
