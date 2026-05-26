"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCell, useCellMembers } from "@/application/hooks/useCell";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { apiRequest } from "@/infrastructure/api/request";
import { cellMemberSearchRoles } from "@/lib/cellMemberSearchRoles";

/**
 * Cell Members page — Leader / G12 / Admin only.
 *
 * Add members: typeahead `GET /users?search=<prefix>&limit=20` → select →
 * `POST /cells/:id/members { userUids }`. Backend auto-scopes Leader/G12
 * callers to approved, non-admin users.
 *
 * Remove: DELETE /cells/:id/members/:uid with confirmation.
 */

interface UserResult {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
}

/** Tolerate every common envelope returned by GET /users. */
function unwrapUsers(res: unknown): UserResult[] {
  let raw: unknown[] = [];
  if (Array.isArray(res)) raw = res;
  else if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.items)) raw = obj.items;
    else if (Array.isArray(obj.data)) raw = obj.data;
    else if (Array.isArray(obj.results)) raw = obj.results;
    else if (Array.isArray(obj.users)) raw = obj.users;
  }
  return raw.map((r) => {
    const u = r as Record<string, unknown>;
    return {
      uid: String(u.uid ?? u.id ?? u.userId ?? u.user_id ?? ""),
      firstName: typeof u.firstName === "string" ? u.firstName : (typeof u.first_name === "string" ? u.first_name : undefined),
      lastName:  typeof u.lastName  === "string" ? u.lastName  : (typeof u.last_name  === "string" ? u.last_name  : undefined),
      email:     typeof u.email     === "string" ? u.email     : undefined,
      profilePhotoUrl:
        typeof u.profilePhotoUrl === "string" ? u.profilePhotoUrl
        : typeof u.profile_photo_url === "string" ? u.profile_photo_url
        : typeof u.avatar === "string" ? u.avatar : null,
      roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
    };
  }).filter((u) => u.uid);
}

export default function CellMembersPage() {
  const router = useRouter();
  const params = useParams();
  const cellId = (params?.cellId as string) ?? "";
  const user = useAppSelector((s) => s.session.user);
  const canEdit = (user?.roles?.includes("leader") || user?.roles?.includes("g12") || user?.roles?.includes("super_admin") || user?.roles?.includes("admin")) ?? false;
  const roleFilter = cellMemberSearchRoles(user?.roles);
  const roleFilterKey = (roleFilter ?? []).join(",");

  const { cell, loading, refetch } = useCell(cellId || undefined);
  const { busy, addMembers, removeMember } = useCellMembers(cellId || undefined);

  const [search, setSearch]           = useState("");
  const [results, setResults]         = useState<UserResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [selected, setSelected]       = useState<UserResult[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const members = (cell?.members ?? []).map((m) => ({
    uid: m.uid ?? String(m),
    displayName: m.displayName ?? String(m),
  }));

  // Same typeahead pattern as AddMemberDialog: debounced `?name=` query with
  // case fan-out (lowercase + Title-Case) so users typing "sap" also find
  // "Sapna" stored with capital S.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setResults([]); setSearching(false); return; }
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
        const merged: UserResult[] = [];
        for (const res of responses) {
          for (const u of unwrapUsers(res)) {
            if (!u.uid || seen.has(u.uid)) continue;
            seen.add(u.uid);
            merged.push(u);
          }
        }
        const memberUids = new Set(members.map((m) => m.uid));
        const allowed = roleFilter && roleFilter.length > 0 ? new Set(roleFilter) : null;
        setResults(
          merged.filter((u) => {
            if (memberUids.has(u.uid)) return false;
            const roles = u.roles ?? [];
            if (roles.includes("admin") || roles.includes("super_admin")) return false;
            // Defence-in-depth: drop results that hold ANY role outside the
            // caller's allow-list. Since every user has `member` as a base
            // role, checking "any overlap" lets Leaders/G12 through — we
            // must instead enforce "no extra role beyond what's allowed".
            if (allowed && roles.length > 0 && roles.some((r) => !allowed.has(r))) return false;
            return true;
          }),
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilterKey]);

  // Toggle user into the staged "selected" list. Chips appear below the
  // search bar so the user can pick several before clicking "Add members".
  const toggleSelect = (u: UserResult) => {
    setSelected((prev) =>
      prev.some((s) => s.uid === u.uid)
        ? prev.filter((s) => s.uid !== u.uid)
        : [...prev, u],
    );
  };

  // POST all staged UIDs in one call (same flow as the AddMemberDialog button).
  const handleAddSelected = async () => {
    if (selected.length === 0) return;
    const res = await addMembers(selected.map((u) => u.uid));
    if (res) {
      setSelected([]);
      setSearch("");
      setResults([]);
      refetch();
    }
  };

  const handleRemove = async (uid: string) => {
    const ok = await removeMember(uid);
    if (ok) { setConfirmRemove(null); refetch(); }
  };

  if (loading) return <div className="page" style={{ textAlign: "center", padding: 48 }}><Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} /></div>;
  if (!cell) return <EmptyState icon="alert-circle" title="Cell not found" />;

  return (
    <div className="page">
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push(`/cells/${cell.id}`)}>
        Back to {cell.name}
      </Button>

      <header className="page-header" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 28, color: "var(--color-primary)" }}>
          Members of {cell.name}
        </h1>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
          {cell.memberCount} member{cell.memberCount === 1 ? "" : "s"}
        </p>
      </header>

      {/* ── Add members section (Leader / G12 / Admin only) ─── */}
      {canEdit && (
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 8 }}>Add members</h2>
          <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
            Start typing a first name — suggestions appear as you type. Type at least 2 characters.
          </p>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
            <input
              className="input"
              placeholder="e.g. Sapna"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: "100%" }}
            />
          </div>

          {/* Selected chips — same UX as the AddMemberDialog. */}
          {selected.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {selected.map((u) => {
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;
                return (
                  <span key={u.uid} className="chip active" style={{ paddingRight: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {fullName}
                    <button
                      type="button"
                      onClick={() => toggleSelect(u)}
                      aria-label={`Remove ${fullName}`}
                      style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, color: "inherit", display: "inline-flex" }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {searching && (
            <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>
              Searching…
            </div>
          )}
          {!searching && search.trim().length >= 2 && results.length === 0 && (
            <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>
              No matches for &ldquo;{search.trim()}&rdquo;.
            </div>
          )}

          {/* Search results */}
          {results.length > 0 && (
            <div style={{ marginTop: 12, border: "1px solid var(--color-stroke)", borderRadius: 10, overflow: "hidden" }}>
              {results.map((u) => {
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;
                const isSelected = selected.some((s) => s.uid === u.uid);
                return (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => toggleSelect(u)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: isSelected ? "rgba(188,233,85,0.12)" : "#fff",
                      border: 0,
                      borderBottom: "1px solid var(--color-stroke-2)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Avatar src={u.profilePhotoUrl ?? undefined} name={fullName} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>{fullName}</div>
                      {u.email && <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>{u.email}</div>}
                    </div>
                    {isSelected
                      ? <Icon name="check-circle" size={18} style={{ color: "var(--color-accent-hover)" }} />
                      : <Icon name="plus-circle" size={18} style={{ color: "var(--color-muted)" }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Single bulk-add button — POSTs all selected UIDs in one call. */}
          {selected.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Button icon="user-plus" disabled={busy} onClick={handleAddSelected}>
                {busy ? "Adding…" : `Add ${selected.length} member${selected.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Current members list ──────────────────────────── */}
      <div className="settings-card">
        <h2 style={{ marginBottom: 14 }}>Current members</h2>
        {members.length === 0 ? (
          <EmptyState icon="users" title="No members yet" message="Use the search above to add members to this cell." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {members.map((m) => {
              const isLeader = m.uid === cell.leaderUid;
              return (
                <div key={m.uid} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 14px", background: "#FAFAFA", borderRadius: 10 }}>
                  <Avatar name={m.displayName} size="sm" />
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--color-primary)" }}>
                    {m.displayName}
                    {isLeader && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--color-body-green)", fontWeight: 400 }}>· Leader</span>}
                  </div>
                  {canEdit && !isLeader && (
                    confirmRemove === m.uid ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                        <Button size="sm" disabled={busy} onClick={() => handleRemove(m.uid)}
                          style={{ background: "var(--color-error)", color: "#fff" }}>Remove</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmRemove(m.uid)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4, display: "flex" }}>
                        <Icon name="x" size={14} />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
