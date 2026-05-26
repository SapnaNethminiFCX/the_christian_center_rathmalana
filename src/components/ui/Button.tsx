"use client";

import { forwardRef } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "secondary-light"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: string;
  iconAfter?: string;
  children?: React.ReactNode;
  className?: string;
}

type ButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", full, icon, iconAfter, children, className, type = "button", ...rest },
  ref,
) {
  const cls = cn(
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    full && "btn--full",
    className,
  );
  const iconSize = size === "lg" ? 18 : 16;
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={iconSize} />}
    </button>
  );
});
