"use client";

/**
 * Admin / Super-Admin cell detail page.
 *
 * UI ONLY — the transfer-ownership action is NOT integrated with the
 * backend per the design brief. State mutations are applied in-memory via
 * a local `overrides` map so the page reflects them immediately, but
 * nothing hits the role-mutation / cell-mutation endpoints.
 *
 * Capabilities:
 *  - Show the cell's hero info (name, type, area, member count)
 *  - Two "Ownership" cards: Cell Leader + G12 Supervisor
 *  - Each card shows the current owner + a count of OTHER cells they own
 *  - Transfer-ownership flow:
 *      1. Pre-select THIS cell. Optionally check other cells under the same
 *         owner to transfer many at once.
 *      2. Toggle the role kind (Cell Leader / G12 Supervisor).
 *      3. Search candidates by first-name prefix (`/users?role=…&name=…`).
 *         Filter is enforced client-side as defence-in-depth.
 *      4. Confirm — the dialog explains the demotion semantics: the
 *         previous owner stays in the cell as a Member but loses
 *         Leader / G12 privileges org-wide (cannot create or edit cells).
 *
 * Routes:
 *  - /admin/cells/[cellId]/page.tsx       (this file)
 *  - /super-admin/cells/[cellId]/page.tsx (re-exports default from here)
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useCells, useCellMutations, type Cell, type CellType } from "@/application/hooks/useCells";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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

function fullName(u: { firstName?: string; lastName?: string; email?: string; uid?: string }): string {
  const composed = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return composed || u.email || u.uid || "Unknown";
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function AdminCellDetailPage() {
  const router = useRouter();
  const params = useParams<{ cellId: string }>();
  const pathname = usePathname() ?? "";
  const base = pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const dispatch = useAppDispatch();

  const { cells: rawCells, loading } = useCells({ state: "active" });

  // In-memory transfer log — every ownership change is applied here so the UI
  // reflects it without a backend round-trip.
  const [overrides, setOverrides] = useState<Record<string, Partial<Cell>>>({});
  const cells: Cell[] = useMemo(
    () => rawCells.map((c) => ({ ...c, ...(overrides[c.id] ?? {}) })),
    [rawCells, overrides],
  );

  const cell = cells.find((c) => c.id === params.cellId) ?? null;

  // Other cells under the same Leader / same G12 — used by the transfer
  // flow to let the admin bulk-move all of someone's cells at once.
  const otherLeaderCells = useMemo(
    () => (cell ? cells.filter((c) => c.id !== cell.id && c.leaderUid === cell.leaderUid) : []),
    [cells, cell],
  );
  const otherG12Cells = useMemo(
    () =>
      cell && cell.g12LeaderUid
        ? cells.filter((c) => c.id !== cell.id && c.g12LeaderUid === cell.g12LeaderUid)
        : [],
    [cells, cell],
  );

  const [transferDialog, setTransferDialog] = useState<{ open: boolean; kind: "leader" | "g12" }>({
    open: false,
    kind: "leader",
  });

  // DELETE /cells/:id — admin/super_admin always permitted per V2 spec §13.7.
  const { deleteCell: deleteCellApi } = useCellMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCell = async () => {
    if (!cell) return;
    setDeleting(true);
    const ok = await deleteCellApi(cell.id);
    setDeleting(false);
    if (ok) {
      setDeleteOpen(false);
      router.push(`${base}/cells`);
    }
  };

  if (loading && !cell) {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>
          <Icon name="loader" size={22} style={{ opacity: 0.5 }} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading cell…</p>
        </div>
      </div>
    );
  }

  if (!cell) {
    return (
      <div className="page">
        <div className="empty">
          <div className="ring"><Icon name="search-x" size={24} /></div>
          <h3>Cell not found</h3>
          <p>This cell may have been deleted or you don&apos;t have access.</p>
          <div style={{ marginTop: 18 }}>
            <Button variant="ghost" icon="arrow-left" onClick={() => router.push(`${base}/cells`)}>
              Back to cells
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleTransfer = async (
    selectedCellIds: string[],
    target: DirectoryUser,
    kind: "leader" | "g12",
  ) => {
    // Identify the outgoing owner — the demote endpoint targets the user
    // who currently holds the role on THIS cell (per the dialog, all selected
    // cells share the same owner). Snapshot it BEFORE we apply local
    // overrides since we'll mutate them next.
    const outgoingUid = kind === "leader" ? cell?.leaderUid : cell?.g12LeaderUid;
    const outgoingName = kind === "leader" ? cell?.leaderName : cell?.g12LeaderName;

    // Apply local cell-ownership change first — keeps the UI snappy even if
    // the demote call below is slow / fails. The cell-PATCH endpoint isn't
    // wired here yet; only the demote API is integrated this round.
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of selectedCellIds) {
        next[id] = {
          ...(next[id] ?? {}),
          ...(kind === "leader"
            ? { leaderUid: target.uid, leaderName: fullName(target) }
            : { g12LeaderUid: target.uid, g12LeaderName: fullName(target) }),
        };
      }
      return next;
    });
    setTransferDialog({ open: false, kind: "leader" });

    // Strip the role from the outgoing owner via POST /users/:uid/demote
    // (spec §4.10). admin / super_admin can demote student / leader / g12;
    // 204 No Content on success; idempotent if the user no longer holds
    // the role. Custom claims update immediately on the backend; the
    // demoted user picks up the new claims at their next token refresh.
    if (!outgoingUid) {
      dispatch(pushToast({
        tone: "success",
        title: "Ownership transferred",
        message: `${selectedCellIds.length} cell${selectedCellIds.length === 1 ? "" : "s"} now under ${fullName(target)}. No previous owner to demote.`,
      }));
      return;
    }

    try {
      await apiRequest(`/users/${outgoingUid}/demote`, {
        method: "POST",
        body: { role: kind },
      });
      dispatch(pushToast({
        tone: "success",
        title: "Ownership transferred & previous owner demoted",
        message: `${selectedCellIds.length} cell${selectedCellIds.length === 1 ? "" : "s"} now under ${fullName(target)}. ${outgoingName ?? "Previous owner"} demoted to Member — they'll see the change at next sign-in.`,
      }));
    } catch (err) {
      // Transfer UI is already applied — surface the demote failure
      // separately so the operator knows the role wasn't stripped.
      let title = "Owner demote failed";
      let message =
        "Ownership of the cell was updated in the UI, but the previous owner's role could not be removed.";
      if (err instanceof ApiRequestError) {
        if (err.status === 403) {
          title = "Demote not permitted";
          message = err.message || `Your role can't remove the '${kind}' role.`;
        } else if (err.status === 404) {
          title = "User not found";
          message = "The previous owner could not be located.";
        } else if (err.status === 400) {
          title = "Demote validation failed";
          message = err.message;
        } else if (err.message) {
          message = err.message;
        }
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    }
  };

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="crumbs" style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => router.push(`${base}/cells`)}
          style={{
            background: "none", border: 0, padding: 0, cursor: "pointer",
            color: "var(--color-body-green)", fontFamily: "var(--font-body)",
            fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Icon name="arrow-left" size={13} />
          Cells
        </button>
        <span style={{ margin: "0 6px", color: "var(--color-muted)" }}>/</span>
        <span style={{ color: "var(--color-primary)" }}>{cell.name}</span>
      </div>

      {/* Hero header */}
      <div
        style={{
          background: "linear-gradient(135deg, #152A24 0%, #1F3626 100%)",
          borderRadius: 20,
          padding: "28px 30px",
          color: "#fff",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", right: -80, top: -80,
            width: 240, height: 240, borderRadius: 9999,
            background: "radial-gradient(circle, rgba(188,233,85,0.16), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span className={`cell-type ${cell.type}`}>{TYPE_LABEL[cell.type]}</span>
            {cell.area && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.7)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="map-pin" size={12} />
                {cell.area}
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 30, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
            {cell.name}
          </h1>
          <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap", fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="users" size={13} />
              {cell.memberCount} member{cell.memberCount === 1 ? "" : "s"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <Icon name="hash" size={11} />
              {cell.id.slice(0, 16)}…
            </span>
          </div>
          </div>
          <Button
            variant="ghost"
            icon="trash-2"
            onClick={() => setDeleteOpen(true)}
            style={{ color: "#fff", background: "rgba(220,38,38,0.18)", borderColor: "rgba(220,38,38,0.4)" }}
          >
            Delete cell
          </Button>
        </div>
      </div>

      {/* Ownership cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 18 }}>
        <OwnershipCard
          title="Cell Leader"
          subtitle="Owns the roster and submits weekly cell reports."
          name={cell.leaderName}
          uid={cell.leaderUid}
          otherCellsCount={otherLeaderCells.length}
          onTransfer={() => setTransferDialog({ open: true, kind: "leader" })}
          icon="user"
          accent="var(--color-accent)"
        />
        <OwnershipCard
          title="G12 Supervisor"
          subtitle="Oversees the Cell Leader and approves submitted reports."
          name={cell.g12LeaderName}
          uid={cell.g12LeaderUid ?? ""}
          otherCellsCount={otherG12Cells.length}
          onTransfer={() => setTransferDialog({ open: true, kind: "g12" })}
          icon="shield"
          accent="#7C3AED"
        />
      </div>

      {/* Demotion semantics callout */}
      <div
        className="pending-callout"
        style={{
          background: "rgba(8,145,178,0.10)",
          borderColor: "rgba(8,145,178,0.28)",
        }}
      >
        <div className="ico" style={{ color: "var(--color-info)" }}>
          <Icon name="info" size={18} />
        </div>
        <div className="b-body">
          <b>How ownership transfer works.</b> Reassigning a Cell Leader or G12 will{" "}
          <b>demote the previous owner to a regular Member</b> of the same cell — they
          keep their seat in the group but lose Leader / G12 privileges org-wide and
          can no longer create or edit cells. The role-mutation backend isn&apos;t wired
          yet; this dialog is UI only.
        </div>
      </div>

      <TransferOwnershipDialog
        open={transferDialog.open}
        initialKind={transferDialog.kind}
        currentCell={cell}
        otherLeaderCells={otherLeaderCells}
        otherG12Cells={otherG12Cells}
        onCancel={() => setTransferDialog({ open: false, kind: "leader" })}
        onConfirm={handleTransfer}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${cell.name}?`}
        message="This permanently removes the cell, its members, and all its reports. This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
        destructive
        onConfirm={handleDeleteCell}
        onCancel={() => (deleting ? null : setDeleteOpen(false))}
      />
    </div>
  );
}

/* ── Ownership Card ──────────────────────────────────────────────────── */

function OwnershipCard({
  title,
  subtitle,
  name,
  uid,
  otherCellsCount,
  onTransfer,
  icon,
  accent,
}: {
  title: string;
  subtitle: string;
  name?: string;
  uid: string;
  otherCellsCount: number;
  onTransfer: () => void;
  icon: string;
  accent: string;
}) {
  const hasOwner = !!uid;
  const display = name ?? (hasOwner ? uid.slice(0, 10) + "…" : "Not assigned");

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-stroke)",
        borderRadius: 18,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent strip */}
      <div
        aria-hidden
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 4, background: accent,
        }}
      />

      <div>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 9999,
            background: "var(--color-light-gray)", color: "var(--color-primary)",
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}
        >
          <Icon name={icon} size={11} />
          {title}
        </div>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-body-green)", lineHeight: 1.4 }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
        <Avatar size="lg" name={display} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18,
              color: hasOwner ? "var(--color-primary)" : "var(--color-muted)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {display}
          </div>
          {hasOwner && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
              {uid.slice(0, 16)}…
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, paddingTop: 14, borderTop: "1px solid var(--color-stroke-2)",
        }}
      >
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
          {hasOwner ? (
            otherCellsCount > 0 ? (
              <>
                <b style={{ color: "var(--color-primary)" }}>+{otherCellsCount}</b> other
                cell{otherCellsCount === 1 ? "" : "s"} under this person
              </>
            ) : (
              <span style={{ color: "var(--color-muted)" }}>Only owns this cell</span>
            )
          ) : (
            <span style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No owner assigned</span>
          )}
        </div>
        {hasOwner && (
          <Button size="sm" icon="share-2" onClick={onTransfer}>
            Transfer
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Transfer Dialog ─────────────────────────────────────────────────── */

interface TransferDialogProps {
  open: boolean;
  initialKind: "leader" | "g12";
  currentCell: Cell;
  otherLeaderCells: Cell[];
  otherG12Cells: Cell[];
  onCancel: () => void;
  onConfirm: (selectedCellIds: string[], target: DirectoryUser, kind: "leader" | "g12") => void;
}

function TransferOwnershipDialog({
  open,
  initialKind,
  currentCell,
  otherLeaderCells,
  otherG12Cells,
  onCancel,
  onConfirm,
}: TransferDialogProps) {
  const [kind, setKind] = useState<"leader" | "g12">(initialKind);
  const [selectedCellIds, setSelectedCellIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<DirectoryUser | null>(null);

  // Reset state when the dialog (re-)opens.
  useEffect(() => {
    if (open) {
      setKind(initialKind);
      setSelectedCellIds(new Set([currentCell.id]));
      setQ("");
      setResults([]);
      setPicked(null);
    }
  }, [open, initialKind, currentCell.id]);

  const otherCells = kind === "leader" ? otherLeaderCells : otherG12Cells;
  const currentOwnerName = kind === "leader" ? currentCell.leaderName : currentCell.g12LeaderName;

  // User search — uses the spec'd query shape `?role=…&name=…` (singular).
  // Case fan-out covers lowercase-typed queries since `name` is a
  // case-sensitive prefix match.
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
              `/users?${new URLSearchParams({ role: kind, name: v, limit: "20" })}`,
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

  const toggleCell = (id: string) => {
    setSelectedCellIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllOther = () => {
    setSelectedCellIds(new Set([currentCell.id, ...otherCells.map((c) => c.id)]));
  };

  return (
    <Modal open={open} onClose={onCancel}>
      <div style={{ textAlign: "left", maxWidth: 640, width: "100%" }}>
        <h2 style={{ margin: 0, marginBottom: 4, fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--color-primary)" }}>
          Transfer ownership
        </h2>
        <p style={{ margin: "0 0 18px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
          Pick which cells move to a new owner, then search for the replacement.
        </p>

        {/* Role kind toggle */}
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>Role to transfer</div>
          <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--color-light-gray)", borderRadius: 9999 }}>
            {(["leader", "g12"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setPicked(null);
                  setResults([]);
                  setQ("");
                  setSelectedCellIds(new Set([currentCell.id]));
                }}
                style={{
                  border: 0,
                  background: kind === k ? "#fff" : "transparent",
                  color: kind === k ? "var(--color-primary)" : "var(--color-body-green)",
                  padding: "7px 16px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 9999,
                  cursor: "pointer",
                  boxShadow: kind === k ? "0 1px 2px 0 rgba(21,42,36,0.10)" : "none",
                }}
              >
                {k === "leader" ? "Cell Leader" : "G12 Supervisor"}
              </button>
            ))}
          </div>
        </div>

        {/* Cells to transfer */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div className="label">
              Cells to transfer · <span style={{ color: "var(--color-accent)" }}>{selectedCellIds.size}</span> selected
            </div>
            {otherCells.length > 0 && (
              <button
                type="button"
                onClick={selectAllOther}
                style={{
                  background: "transparent", border: 0, padding: 0, cursor: "pointer",
                  color: "var(--color-primary)", fontFamily: "var(--font-body)",
                  fontSize: 12, textDecoration: "underline",
                }}
              >
                Select all {otherCells.length + 1}
              </button>
            )}
          </div>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
            {currentOwnerName && otherCells.length > 0 ? (
              <>Other cells under <b>{currentOwnerName}</b> appear below — transfer one, some, or all in one go.</>
            ) : currentOwnerName ? (
              <>Only this cell is owned by <b>{currentOwnerName}</b>.</>
            ) : (
              "This cell only."
            )}
          </p>
          <div
            style={{
              border: "1px solid var(--color-stroke)",
              borderRadius: 12,
              overflow: "hidden",
              maxHeight: 200,
              overflowY: "auto",
              background: "var(--color-surface)",
            }}
          >
            <CellPickRow
              cell={currentCell}
              checked={selectedCellIds.has(currentCell.id)}
              isCurrent
              onToggle={() => toggleCell(currentCell.id)}
            />
            {otherCells.map((c) => (
              <CellPickRow
                key={c.id}
                cell={c}
                checked={selectedCellIds.has(c.id)}
                onToggle={() => toggleCell(c.id)}
              />
            ))}
          </div>
        </div>

        {/* New owner picker */}
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>New owner</div>
          {picked ? (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", border: "1px solid var(--color-accent)",
                borderRadius: 12, background: "rgba(188,233,85,0.10)",
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
                <Icon
                  name="search"
                  size={15}
                  style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)", color: "var(--color-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="input"
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${kind === "g12" ? "G12 supervisors" : "leaders"} by first name…`}
                  style={{ paddingLeft: 36, width: "100%" }}
                />
              </div>
              <div
                style={{
                  border: "1px solid var(--color-stroke)",
                  borderRadius: 12, maxHeight: 210, overflowY: "auto",
                  background: "var(--color-surface)",
                }}
              >
                {searching && <DialogInfo>Searching…</DialogInfo>}
                {!searching && q.trim().length < 2 && (
                  <DialogInfo>Type at least 2 characters to search.</DialogInfo>
                )}
                {!searching && q.trim().length >= 2 && results.length === 0 && (
                  <DialogInfo>No matches.</DialogInfo>
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
                      padding: "10px 14px",
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
        </div>

        {/* Demotion warning — shown once a candidate is picked */}
        {picked && currentOwnerName && (
          <div className="pending-callout" style={{ marginBottom: 16 }}>
            <div className="ico"><Icon name="alert-triangle" size={18} /></div>
            <div className="b-body">
              <b>{currentOwnerName}</b> will be demoted to <b>Member</b> in the selected
              cell{selectedCellIds.size === 1 ? "" : "s"}. They lose{" "}
              {kind === "leader" ? "Cell Leader" : "G12"} privileges and can no longer
              create or edit cells.
            </div>
          </div>
        )}

        <div className="form-actions" style={{ borderTop: "none", marginTop: 4 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            icon="share-2"
            disabled={!picked || selectedCellIds.size === 0}
            onClick={() => { if (picked) onConfirm([...selectedCellIds], picked, kind); }}
          >
            Transfer {selectedCellIds.size} cell{selectedCellIds.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function CellPickRow({
  cell,
  checked,
  isCurrent,
  onToggle,
}: {
  cell: Cell;
  checked: boolean;
  isCurrent?: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 14px",
        cursor: "pointer",
        borderBottom: "1px solid var(--color-stroke-2)",
        background: checked ? "rgba(188,233,85,0.10)" : "transparent",
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13,
            color: "var(--color-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {cell.name}
          {isCurrent && (
            <span
              style={{
                marginLeft: 8, fontSize: 10, padding: "2px 8px",
                borderRadius: 9999, background: "var(--color-accent)",
                color: "var(--color-primary)", fontWeight: 700, letterSpacing: "0.04em",
              }}
            >
              CURRENT
            </span>
          )}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)" }}>
          {(cell.area || TYPE_LABEL[cell.type])} · {cell.memberCount} member{cell.memberCount === 1 ? "" : "s"}
        </div>
      </div>
      <Badge tone="info">{TYPE_LABEL[cell.type]}</Badge>
    </label>
  );
}

function DialogInfo({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
      {children}
    </div>
  );
}
