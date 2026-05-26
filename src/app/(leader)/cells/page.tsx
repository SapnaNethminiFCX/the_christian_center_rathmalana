"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CellCard } from "@/components/cells/CellCard";
import { CellTabs, type CellTab } from "@/components/cells/CellTabs";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useCells, type CellType, type Cell } from "@/application/hooks/useCells";

const TYPE_FILTERS: { id: "all" | CellType; label: string }[] = [
  { id: "all",      label: "All types" },
  { id: "care",     label: "Care" },
  { id: "outreach", label: "Outreach" },
  { id: "children", label: "Children" },
  { id: "g12",      label: "G12" },
];

type TabId = "mine" | "underMe" | "other";

export default function LeaderCellsPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CellType>("all");
  const [tab, setTab]               = useState<TabId>("mine");

  // GET /cells?state=active&scope=org — the auto-scope for a Leader caller is
  // "cells you lead" which is too narrow for the "Other cells" tab. Asking
  // explicitly for `scope=org` tells the backend to return the full active
  // directory regardless of the caller's role (older backends ignore the
  // param and still return the auto-scoped set, in which case the Other tab
  // shows what it can). Archived cells are excluded via state=active.
  const { cells: activeCells, loading } = useCells({ state: "active", scope: "org" });

  const filtered = useMemo(() => activeCells.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  }), [activeCells, typeFilter, search]);

  const isG12 = user?.roles?.includes("g12") ?? false;

  // ── Three buckets ────────────────────────────────────────────────────
  // 1. Mine    — cells where the current user is the leader (full access).
  // 2. UnderMe — G12 only: cells whose g12LeaderUid is the current user
  //              AND the user is not also the cell's leader. Read-only view
  //              + reports, clickable through to the cell detail page.
  // 3. Other   — everything else; visible but dimmed and non-clickable.
  const myCells: Cell[]      = filtered.filter((c) => c.leaderUid === user?.uid);
  const underMeCells: Cell[] = isG12
    ? filtered.filter((c) => c.g12LeaderUid === user?.uid && c.leaderUid !== user?.uid)
    : [];
  const otherCells: Cell[]   = filtered.filter((c) => {
    if (c.leaderUid === user?.uid) return false;
    if (isG12 && c.g12LeaderUid === user?.uid) return false;
    return true;
  });

  const tabs: CellTab[] = [
    { id: "mine",  label: "Cells I lead", icon: "users",      count: myCells.length },
    ...(isG12
      ? [{ id: "underMe", label: "Leaders under me", icon: "user-check", count: underMeCells.length } satisfies CellTab]
      : []),
    { id: "other", label: "Other cells",  icon: "eye",        count: otherCells.length },
  ];

  // Falls back to "mine" if the active tab disappears (e.g. role change).
  const activeTab: TabId = tabs.some((t) => t.id === tab) ? tab : "mine";

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>Cells</h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            {loading
              ? "Loading…"
              : isG12
                ? (
                  <>
                    <b style={{ color: "var(--color-primary)" }}>{myCells.length}</b> you lead ·{" "}
                    <b style={{ color: "var(--color-primary)" }}>{underMeCells.length}</b> under your supervision ·{" "}
                    <b style={{ color: "var(--color-primary)" }}>{otherCells.length}</b> others.
                  </>
                )
                : (
                  <>
                    <b style={{ color: "var(--color-primary)" }}>{myCells.length}</b> cells you lead ·{" "}
                    <b style={{ color: "var(--color-primary)" }}>{otherCells.length}</b> others available.
                  </>
                )}
          </p>
        </div>
        <Link href="/cells/new" className="btn btn--primary">
          <Icon name="plus" size={16} /> Create Cell
        </Link>
      </header>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input placeholder="Search by cell name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--color-light-gray)", borderRadius: 9999 }}>
          {TYPE_FILTERS.map((f) => (
            <button type="button" key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{ border: 0, background: typeFilter === f.id ? "#fff" : "transparent", color: typeFilter === f.id ? "var(--color-primary)" : "var(--color-body-green)", padding: "6px 12px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, borderRadius: 9999, cursor: "pointer", boxShadow: typeFilter === f.id ? "0 1px 2px 0 rgba(21,42,36,0.08)" : "none" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar — same look as the cell-detail page tabs */}
      <div style={{ marginBottom: 18 }}>
        <CellTabs tabs={tabs} active={activeTab} onChange={(id) => setTab(id as TabId)} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}><Icon name="loader" size={24} /></div>
      ) : activeTab === "mine" ? (
        <TabPanel
          subtitle="Full access — you can edit details, manage members, and file reports."
          tone="accent"
        >
          {myCells.length === 0 ? (
            <EmptyState icon="users" title="No cells yet" message="Create your first cell to get started." />
          ) : (
            <div className="cell-grid">
              {myCells.map((c) => (
                <CellCard key={c.id} cell={c} onClick={() => router.push(`/cells/${c.id}`)} />
              ))}
            </div>
          )}
        </TabPanel>
      ) : activeTab === "underMe" ? (
        <TabPanel
          subtitle="Cells led by leaders you supervise. You can view cell details and reports."
          tone="info"
        >
          {underMeCells.length === 0 ? (
            <EmptyState icon="user-check" title="No leaders under you yet" message="Cells created by your leaders will appear here once they pick you as their G12." />
          ) : (
            <div className="cell-grid">
              {underMeCells.map((c) => (
                <CellCard key={c.id} cell={c} onClick={() => router.push(`/cells/${c.id}`)} />
              ))}
            </div>
          )}
        </TabPanel>
      ) : (
        <TabPanel
          subtitle="Other cells in the organisation. Visible for context — opening them is disabled."
          tone="muted"
        >
          {otherCells.length === 0 ? (
            <EmptyState icon="eye" title="No other cells to show" message="Cells outside your scope will appear here as the directory grows." />
          ) : (
            <div
              className="cell-grid"
              style={{ opacity: 0.65, filter: "saturate(0.7)", pointerEvents: "none", userSelect: "none" }}
              aria-disabled="true"
            >
              {otherCells.map((c) => (
                <CellCard key={c.id} cell={c} readonly />
              ))}
            </div>
          )}
        </TabPanel>
      )}
    </div>
  );
}

/* ── Tab subtitle banner — keeps a single visual style across all 2–3 tabs ── */

interface TabPanelProps {
  subtitle: string;
  tone: "accent" | "info" | "muted";
  children: React.ReactNode;
}

function TabPanel({ subtitle, tone, children }: TabPanelProps) {
  const palette = TONE_STYLES[tone];
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: palette.bg,
          borderLeft: `3px solid ${palette.bar}`,
          borderRadius: 10,
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: palette.text,
        }}
      >
        <Icon name={palette.icon} size={14} />
        {subtitle}
      </div>
      {children}
    </section>
  );
}

const TONE_STYLES: Record<"accent" | "info" | "muted", { bg: string; bar: string; text: string; icon: string }> = {
  accent: {
    bg: "rgba(188,233,85,0.14)",
    bar: "var(--color-accent)",
    text: "var(--color-primary)",
    icon: "edit-3",
  },
  info: {
    bg: "rgba(8,145,178,0.10)",
    bar: "var(--color-info, #0891B2)",
    text: "var(--color-primary)",
    icon: "user-check",
  },
  muted: {
    bg: "var(--color-stroke-2)",
    bar: "var(--color-muted)",
    text: "var(--color-body-green)",
    icon: "lock",
  },
};
