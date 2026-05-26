"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { isRole, type Role } from "@/application/slices/sessionSlice";

interface RoleOption {
  value: Role;
  label: string;
  ico: string;
}

interface Props {
  user: { name: string; avatar?: string };
  role?: string;
  /** All roles this user holds. Switcher appears only if length > 1. */
  roles?: string[];
  activeRole?: Role | null;
  onSwitchRole?: (role: Role) => void;
  onLogout: () => void;
}

const ROLE_OPTIONS: Record<Role, RoleOption> = {
  member:      { value: "member",      label: "Member view",      ico: "user" },
  student:     { value: "student",     label: "Student view",     ico: "graduation-cap" },
  leader:      { value: "leader",      label: "Leader view",      ico: "users" },
  g12:         { value: "g12",         label: "G12 view",         ico: "share-2" },
  admin:       { value: "admin",       label: "Admin view",       ico: "shield" },
  super_admin: { value: "super_admin", label: "Super admin view", ico: "shield-check" },
};

export function UserMenu({ user, role, roles, activeRole, onSwitchRole, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const validRoles = (roles ?? []).filter(isRole);
  const showSwitcher = validRoles.length > 1 && !!onSwitchRole;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        aria-label="Account menu"
      >
        <Avatar src={user.avatar} size="sm" name={user.name} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 240,
            background: "var(--color-surface)",
            borderRadius: 12,
            boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18), 0 4px 8px -4px rgba(21,42,36,0.08)",
            border: "1px solid var(--color-stroke)",
            padding: 6,
            zIndex: 100,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(21,42,36,0.08)", marginBottom: 4 }}>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
              {user.name}
            </div>
            {role && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", marginTop: 2 }}>
                {role}
              </div>
            )}
          </div>

          {/* Role switcher — only shown when user holds multiple roles */}
          {showSwitcher && (
            <>
              <div style={{ padding: "8px 12px 4px", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-body-green)" }}>
                Switch view
              </div>
              {validRoles.map((r) => {
                const opt = ROLE_OPTIONS[r];
                const active = activeRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => { onSwitchRole?.(r); setOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: active ? "rgba(188,233,85,0.15)" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "var(--color-primary)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <Icon name={opt.ico} size={16} />
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {active && <Icon name="check" size={14} style={{ color: "#4ade80" }} />}
                  </button>
                );
              })}
              <div style={{ height: 1, background: "rgba(21,42,36,0.08)", margin: "6px 4px" }} />
            </>
          )}

          <button
            onClick={onLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--color-primary)",
            }}
          >
            <Icon name="log-out" size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
