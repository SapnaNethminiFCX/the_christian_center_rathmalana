"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface DirectoryUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
}

interface Props {
  open: boolean;
  /** UIDs already in the cell — these are filtered out of the suggestion list. */
  existingUids?: string[];
  /**
   * Constrain the directory search to specific roles (e.g. ["member"] for a
   * Leader, ["member","leader"] for a G12). Omitting it disables the filter.
   * Until the backend scopes /users for Leader/G12 callers, this is appended
   * as a `roles=<csv>` query param and ALSO applied to results client-side.
   */
  roleFilter?: string[] | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (uids: string[]) => void;
}

/**
 * Typeahead-driven add-member dialog used in Leader / G12 cell detail.
 * Calls GET /users?search=&limit=20 — debounced 250 ms — and lets the caller
 * pick one or many users to add via POST /cells/:id/members.
 */
export function AddMemberDialog({ open, existingUids = [], roleFilter, busy, onCancel, onConfirm }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, DirectoryUser>>(new Map());

  // Stabilise existingUids — parent passes a fresh array on every render which
  // would otherwise cancel the in-flight fetch mid-flight via the effect cleanup.
  const existingKey = existingUids.join("|");
  const existingSet = useMemo(() => new Set(existingUids), [existingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same stabilisation for roleFilter.
  const roleFilterKey = (roleFilter ?? []).join(",");

  useEffect(() => {
    if (!open) {
      setQ(""); setResults([]); setSelected(new Map()); return;
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // V2 backend: case-SENSITIVE firstName prefix via `?search=`. To handle
        // mixed-case data ("Sapna" vs "samantha") we fan out two requests in
        // parallel — original and Title-Case — then dedupe by uid.
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

        // Tolerate every common envelope: raw array, {items:[]}, {data:[]},
        // {results:[]}, or even a single user object. Then dedupe by uid.
        const seen = new Set<string>();
        const rawItems: unknown[] = [];
        for (const res of responses) {
          let bucket: unknown[] = [];
          if (Array.isArray(res)) {
            bucket = res;
          } else if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (Array.isArray(obj.items)) bucket = obj.items;
            else if (Array.isArray(obj.data)) bucket = obj.data;
            else if (Array.isArray(obj.results)) bucket = obj.results;
            else if (Array.isArray(obj.users)) bucket = obj.users;
          }
          for (const it of bucket) {
            const uid = String((it as Record<string, unknown>).uid ?? (it as Record<string, unknown>).id ?? "");
            if (uid && !seen.has(uid)) { seen.add(uid); rawItems.push(it); }
          }
        }

        // Normalise field names — backend may use snake_case or different keys.
        const items: DirectoryUser[] = rawItems.map((r) => {
          const u = r as Record<string, unknown>;
          return {
            uid: String(u.uid ?? u.id ?? u.userId ?? u.user_id ?? ""),
            firstName: typeof u.firstName === "string" ? u.firstName : (typeof u.first_name === "string" ? u.first_name : undefined),
            lastName:  typeof u.lastName  === "string" ? u.lastName  : (typeof u.last_name  === "string" ? u.last_name  : undefined),
            email:     typeof u.email     === "string" ? u.email     : undefined,
            profilePhotoUrl: typeof u.profilePhotoUrl === "string" ? u.profilePhotoUrl
                            : typeof u.profile_photo_url === "string" ? u.profile_photo_url
                            : typeof u.avatar === "string" ? u.avatar : null,
            roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
          };
        });

        // Only drop obvious non-candidates here (no uid, or admin-role).
        // The "already in this cell" filter is applied at render time so
        // the fetch effect doesn't depend on the parent-renewed array.
        const safe = items.filter((u) => {
          if (!u.uid) return false;
          const roles = u.roles ?? [];
          if (roles.includes("admin") || roles.includes("super_admin")) return false;
          // Defence-in-depth: if the backend ignored ?roles=, still respect
          // the caller's intent. Every user holds `member` as a base role,
          // so checking "any overlap" with the allow-list would let Leaders
          // and G12s slip through — we must reject any user whose roles
          // include something OUTSIDE the allow-list. Empty/missing role
          // array is allowed through for legacy member records.
          if (roleFilter && roleFilter.length > 0 && roles.length > 0) {
            const allowed = new Set(roleFilter);
            if (roles.some((r) => !allowed.has(r))) return false;
          }
          return true;
        });
        setResults(safe);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return;
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, roleFilterKey]);

  // Filter out users already in this cell at render time (cheap; no refetch).
  const visibleResults = useMemo(
    () => results.filter((u) => !existingSet.has(u.uid)),
    [results, existingSet],
  );

  const toggle = (u: DirectoryUser) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(u.uid)) next.delete(u.uid);
      else next.set(u.uid, u);
      return next;
    });
  };

  const fullName = (u: DirectoryUser): string =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;

  return (
    <Modal open={open} onClose={onCancel}>
      <h2 style={{ margin: 0, marginBottom: 4 }}>Add members</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 13, fontFamily: "var(--font-body)" }}>
        Search by name or email. Type at least 2 characters.
      </p>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
        <input
          className="input"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Sapna or sapna@…"
          style={{ paddingLeft: 36, width: "100%" }}
        />
      </div>

      {selected.size > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[...selected.values()].map((u) => (
            <span key={u.uid} className="chip active" style={{ paddingRight: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {fullName(u)}
              <button
                type="button"
                onClick={() => toggle(u)}
                aria-label={`Remove ${fullName(u)}`}
                style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, color: "inherit", display: "inline-flex" }}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--color-stroke)", borderRadius: 10 }}>
        {loading && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            Searching…
          </div>
        )}
        {!loading && q.trim().length >= 2 && visibleResults.length === 0 && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            No matches.
          </div>
        )}
        {!loading && q.trim().length < 2 && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            Start typing to see suggestions.
          </div>
        )}
        {visibleResults.map((u) => {
          const isSelected = selected.has(u.uid);
          return (
            <button
              key={u.uid}
              type="button"
              onClick={() => toggle(u)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                background: isSelected ? "rgba(188,233,85,0.12)" : "transparent",
                border: 0,
                borderBottom: "1px solid var(--color-stroke-2)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Avatar src={u.profilePhotoUrl ?? undefined} size="sm" name={fullName(u)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}>
                  {fullName(u)}
                </div>
                {u.email && (
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                    {u.email}
                  </div>
                )}
              </div>
              {isSelected
                ? <Icon name="check-circle" size={18} style={{ color: "var(--color-accent-hover)" }} />
                : <Icon name="plus-circle" size={18} style={{ color: "var(--color-muted)" }} />}
            </button>
          );
        })}
      </div>

      <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: 16, borderTop: "none" }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          icon="user-plus"
          disabled={busy || selected.size === 0}
          onClick={() => onConfirm([...selected.keys()])}
        >
          {busy ? "Adding…" : `Add ${selected.size > 0 ? selected.size : ""} member${selected.size === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Modal>
  );
}
