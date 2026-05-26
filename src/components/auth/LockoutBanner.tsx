"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface Props {
  /** Seconds remaining until lock clears. Component ticks down to 0. */
  initialSeconds: number;
  onClear: () => void;
  onReset: () => void;
}

function formatMmSs(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Lockout banner shown when `POST /auth/track-failure` returns
 * `{ locked: true }`. The countdown is purely visual — the server enforces
 * the actual 15-min lock window. When it hits 0, `onClear` fires so the form
 * can re-enable.
 */
export function LockoutBanner({ initialSeconds, onClear, onReset }: Props) {
  const [seconds, setSeconds] = useState(Math.max(0, initialSeconds));

  useEffect(() => {
    if (seconds <= 0) {
      onClear();
      return;
    }
    const id = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [seconds, onClear]);

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--color-error-bg, #FEF2F2)",
        border: "1px solid rgba(220,38,38,0.3)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 14,
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "#7F1D1D",
      }}
    >
      <Icon name="lock" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Too many failed attempts</div>
        <div style={{ lineHeight: 1.45 }}>
          For your safety, sign-in is paused for{" "}
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{formatMmSs(seconds)}</b>.
          Try resetting your password if you can&apos;t remember it.
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{
            marginTop: 8,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "#7F1D1D",
            fontWeight: 600,
            textDecoration: "underline",
            fontSize: 13,
            fontFamily: "var(--font-body)",
          }}
        >
          Reset password instead
        </button>
      </div>
    </div>
  );
}
