"use client";

/**
 * Admin / Super-Admin cells management.
 *
 * Capabilities (UI only — backend not wired yet):
 *  - List every active cell in the org.
 *  - Search by cell name OR leader name OR g12 leader name.
 *  - Select one cell, a few via checkbox, or all visible rows.
 *  - Transfer ownership of the selected cells to a new Leader or G12.
 *
 * After transfer (simulated locally):
 *  - The cell's `leaderUid` / `g12LeaderUid` flips to the new uid.
 *  - The previous leader is conceptually demoted to a regular Member of
 *    the same cell — admins can remove them later via the cell-members
 *    page. We don't mutate user roles here; the role-mutation endpoint is
 *    still pending. The dialog explains the intended post-transfer state.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useCells, type Cell, type CellType } from "@/application/hooks/useCells";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

const TYPE_LABEL: Record<CellType, string> = {
  g12: "G12",
  care: "Care",
  children: "Children",
  outreach: "Outreach",
};

interface DirectoryUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
}

const PAGE_SIZE = 25;

function fullName(u: DirectoryUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;
}

export default function AdminCellsPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const base = pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const dispatch = useAppDispatch();

  // Pull every active cell. The admin scope already returns the org-wide
  // directory per the V2 spec, so no extra hint is needed.
  const { cells: rawCells, loading, refetch } = useCells({ state: "active" });

  // Local override so the table reflects in-memory transfers without
  // waiting on a backend refetch (the API isn't wired yet anyway).
  const [overrides, setOverrides] = useState<Record<string, Partial<Cell>>>({});
  const cells: Cell[] = useMemo(
    () => rawCells.map((c) => ({ ...c, ...(overrides[c.id] ?? {}) })),
    [rawCells, overrides],
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => { setPage(0); }, [search]);

  // Search filters by cell name AND leader/g12 names — this is the
  // "search by g12/leader" affordance the brief asked for.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cells;
    return cells.filter((c) => {
      const name = c.name.toLowerCase();
      const leader = (c.leaderName ?? "").toLowerCase();
      const g12 = (c.g12LeaderName ?? "").toLowerCase();
      const area = (c.area ?? "").toLowerCase();
      return (
        name.includes(q) || leader.includes(q) || g12.includes(q) || area.includes(q)
      );
    });
  }, [cells, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((c) => selected.has(c.id));
  const someOnPageSelected = pageRows.some((c) => selected.has(c.id));

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const c of pageRows) next.delete(c.id);
      } else {
        for (const c of pageRows) next.add(c.id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((c) => c.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const onTransferConfirmed = (target: DirectoryUser, kind: "leader" | "g12") => {
    // Apply the transfer locally for every selected cell. When the API
    // ships, replace this with PATCH /cells/:id { leaderUid | g12LeaderUid }
    // and refetch.
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of selected) {
        next[id] = {
          ...(next[id] ?? {}),
          ...(kind === "leader"
            ? { leaderUid: target.uid, leaderName: fullName(target) }
            : { g12LeaderUid: target.uid, g12LeaderName: fullName(target) }),
        };
      }
      return next;
    });
    dispatch(
      pushToast({
        tone: "success",
        title: `${selected.size} cell${selected.size === 1 ? "" : "s"} transferred`,
        message: `New ${kind === "g12" ? "G12 Leader" : "Cell Leader"}: ${fullName(target)}. Previous holder is demoted to Member and stays in the cell. (UI only — backend pending.)`,
      }),
    );
    clearSelection();
    setTransferOpen(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Cells</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{loading ? "…" : filtered.length}</b>{" "}
            cell{filtered.length === 1 ? "" : "s"} matching your filter.{" "}
            Select one or more to transfer ownership to another Leader or G12.
          </div>
        </div>
        <Button variant="secondary" icon="refresh-cw" onClick={refetch}>Refresh</Button>
      </div>

      {/* Search */}
      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by cell, leader, G12 or area…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Selection bar — sticky-ish floating panel above the table */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            marginBottom: 14,
            background: "rgba(188,233,85,0.14)",
            border: "1px solid var(--color-accent)",
            borderRadius: 12,
            flexWrap: "wrap",
          }}
        >
          <Icon name="check-circle" size={16} style={{ color: "var(--color-success-deep)" }} />
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
            {selected.size} cell{selected.size === 1 ? "" : "s"} selected
          </span>
          {selected.size < filtered.length && (
            <button
              type="button"
              onClick={selectAllFiltered}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--color-primary)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Select all {filtered.length} filtered
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
            <Button size="sm" icon="share-2" onClick={() => setTransferOpen(true)}>
              Transfer ownership
            </Button>
          </div>
        </div>
      )}

      <div className="tbl-card">
        <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 42 }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ minWidth: 120 }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                  onChange={togglePage}
                  aria-label="Select all on this page"
                />
              </th>
              <th>Cell</th>
              <th>Leader</th>
              <th>G12 Leader</th>
              <th>Type</th>
              <th>Members</th>
              <th style={{ textAlign: "right" }}>Open</th>
            </tr>
          </thead>
          <tbody>
            {loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <h3>No cells found</h3>
                    <p>{search ? "Try a different search term." : "No active cells in the directory yet."}</p>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <tr key={c.id} style={isSelected ? { background: "rgba(188,233,85,0.08)" } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Icon name="map-pin" size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {c.area || "—"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Avatar size="sm" name={c.leaderName ?? c.leaderUid} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.leaderName ?? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-muted)" }}>{c.leaderUid.slice(0, 10)}…</span>}
                      </span>
                    </div>
                  </td>
                  <td>
                    {c.g12LeaderUid ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Avatar size="sm" name={c.g12LeaderName ?? c.g12LeaderUid} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.g12LeaderName ?? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-muted)" }}>{c.g12LeaderUid.slice(0, 10)}…</span>}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-muted)", fontStyle: "italic", fontFamily: "var(--font-body)", fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td>
                    <Badge tone="info">{TYPE_LABEL[c.type]}</Badge>
                  </td>
                  <td>{c.memberCount}</td>
                  <td style={{ textAlign: "right" }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="external-link"
                      onClick={() => router.push(`${base}/cells/${c.id}`)}
                      title="Open cell detail"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-stroke)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--color-body-green)",
            flexWrap: "wrap",
            gap: 10,
          }}>
            <span>
              Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b>
              {totalPages > 1 && <> · Page <b>{safePage + 1}</b> of <b>{totalPages}</b></>}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" icon="chevron-left" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <TransferOwnershipDialog
        open={transferOpen}
        selectedCount={selected.size}
        selectedCells={cells.filter((c) => selected.has(c.id))}
        onCancel={() => setTransferOpen(false)}
        onConfirm={onTransferConfirmed}
      />
    </div>
  );
}

/* ── Transfer-ownership dialog ──────────────────────────────────────── */

interface TransferDialogProps {
  open: boolean;
  selectedCount: number;
  selectedCells: Cell[];
  onCancel: () => void;
  onConfirm: (target: DirectoryUser, kind: "leader" | "g12") => void;
}

function TransferOwnershipDialog({
  open,
  selectedCount,
  selectedCells,
  onCancel,
  onConfirm,
}: TransferDialogProps) {
  const [kind, setKind] = useState<"leader" | "g12">("leader");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<DirectoryUser | null>(null);

  // Reset when the dialog opens/closes.
  useEffect(() => {
    if (!open) {
      setKind("leader");
      setQ("");
      setResults([]);
      setPicked(null);
    }
  }, [open]);

  // Debounced typeahead — `?roles=leader` or `?roles=g12` filters the
  // directory; case fan-out matches the rest of the codebase.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2 || picked) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
        const variants = Array.from(new Set([term, titleCase]));
        const responses = await Promise.all(
          variants.map((v) =>
            apiRequest<unknown>(
              `/users?${new URLSearchParams({ roles: kind, search: v, limit: "20" })}`,
            ).catch(() => null),
          ),
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
          for (const it of bucket) {
            const u = it as Record<string, unknown>;
            const uid = String(u.uid ?? u.id ?? "");
            if (!uid || seen.has(uid)) continue;
            const roles = Array.isArray(u.roles) ? (u.roles as string[]) : [];
            // Defence-in-depth: only show users who actually hold the role
            // we asked for, in case the backend ignored the param.
            if (!roles.includes(kind)) continue;
            seen.add(uid);
            merged.push({
              uid,
              firstName: typeof u.firstName === "string" ? u.firstName : undefined,
              lastName:  typeof u.lastName  === "string" ? u.lastName  : undefined,
              email:     typeof u.email     === "string" ? u.email     : undefined,
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
  }, [q, kind, open, picked]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onCancel}>
      <div style={{ textAlign: "left", maxWidth: 560, width: "100%" }}>
        <h2 style={{ margin: 0, marginBottom: 6 }}>Transfer ownership</h2>
        <p style={{ margin: "0 0 16px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
          Moving <b>{selectedCount}</b> cell{selectedCount === 1 ? "" : "s"} to a new owner.
          The previous holder is demoted (loses Leader / G12 role) but stays in the cell as a regular member —
          you can remove them later from the cell-members page. Role mutation backend is pending; this is UI only.
        </p>

        {/* Selected cell preview */}
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-stroke)",
            borderRadius: 10,
            padding: 10,
            marginBottom: 14,
            maxHeight: 110,
            overflowY: "auto",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "var(--color-body-green)",
          }}
        >
          {selectedCells.slice(0, 8).map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>{c.name}</span>
              <span>{c.leaderName ?? c.leaderUid.slice(0, 10) + "…"}</span>
            </div>
          ))}
          {selectedCells.length > 8 && (
            <div style={{ paddingTop: 4, color: "var(--color-muted)" }}>
              + {selectedCells.length - 8} more…
            </div>
          )}
        </div>

        {/* Role kind toggle */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="label">Transfer to</label>
          <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--color-light-gray)", borderRadius: 9999 }}>
            {(["leader", "g12"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); setPicked(null); setResults([]); setQ(""); }}
                style={{
                  border: 0,
                  background: kind === k ? "var(--color-surface)" : "transparent",
                  color: kind === k ? "var(--color-primary)" : "var(--color-body-green)",
                  padding: "6px 14px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 9999,
                  cursor: "pointer",
                  boxShadow: kind === k ? "0 1px 2px 0 rgba(21,42,36,0.08)" : "none",
                }}
              >
                {k === "leader" ? "Cell Leader" : "G12 Leader"}
              </button>
            ))}
          </div>
        </div>

        {/* Search / pick */}
        {picked ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              border: "1px solid var(--color-accent)",
              borderRadius: 10,
              background: "rgba(188,233,85,0.10)",
              marginBottom: 16,
            }}
          >
            <Avatar src={picked.profilePhotoUrl ?? undefined} name={fullName(picked)} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
                {fullName(picked)}
              </div>
              {picked.email && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                  {picked.email}
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" icon="x" onClick={() => { setPicked(null); setQ(""); }}>
              Change
            </Button>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
              <input
                className="input"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${kind === "g12" ? "G12 Leaders" : "Cell Leaders"} by name…`}
                style={{ paddingLeft: 36, width: "100%" }}
              />
            </div>
            <div
              style={{
                border: "1px solid var(--color-stroke)",
                borderRadius: 10,
                maxHeight: 240,
                overflowY: "auto",
                marginBottom: 16,
              }}
            >
              {searching && (
                <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                  Searching…
                </div>
              )}
              {!searching && q.trim().length < 2 && (
                <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                  Type at least 2 characters to search.
                </div>
              )}
              {!searching && q.trim().length >= 2 && results.length === 0 && (
                <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                  No matches.
                </div>
              )}
              {results.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => setPicked(u)}
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
          </>
        )}

        <div className="form-actions" style={{ justifyContent: "flex-end", borderTop: "none", marginTop: 4 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            icon="share-2"
            disabled={!picked}
            onClick={() => { if (picked) onConfirm(picked, kind); }}
          >
            Transfer {selectedCount} cell{selectedCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
