"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, rightSlot, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={ref}
          id={inputId}
          className={cn("input", error && "input--error", className)}
          style={rightSlot ? { paddingRight: 44 } : undefined}
          {...rest}
        />
        {rightSlot && (
          <span
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {rightSlot}
          </span>
        )}
      </div>
      {error ? (
        <span className="hint" style={{ color: "#DC2626" }}>
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
});
