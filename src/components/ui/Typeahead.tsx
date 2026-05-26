"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";

export interface TypeaheadEntry {
  id?: string;
  name: string;
  avatar?: number | string;
  roles?: readonly string[];
}

interface Props {
  label?: string;
  placeholder?: string;
  hint?: string;
  directory: TypeaheadEntry[];
  value?: string;
  onChange?: (q: string) => void;
  onPick?: (entry: TypeaheadEntry) => void;
  onAddUnregistered?: (name: string) => void;
}

/**
 * Search-as-you-type input with avatar / role-chip suggestion list.
 * Used by cell-members, promote, role-requests flows.
 */
export function Typeahead({
  label,
  placeholder = "Search…",
  hint,
  directory,
  value = "",
  onChange,
  onPick,
  onAddUnregistered,
}: Props) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setQ(value), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trimmed = q.trim();
  const matches = trimmed
    ? directory.filter((d) => d.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 6)
    : [];
  const exact = directory.some((d) => d.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className="field">
        {label && <label className="label">{label}</label>}
        <input
          className="input"
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {hint && <span className="hint">{hint}</span>}
      </div>
      {open && trimmed && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--color-stroke)",
            borderRadius: 12,
            boxShadow: "0 8px 24px -8px rgba(21,42,36,0.18)",
            padding: 6,
            zIndex: 20,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {matches.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "var(--color-muted)",
              }}
            >
              No match in TCCR — they&apos;re not registered yet.
            </div>
          ) : (
            matches.map((m) => (
              <button
                type="button"
                key={m.id ?? m.name}
                onClick={() => {
                  setQ(m.name);
                  setOpen(false);
                  onPick?.(m);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: 8,
                  textAlign: "left",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-stroke-2)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Avatar src={typeof m.avatar === "string" ? m.avatar : undefined} name={m.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-primary)" }}>
                  {m.name}
                </div>
                {m.roles && m.roles.length > 0 && <RoleBadgeStack roles={m.roles} />}
              </button>
            ))
          )}
          {trimmed && !exact && onAddUnregistered && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddUnregistered(trimmed);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                border: 0,
                borderTop: "1px solid var(--color-stroke-2)",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--color-primary)",
                textAlign: "left",
              }}
            >
              <Icon name="user-plus" size={14} /> Add &ldquo;{trimmed}&rdquo; as unregistered member
            </button>
          )}
        </div>
      )}
    </div>
  );
}
