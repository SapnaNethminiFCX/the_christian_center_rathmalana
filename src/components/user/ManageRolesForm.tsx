"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import type { Role } from "@/application/slices/sessionSlice";

/**
 * V2 role-management form. Lets a super-admin tick / un-tick which roles a
 * user holds. UI-only — the save handler currently just toasts. When the
 * backend grows a role-mutation endpoint, replace `onSave` with a real PATCH.
 *
 * Mirrors the prototype's manage-roles dialog
 * (src/ui_structure/v2/project/tccr-screens-admin.jsx).
 */

interface Props {
  userName: string;
  initialRoles: Role[];
}

const ALL_ROLES: { id: Role; label: string; help: string; locked?: boolean }[] = [
  { id: "member", label: "Member", help: "Every signed-in user has this — cannot be removed.", locked: true },
  { id: "student", label: "Student", help: "Browse the Bible School catalogue and apply for course enrolments." },
  { id: "leader", label: "Cell Leader", help: "Lead a cell, file weekly reports, manage members." },
  { id: "g12", label: "G12 Leader", help: "Oversee a network of leaders, promote new ones." },
  { id: "admin", label: "Administrator", help: "Approve role requests, manage courses, view network analytics." },
  { id: "super_admin", label: "Super Admin", help: "Manage administrators and platform settings." },
];

export function ManageRolesForm({ userName, initialRoles }: Props) {
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<Set<Role>>(new Set(initialRoles));
  const [saving, setSaving] = useState(false);

  // Reset when the user changes (e.g. SPA navigation between user-detail pages)
  useEffect(() => {
    setSelected(new Set(initialRoles));
  }, [initialRoles]);

  const isDirty = (() => {
    if (selected.size !== initialRoles.length) return true;
    for (const r of initialRoles) if (!selected.has(r)) return true;
    return false;
  })();

  const toggle = (id: Role, locked?: boolean) => {
    if (locked) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const cancel = () => setSelected(new Set(initialRoles));

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      dispatch(
        pushToast({
          tone: "success",
          title: "Roles updated",
          message: `${userName} now holds ${selected.size} role${selected.size === 1 ? "" : "s"} (UI only — backend pending).`,
        }),
      );
    }, 350);
  };

  return (
    <div>
      <p
        className="settings-sub"
        style={{ marginTop: 0, marginBottom: 16 }}
      >
        Roles are additive — adding <b style={{ color: "var(--color-primary)" }}>Leader</b> or{" "}
        <b style={{ color: "var(--color-primary)" }}>G12</b> on top of a Student keeps every
        existing access intact. <b style={{ color: "var(--color-primary)" }}>Member</b> is required
        for every signed-in user.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ALL_ROLES.map((r) => {
          const checked = selected.has(r.id);
          return (
            <label
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 14,
                padding: "14px 18px",
                background: checked ? "rgba(188,233,85,0.12)" : "#fff",
                border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-stroke)"}`,
                borderRadius: 12,
                cursor: r.locked ? "default" : "pointer",
                opacity: r.locked && !checked ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={r.locked}
                onChange={() => toggle(r.id, r.locked)}
                style={{ accentColor: "var(--color-primary)", width: 18, height: 18, marginTop: 2 }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--color-primary)",
                  }}
                >
                  {r.label}
                  <span className={`role-chip ${r.id}`}>{r.id === "g12" ? "G12" : r.id.replace("_", " ")}</span>
                  {r.locked && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--color-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <Icon name="lock" size={11} /> required
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                  {r.help}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="form-actions" style={{ borderTop: "none", marginTop: 20 }}>
        <Button variant="ghost" disabled={!isDirty || saving} onClick={cancel}>
          Cancel
        </Button>
        <Button icon="save" disabled={!isDirty || saving} onClick={save}>
          {saving ? "Saving…" : "Save roles"}
        </Button>
      </div>
    </div>
  );
}
