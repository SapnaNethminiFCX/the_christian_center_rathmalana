"use client";

import { Icon } from "./Icon";
import type { ToastTone } from "@/application/slices/uiSlice";

interface ToastProps {
  tone?: ToastTone;
  title: string;
  message?: string;
  onDismiss?: () => void;
}

const ACCENTS: Record<ToastTone, string> = {
  success: "#3DB55F",
  error: "#DC2626",
  warning: "#D97706",
  info: "#152A24",
};

const ICONS: Record<ToastTone, string> = {
  success: "check-circle",
  error: "x-circle",
  warning: "alert-triangle",
  info: "bell",
};

export function Toast({ tone = "success", title, message, onDismiss }: ToastProps) {
  const accent = ACCENTS[tone];
  const ico = ICONS[tone];
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 200,
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        minWidth: 320,
        maxWidth: 380,
        background: "#fff",
        borderRadius: 14,
        boxShadow:
          "0 10px 15px -3px rgba(21,42,36,0.12), 0 4px 6px -4px rgba(21,42,36,0.08)",
        borderLeft: `4px solid ${accent}`,
        alignItems: "flex-start",
      }}
    >
      <Icon name={ico} size={20} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            color: "#152A24",
          }}
        >
          {title}
        </div>
        {message && (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "#41574A",
              marginTop: 2,
            }}
          >
            {message}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#A0ACA6",
            padding: 0,
          }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
