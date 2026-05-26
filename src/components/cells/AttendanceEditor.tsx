"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { AttendanceEntry } from "@/lib/mock/cellReports";

interface DirectoryUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
}

interface Props {
  attendance: AttendanceEntry[];
  onChange: (next: AttendanceEntry[]) => void;
  /**
   * Constrain the directory search to specific roles (e.g. ["member"] for a
   * Leader, ["member","leader"] for a G12). Omitting it disables the filter.
   */
  roleFilter?: string[] | null;
}

export function AttendanceEditor({ attendance, onChange, roleFilter }: Props) {
  const roleFilterKey = (roleFilter ?? []).join(",");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Real-time search: GET /users?search=<prefix> with case fan-out (Title-Case
  // and as-typed), debounced 250ms. Mirrors the AddMemberDialog pattern.
  useEffect(() => {
    if (!adding) { setResults([]); return; }
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
        const variants = Array.from(new Set([term, titleCase]));
        const responses = await Promise.all(
          variants.map((v) => {
            const qs = new URLSearchParams({ search: v, limit: "20" });
            if (roleFilter && roleFilter.length > 0) qs.set("roles", roleFilter.join(","));
            return apiRequest<unknown>(`/users?${qs}`).catch(() => null);
          }),
        );
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: DirectoryUser[] = [];
        for (const res of responses) {
          let bucket: unknown[] = [];
          if (Array.isArray(res)) bucket = res;
          else if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (Array.isArray(obj.items)) bucket = obj.items;
            else if (Array.isArray(obj.data)) bucket = obj.data;
            else if (Array.isArray(obj.results)) bucket = obj.results;
          }
          const needle = term.toLowerCase();
          for (const it of bucket) {
            const u = it as Record<string, unknown>;
            const uid = String(u.uid ?? u.id ?? "");
            if (!uid || seen.has(uid)) continue;
            // Skip admins and anyone already in the attendance list.
            const roles = Array.isArray(u.roles) ? (u.roles as string[]) : [];
            if (roles.includes("admin") || roles.includes("super_admin")) continue;
            // Defence-in-depth in case the backend ignored ?roles=. Every user
            // holds `member` as a base role, so checking "any overlap" would
            // let G12s slip through — instead reject any role OUTSIDE the
            // allow-list. Empty/missing role array is allowed through for
            // legacy records.
            if (roleFilter && roleFilter.length > 0 && roles.length > 0) {
              const allowed = new Set(roleFilter);
              if (roles.some((r) => !allowed.has(r))) continue;
            }
            if (attendance.some((a) => a.memberId === uid)) continue;
            // Backend's `?search=` isn't always honored — name/email match
            // client-side to keep the list relevant to what's typed.
            const firstName = typeof u.firstName === "string" ? u.firstName : (typeof u.first_name === "string" ? u.first_name : undefined);
            const lastName  = typeof u.lastName  === "string" ? u.lastName  : (typeof u.last_name  === "string" ? u.last_name  : undefined);
            const email     = typeof u.email     === "string" ? u.email     : undefined;
            const haystack = `${firstName ?? ""} ${lastName ?? ""} ${email ?? ""}`.toLowerCase();
            if (!haystack.includes(needle)) continue;
            seen.add(uid);
            merged.push({
              uid,
              firstName,
              lastName,
              email,
              profilePhotoUrl: typeof u.profilePhotoUrl === "string" ? u.profilePhotoUrl : null,
              roles,
            });
          }
        }
        setResults(merged);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return;
        setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, adding, roleFilterKey]);

  const fullName = (u: DirectoryUser): string =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;

  const toggle = (id: string, status: "present" | "absent") => {
    onChange(attendance.map((a) => (a.memberId === id ? { ...a, status } : a)));
  };

  const remove = (id: string) => {
    onChange(attendance.filter((a) => a.memberId !== id));
  };

  const add = (u: DirectoryUser) => {
    onChange([...attendance, { memberId: u.uid, memberName: fullName(u), status: "present" }]);
    setQ("");
    setResults([]);
    setAdding(false);
  };

  const addGuest = (name: string) => {
    onChange([...attendance, { memberId: `guest-${Date.now()}`, memberName: name, status: "present" }]);
    setQ("");
    setResults([]);
    setAdding(false);
  };

  return (
    <div>
      <div className="att-list">
        {attendance.map((a) => {
          const isUnregistered = a.memberId.startsWith("guest-");
          return (
            <div key={a.memberId} className="att-row">
              <div className="name">
                <Avatar name={a.memberName} size="sm" />
                <span>{a.memberName}</span>
                {isUnregistered && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      background: "var(--color-warning-bg)",
                      color: "var(--color-warning)",
                      borderRadius: 9999,
                      fontFamily: "var(--font-body)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    unregistered
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="att-toggle">
                  <button
                    type="button"
                    className={`present${a.status === "present" ? " active" : ""}`}
                    onClick={() => toggle(a.memberId, "present")}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    className={`absent${a.status === "absent" ? " active" : ""}`}
                    onClick={() => toggle(a.memberId, "absent")}
                  >
                    Absent
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.memberId)}
                  aria-label={`Remove ${a.memberName}`}
                  style={{ background: "transparent", border: "none", color: "var(--color-muted)", cursor: "pointer", padding: 4 }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        {adding ? (
          <div>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
              <input
                className="input"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search to add an attendee…"
                style={{ paddingLeft: 36, width: "100%" }}
              />
            </div>
            {q.trim().length >= 2 && (
              <div style={{ marginTop: 8, border: "1px solid var(--color-stroke)", borderRadius: 10, maxHeight: 240, overflowY: "auto" }}>
                {searching && (
                  <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                    Searching…
                  </div>
                )}
                {!searching && (
                  <div style={{ padding: 12, fontFamily: "var(--font-body)", fontSize: 13, borderBottom: results.length > 0 ? "1px solid var(--color-stroke-2)" : undefined }}>
                    {results.length === 0 && (
                      <div style={{ color: "var(--color-muted)", marginBottom: 6 }}>No registered matches.</div>
                    )}
                    <button
                      type="button"
                      onClick={() => addGuest(q.trim())}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "transparent", border: "1px dashed var(--color-stroke)",
                        padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                        color: "var(--color-primary)", fontFamily: "var(--font-body)", fontSize: 13,
                      }}
                    >
                      <Icon name="user-plus" size={13} />
                      Add &ldquo;{q.trim()}&rdquo; as unregistered
                    </button>
                  </div>
                )}
                {results.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => add(u)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "transparent",
                      border: 0,
                      borderBottom: "1px solid var(--color-stroke-2)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Avatar src={u.profilePhotoUrl ?? undefined} name={fullName(u)} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
                        {fullName(u)}
                      </div>
                      {u.email && (
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                          {u.email}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setQ(""); setResults([]); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" icon="user-plus" onClick={() => setAdding(true)}>
            Add attendee
          </Button>
        )}
      </div>
    </div>
  );
}
