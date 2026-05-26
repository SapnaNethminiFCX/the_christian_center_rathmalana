"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { NotificationItem } from "@/lib/mock/notifications";

const TONE_COLOR: Record<string, string> = {
  success: "#3DB55F",
  warning: "#D97706",
  info: "#152A24",
  error: "#DC2626",
};

interface Props {
  items: NotificationItem[];
  onItemClick?: (item: NotificationItem) => void;
}

export function NotificationBell({ items, onItemClick }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const unread = items.filter((i) => !i.read).length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="dot" />}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            background: "var(--color-surface)",
            borderRadius: 12,
            boxShadow:
              "0 10px 28px -8px rgba(21,42,36,0.18), 0 4px 8px -4px rgba(21,42,36,0.08)",
            border: "1px solid var(--color-stroke)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(21,42,36,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--color-primary)",
              }}
            >
              Notifications
            </div>
            {unread > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "#BCE955",
                  color: "var(--color-primary)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  fontWeight: 600,
                }}
              >
                {unread} new
              </span>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {items.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--color-body-green)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              >
                You&apos;re all caught up.
              </div>
            ) : (
              items.map((n, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onItemClick?.(n);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    gap: 12,
                    padding: "12px 16px",
                    border: "none",
                    borderBottom:
                      i < items.length - 1 ? "1px solid rgba(21,42,36,0.06)" : "none",
                    cursor: "pointer",
                    background: n.read ? "transparent" : "rgba(188,233,85,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9999,
                      background: "#EEF1EF",
                      color: TONE_COLOR[n.tone] || "#152A24",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={n.ico} size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--color-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </div>
                    {n.body && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12,
                          color: "var(--color-body-green)",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {n.body}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 11,
                        color: "#A0ACA6",
                        marginTop: 4,
                      }}
                    >
                      {n.when}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
