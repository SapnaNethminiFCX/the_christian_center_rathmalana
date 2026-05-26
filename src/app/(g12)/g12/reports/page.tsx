"use client";

/**
 * G12 → Reports page (UI ONLY).
 *
 * Cross-network reporting console for a G12 leader. The page lets a G12:
 *   - Pick a month and slice the data by G12 leader, cell leader, cell type
 *     and individual cell.
 *   - See aggregated KPIs (cells held, reports filed, attendance, etc.).
 *   - Drill into per-leader and per-G12 leaderboards (sortable).
 *   - Spot cells that haven't filed any report this month.
 *   - Review the raw per-day report table.
 *
 * Mock data is deterministic per month — switching months re-generates
 * everything client-side. No API calls. Wire to real endpoints later:
 *   - /analytics/reports?month=YYYY-MM&g12LeaderUid=&leaderUid=&type=
 *   - /cells/:id/reports
 */

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { MemberGrowthLine } from "@/components/analytics/MemberGrowthLine";

/* ─────────────────────────────────────────────────────────────────────────
   Mock world
   ───────────────────────────────────────────────────────────────────────── */

type CellType = "care" | "outreach" | "children" | "g12";

const TYPE_COLORS: Record<string, string> = {
  care: "#1D4ED8",
  outreach: "#15803D",
  children: "#D97706",
  g12: "#7C3AED",
};

const TYPE_LABEL: Record<CellType, string> = {
  care: "Care",
  outreach: "Outreach",
  children: "Children",
  g12: "G12",
};

interface G12Mock { uid: string; name: string }
interface LeaderMock { uid: string; name: string; g12Uid: string }
interface CellMock {
  id: string;
  name: string;
  type: CellType;
  area: string;
  leaderUid: string;
  g12Uid: string;
  members: number;
}

const G12_LEADERS: G12Mock[] = [
  { uid: "g12-ushani",   name: "Ushani Amanda" },
  { uid: "g12-sithuru",  name: "Sithuru Kavinda" },
  { uid: "g12-kamala",   name: "Kamala Perera" },
];

const LEADERS: LeaderMock[] = [
  { uid: "lead-sapna",   name: "Sapna Nethmini", g12Uid: "g12-ushani" },
  { uid: "lead-nadun",   name: "Nadun Madawala", g12Uid: "g12-ushani" },
  { uid: "lead-ranil",   name: "Ranil W.",       g12Uid: "g12-sithuru" },
  { uid: "lead-saman",   name: "Saman Silva",    g12Uid: "g12-sithuru" },
  { uid: "lead-nimal",   name: "Nimal Fernando", g12Uid: "g12-kamala" },
  { uid: "lead-member6", name: "Member6 Test",   g12Uid: "g12-kamala" },
];

const AREAS = ["Rathmalana", "Dehiwala", "Colombo 06", "Mt Lavinia", "Nugegoda"];

const CELLS: CellMock[] = [
  { id: "c-1", name: "Rathmalana West G12", type: "g12",      area: "Rathmalana",  leaderUid: "lead-sapna",   g12Uid: "g12-ushani",  members: 9 },
  { id: "c-2", name: "Bethel Care · 06",    type: "care",     area: "Colombo 06",  leaderUid: "lead-sapna",   g12Uid: "g12-ushani",  members: 7 },
  { id: "c-3", name: "Children of Hope",    type: "children", area: "Mt Lavinia",  leaderUid: "lead-nadun",   g12Uid: "g12-ushani",  members: 12 },
  { id: "c-4", name: "Outreach · Dehiwala", type: "outreach", area: "Dehiwala",    leaderUid: "lead-ranil",   g12Uid: "g12-sithuru", members: 8 },
  { id: "c-5", name: "Sapphire Cell",       type: "care",     area: "Nugegoda",    leaderUid: "lead-saman",   g12Uid: "g12-sithuru", members: 6 },
  { id: "c-6", name: "Nugegoda Outreach",   type: "outreach", area: "Nugegoda",    leaderUid: "lead-saman",   g12Uid: "g12-sithuru", members: 10 },
  { id: "c-7", name: "Mt Lavinia Children", type: "children", area: "Mt Lavinia",  leaderUid: "lead-nimal",   g12Uid: "g12-kamala",  members: 11 },
  { id: "c-8", name: "Colombo Care · A",    type: "care",     area: "Colombo 06",  leaderUid: "lead-nimal",   g12Uid: "g12-kamala",  members: 5 },
  { id: "c-9", name: "Member6 G12",         type: "g12",      area: "Rathmalana",  leaderUid: "lead-member6", g12Uid: "g12-kamala",  members: 8 },
];

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

function recentMonths(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    out.push({ value, label });
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromMonth(month: string): number {
  let h = 0;
  for (const c of month) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

interface ReportRow {
  id: string;
  cellId: string;
  cellName: string;
  cellType: CellType;
  area: string;
  leaderUid: string;
  leaderName: string;
  g12Uid: string;
  g12Name: string;
  date: string;       // YYYY-MM-DD
  attendance: number;
  members: number;
  satisfaction: number;
  visitors: number;
}

/** Build the full month's report rows (unfiltered). Deterministic per month. */
function buildAllReports(month: string): ReportRow[] {
  const [yyyy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  const rand = mulberry32(seedFromMonth(month));
  const rows: ReportRow[] = [];
  let id = 1;
  for (const cell of CELLS) {
    // 0–4 reports per cell per month so some cells will have zero.
    const n = Math.floor(rand() * 5);
    const leader = LEADERS.find((l) => l.uid === cell.leaderUid)!;
    const g12 = G12_LEADERS.find((g) => g.uid === cell.g12Uid)!;
    for (let i = 0; i < n; i++) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      const presentRatio = 0.45 + rand() * 0.5;
      rows.push({
        id: `r-${month}-${id++}`,
        cellId: cell.id,
        cellName: cell.name,
        cellType: cell.type,
        area: cell.area,
        leaderUid: leader.uid,
        leaderName: leader.name,
        g12Uid: g12.uid,
        g12Name: g12.name,
        date: `${yyyy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        attendance: Math.max(1, Math.round(cell.members * presentRatio)),
        members: cell.members,
        satisfaction: 3 + Math.floor(rand() * 3),
        visitors: Math.floor(rand() * 4),
      });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function formatDay(iso: string): string {
  return iso.split("-")[2];
}

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={11}
          style={{
            color: i <= value ? "var(--color-accent-hover)" : "var(--color-stroke)",
            fill: i <= value ? "var(--color-accent-hover)" : "none",
          }}
        />
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────── */

type LeaderSort = "reports" | "attendance" | "satisfaction";

interface LeaderAgg {
  leaderUid: string;
  leaderName: string;
  g12Name: string;
  cellsLed: number;
  cellsReported: number;
  reports: number;
  attendance: number;
  visitors: number;
  satisfaction: number; // avg, 0..5
}

function LeaderTable({ rows, sort, setSort }: { rows: LeaderAgg[]; sort: LeaderSort; setSort: (s: LeaderSort) => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", background: "var(--color-stroke-2)", color: "var(--color-body-green)" }}>
            <th style={{ padding: "10px 14px", fontWeight: 600 }}>Cell Leader</th>
            <th style={{ padding: "10px 14px", fontWeight: 600 }}>G12 supervisor</th>
            <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Cells</th>
            <SortableTh label="Reports" k="reports" cur={sort} on={setSort} />
            <SortableTh label="Attendance" k="attendance" cur={sort} on={setSort} />
            <SortableTh label="Satisfaction" k="satisfaction" cur={sort} on={setSort} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--color-muted)" }}>No matching leaders.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.leaderUid} style={{ borderTop: "1px solid var(--color-stroke)" }}>
              <td style={{ padding: "10px 14px", color: "var(--color-primary)", fontWeight: 500 }}>{r.leaderName}</td>
              <td style={{ padding: "10px 14px", color: "var(--color-body-green)" }}>{r.g12Name}</td>
              <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-body-green)", fontFamily: "var(--font-mono)" }}>
                {r.cellsReported}/{r.cellsLed}
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                {r.reports}
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                {r.attendance}
              </td>
              <td style={{ padding: "10px 14px" }}>
                {r.reports > 0 ? <StarRating value={Math.round(r.satisfaction)} /> : <span style={{ color: "var(--color-muted)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableTh({ label, k, cur, on }: { label: string; k: LeaderSort; cur: LeaderSort; on: (k: LeaderSort) => void }) {
  return (
    <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>
      <button
        type="button"
        onClick={() => on(k)}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: 600,
          color: cur === k ? "var(--color-primary)" : "var(--color-body-green)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        {cur === k && <Icon name="chevron-down" size={11} />}
      </button>
    </th>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function G12ReportsPage() {
  const months = useMemo(recentMonths, []);
  const [month, setMonth] = useState(months[0].value);
  const [g12Filter, setG12Filter] = useState<string>("all");
  const [leaderFilter, setLeaderFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<CellType | "all">("all");
  const [cellFilter, setCellFilter] = useState<string>("all");
  const [leaderSort, setLeaderSort] = useState<LeaderSort>("reports");
  const [showFilters, setShowFilters] = useState(false);

  const allRows = useMemo(() => buildAllReports(month), [month]);

  // ── Apply filters ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => allRows.filter((r) => {
    if (g12Filter !== "all" && r.g12Uid !== g12Filter) return false;
    if (leaderFilter !== "all" && r.leaderUid !== leaderFilter) return false;
    if (typeFilter !== "all" && r.cellType !== typeFilter) return false;
    if (cellFilter !== "all" && r.cellId !== cellFilter) return false;
    return true;
  }), [allRows, g12Filter, leaderFilter, typeFilter, cellFilter]);

  // Filter the cell set to mirror the visible reports (so "cells held" is correct).
  const visibleCells = useMemo(() => CELLS.filter((c) => {
    if (g12Filter !== "all" && c.g12Uid !== g12Filter) return false;
    if (leaderFilter !== "all" && c.leaderUid !== leaderFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (cellFilter !== "all" && c.id !== cellFilter) return false;
    return true;
  }), [g12Filter, leaderFilter, typeFilter, cellFilter]);

  // Leaders selectable in the leader-filter — narrowed by G12 selection.
  const selectableLeaders = useMemo(
    () => g12Filter === "all" ? LEADERS : LEADERS.filter((l) => l.g12Uid === g12Filter),
    [g12Filter],
  );

  // Cells selectable in the cell-filter — narrowed by leader / G12 / type.
  const selectableCells = useMemo(() => CELLS.filter((c) => {
    if (g12Filter !== "all" && c.g12Uid !== g12Filter) return false;
    if (leaderFilter !== "all" && c.leaderUid !== leaderFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    return true;
  }), [g12Filter, leaderFilter, typeFilter]);

  // ── Aggregates ────────────────────────────────────────────────────────
  const cellsHeld = useMemo(
    () => new Set(filteredRows.map((r) => r.cellId)).size,
    [filteredRows],
  );
  const reportsFiled = filteredRows.length;
  const activeLeaders = useMemo(
    () => new Set(filteredRows.map((r) => r.leaderUid)).size,
    [filteredRows],
  );
  const activeG12s = useMemo(
    () => new Set(filteredRows.map((r) => r.g12Uid)).size,
    [filteredRows],
  );
  const attendanceTotal = filteredRows.reduce((s, r) => s + r.attendance, 0);
  const membersTotal = filteredRows.reduce((s, r) => s + r.members, 0);
  const attendanceRate = membersTotal > 0
    ? Math.round((attendanceTotal / membersTotal) * 100)
    : 0;
  const visitorsTotal = filteredRows.reduce((s, r) => s + r.visitors, 0);
  const avgSatisfaction = filteredRows.length > 0
    ? Math.round((filteredRows.reduce((s, r) => s + r.satisfaction, 0) / filteredRows.length) * 10) / 10
    : 0;
  const inactiveCells = useMemo(() => {
    const reportedIds = new Set(filteredRows.map((r) => r.cellId));
    return visibleCells.filter((c) => !reportedIds.has(c.id));
  }, [filteredRows, visibleCells]);

  // ── Weekly buckets ────────────────────────────────────────────────────
  const [yyyy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const weekly = useMemo(() => {
    const out: { week: string; reports: number; attendance: number }[] = [];
    for (let w = 0; w < weekCount; w++) {
      const lo = w * 7 + 1;
      const hi = Math.min((w + 1) * 7, daysInMonth);
      const wRows = filteredRows.filter((r) => {
        const d = Number(r.date.slice(-2));
        return d >= lo && d <= hi;
      });
      out.push({
        week: `W${w + 1}`,
        reports: wRows.length,
        attendance: wRows.reduce((s, r) => s + r.attendance, 0),
      });
    }
    return out;
  }, [filteredRows, weekCount, daysInMonth]);

  // ── Cell-type donut (count cells that filed ≥1 report in the slice) ───
  const cellTypeSlices = useMemo(() => {
    const typeMap = new Map<CellType, Set<string>>();
    for (const r of filteredRows) {
      const set = typeMap.get(r.cellType) ?? new Set<string>();
      set.add(r.cellId);
      typeMap.set(r.cellType, set);
    }
    return Array.from(typeMap.entries()).map(([type, set]) => ({
      label: TYPE_LABEL[type],
      value: set.size,
      color: TYPE_COLORS[type] ?? "#999",
    }));
  }, [filteredRows]);

  // ── Per-leader aggregation table ──────────────────────────────────────
  const leaderAgg: LeaderAgg[] = useMemo(() => {
    const inScopeLeaders = selectableLeaders;
    return inScopeLeaders.map((l) => {
      const leaderCells = visibleCells.filter((c) => c.leaderUid === l.uid);
      const leaderRows = filteredRows.filter((r) => r.leaderUid === l.uid);
      const reportedCellIds = new Set(leaderRows.map((r) => r.cellId));
      const g12 = G12_LEADERS.find((g) => g.uid === l.g12Uid);
      return {
        leaderUid: l.uid,
        leaderName: l.name,
        g12Name: g12?.name ?? "—",
        cellsLed: leaderCells.length,
        cellsReported: reportedCellIds.size,
        reports: leaderRows.length,
        attendance: leaderRows.reduce((s, r) => s + r.attendance, 0),
        visitors: leaderRows.reduce((s, r) => s + r.visitors, 0),
        satisfaction: leaderRows.length > 0
          ? leaderRows.reduce((s, r) => s + r.satisfaction, 0) / leaderRows.length
          : 0,
      };
    }).filter((row) => row.cellsLed > 0)
      .sort((a, b) => {
        if (leaderSort === "reports") return b.reports - a.reports;
        if (leaderSort === "attendance") return b.attendance - a.attendance;
        return b.satisfaction - a.satisfaction;
      });
  }, [selectableLeaders, visibleCells, filteredRows, leaderSort]);

  // ── Per-G12 aggregation ───────────────────────────────────────────────
  const g12Agg = useMemo(() => {
    return G12_LEADERS.map((g) => {
      const g12Cells = visibleCells.filter((c) => c.g12Uid === g.uid);
      const g12Rows = filteredRows.filter((r) => r.g12Uid === g.uid);
      const leadersUnder = new Set(LEADERS.filter((l) => l.g12Uid === g.uid).map((l) => l.uid));
      return {
        g12Uid: g.uid,
        g12Name: g.name,
        leadersUnderCount: leadersUnder.size,
        cellsCount: g12Cells.length,
        reports: g12Rows.length,
        attendance: g12Rows.reduce((s, r) => s + r.attendance, 0),
      };
    }).filter((r) => r.cellsCount > 0)
      .sort((a, b) => b.reports - a.reports);
  }, [visibleCells, filteredRows]);

  const selectedLabel = months.find((m) => m.value === month)?.label ?? month;
  const anyFilterActive = g12Filter !== "all" || leaderFilter !== "all" || typeFilter !== "all" || cellFilter !== "all";

  const clearFilters = () => {
    setG12Filter("all");
    setLeaderFilter("all");
    setTypeFilter("all");
    setCellFilter("all");
  };

  /* ─────────────────────────────────────────────────────────────────────
     Render
     ───────────────────────────────────────────────────────────────────── */
  return (
    <div className="page">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className="page-header"
        style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
            Reports
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Cross-network reporting overview — filter by month, G12, leader, type, or specific cell.
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#fff", border: "1px solid var(--color-stroke)",
              borderRadius: 12, padding: "8px 14px", boxShadow: "var(--shadow-xs)",
            }}
          >
            <Icon name="calendar" size={16} style={{ color: "var(--color-body-green)" }} />
            <select
              value={month} onChange={(e) => setMonth(e.target.value)}
              style={{ border: 0, background: "transparent", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--color-primary)", cursor: "pointer", outline: "none" }}
            >
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <Button variant={showFilters ? "primary" : "secondary"} icon="filter" onClick={() => setShowFilters((v) => !v)}>
            Filters{anyFilterActive ? " ●" : ""}
          </Button>
        </div>
      </header>

      {/* ── Filter bar (collapsible) ───────────────────────────── */}
      {showFilters && (
        <div
          style={{
            background: "#fff", border: "1px solid var(--color-stroke)",
            borderRadius: 14, padding: 18, marginBottom: 18,
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "end",
          }}
        >
          <FilterField label="G12 supervisor">
            <select value={g12Filter} onChange={(e) => { setG12Filter(e.target.value); setLeaderFilter("all"); setCellFilter("all"); }} className="input">
              <option value="all">All G12 supervisors</option>
              {G12_LEADERS.map((g) => <option key={g.uid} value={g.uid}>{g.name}</option>)}
            </select>
          </FilterField>

          <FilterField label="Cell leader">
            <select value={leaderFilter} onChange={(e) => { setLeaderFilter(e.target.value); setCellFilter("all"); }} className="input">
              <option value="all">All cell leaders</option>
              {selectableLeaders.map((l) => <option key={l.uid} value={l.uid}>{l.name}</option>)}
            </select>
          </FilterField>

          <FilterField label="Cell type">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["all", "care", "outreach", "children", "g12"] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => { setTypeFilter(t); setCellFilter("all"); }}
                  style={{
                    padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 600,
                    border: `1.5px solid ${typeFilter === t ? "var(--color-accent)" : "var(--color-stroke)"}`,
                    background: typeFilter === t ? "rgba(188,233,85,0.18)" : "#fff",
                    color: "var(--color-primary)", cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {t === "all" ? "All types" : TYPE_LABEL[t as CellType]}
                </button>
              ))}
            </div>
          </FilterField>

          <FilterField label="Cell">
            <select value={cellFilter} onChange={(e) => setCellFilter(e.target.value)} className="input">
              <option value="all">All cells</option>
              {selectableCells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FilterField>

          {anyFilterActive && (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <Button variant="ghost" icon="x" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Active filter chips ─────────────────────────────────── */}
      {anyFilterActive && (
        <div style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {g12Filter !== "all" && (
            <FilterChip label={`G12: ${G12_LEADERS.find((g) => g.uid === g12Filter)?.name}`} onRemove={() => { setG12Filter("all"); setLeaderFilter("all"); setCellFilter("all"); }} />
          )}
          {leaderFilter !== "all" && (
            <FilterChip label={`Leader: ${LEADERS.find((l) => l.uid === leaderFilter)?.name}`} onRemove={() => { setLeaderFilter("all"); setCellFilter("all"); }} />
          )}
          {typeFilter !== "all" && (
            <FilterChip label={`Type: ${TYPE_LABEL[typeFilter as CellType]}`} onRemove={() => { setTypeFilter("all"); setCellFilter("all"); }} />
          )}
          {cellFilter !== "all" && (
            <FilterChip label={`Cell: ${CELLS.find((c) => c.id === cellFilter)?.name}`} onRemove={() => setCellFilter("all")} />
          )}
        </div>
      )}

      {/* ── KPI grid ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
        <KpiMini label="Cells held" value={cellsHeld} sub={`of ${visibleCells.length} in scope`} />
        <KpiMini label="Reports filed" value={reportsFiled} sub={`in ${selectedLabel}`} />
        <KpiMini label="Active leaders" value={activeLeaders} sub={`of ${selectableLeaders.length} in scope`} />
        <KpiMini label="G12 supervisors active" value={activeG12s} sub={g12Filter === "all" ? "across network" : "in selection"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <KpiMini label="Attendance" value={attendanceTotal} sub="members present" />
        <KpiMini label="Attendance rate" value={`${attendanceRate}%`} sub="present / roster" />
        <KpiMini label="Visitors" value={visitorsTotal} sub="unregistered attendees" />
        <KpiMini label="Avg. satisfaction" value={avgSatisfaction > 0 ? `${avgSatisfaction}/5` : "—"} sub="from filed reports" />
      </div>

      {/* ── Inactive cells warning ──────────────────────────────── */}
      {inactiveCells.length > 0 && (
        <div
          style={{
            background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.32)",
            borderRadius: 14, padding: "16px 18px", marginBottom: 18,
            display: "flex", gap: 14, alignItems: "flex-start",
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(217,119,6,0.18)", color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="alert-triangle" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-primary)" }}>
              {inactiveCells.length} cell{inactiveCells.length === 1 ? " hasn’t" : "s haven’t"} filed a report this month
            </h3>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {inactiveCells.map((c) => (
                <span key={c.id} style={{ padding: "4px 10px", background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 9999, fontSize: 12, fontFamily: "var(--font-body)", color: "var(--color-primary)" }}>
                  <span className={`cell-type ${c.type}`} style={{ marginRight: 6, fontSize: 10 }}>{c.type}</span>
                  {c.name} · {LEADERS.find((l) => l.uid === c.leaderUid)?.name ?? "—"}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chart row 1 ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard title="Reports filed by week" sub={`${selectedLabel} · ${anyFilterActive ? "filtered slice" : "all cells"}`}>
          {weekly.every((w) => w.reports === 0) ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
              No reports filed in this slice.
            </div>
          ) : (
            <WeeklyAttendanceBars
              bars={weekly.map((w) => ({ label: w.week, value: w.reports }))}
              highlightIndex={weekly.reduce((best, w, i) => weekly[best].reports >= w.reports ? best : i, 0)}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Meetings by cell type"
          sub="cells that met"
          legend={cellTypeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          {cellTypeSlices.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
              No meetings recorded.
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={cellTypeSlices} size={200} />
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Attendance trend + per-G12 leaderboard ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 14, marginBottom: 20 }}>
        <ChartCard title="Attendance trend" sub="members present per week">
          {weekly.length < 2 || weekly.every((w) => w.attendance === 0) ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
              Not enough data.
            </div>
          ) : (
            <MemberGrowthLine points={weekly.map((w) => ({ label: w.week, value: w.attendance }))} />
          )}
        </ChartCard>

        <div style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 16, color: "var(--color-primary)" }}>
              By G12 supervisor
            </h3>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>{selectedLabel}</span>
          </div>
          {g12Agg.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
              No G12 supervisor data.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--color-body-green)", borderBottom: "1px solid var(--color-stroke)" }}>
                    <th style={{ padding: "8px 6px", fontWeight: 600 }}>G12</th>
                    <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>Leaders</th>
                    <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>Cells</th>
                    <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>Reports</th>
                    <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {g12Agg.map((r) => (
                    <tr key={r.g12Uid} style={{ borderTop: "1px solid var(--color-stroke-2)" }}>
                      <td style={{ padding: "8px 6px", color: "var(--color-primary)", fontWeight: 500 }}>{r.g12Name}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.leadersUnderCount}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.cellsCount}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 600 }}>{r.reports}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.attendance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-Leader table ────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-stroke)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 16, color: "var(--color-primary)" }}>By cell leader</h3>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
              Click a column to sort. Showing {leaderAgg.length} leader{leaderAgg.length === 1 ? "" : "s"} in scope.
            </p>
          </div>
        </div>
        <LeaderTable rows={leaderAgg} sort={leaderSort} setSort={setLeaderSort} />
      </div>

      {/* ── Per-report table ────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-stroke)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 16, color: "var(--color-primary)" }}>All reports</h3>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
              {reportsFiled} report{reportsFiled === 1 ? "" : "s"} from {cellsHeld} cell{cellsHeld === 1 ? "" : "s"} in {selectedLabel}.
            </p>
          </div>
          <Badge tone="info">UI preview</Badge>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-muted)" }}>
            <Icon name="file-text" size={26} style={{ opacity: 0.4 }} />
            <p style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 14 }}>No reports match the current filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--color-body-green)", background: "var(--color-stroke-2)" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Day</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Cell</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Leader</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>G12</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Attendance</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Visitors</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--color-stroke)" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--color-body-green)" }}>{formatDay(r.date)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-primary)", fontWeight: 500 }}>{r.cellName}</td>
                    <td style={{ padding: "10px 14px" }}><span className={`cell-type ${r.cellType}`} style={{ fontSize: 11 }}>{r.cellType}</span></td>
                    <td style={{ padding: "10px 14px", color: "var(--color-body-green)" }}>{r.leaderName}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-body-green)" }}>{r.g12Name}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>{r.attendance}/{r.members}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-body-green)" }}>{r.visitors}</td>
                    <td style={{ padding: "10px 14px" }}><StarRating value={r.satisfaction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <p style={{ marginTop: 18, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)", textAlign: "center" }}>
        <Icon name="info" size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
        UI preview — figures are illustrative. Wire to <code>/analytics/reports?month=YYYY-MM&amp;g12LeaderUid=&amp;leaderUid=&amp;type=&amp;cellId=</code> when the backend is ready.
      </p>
    </div>
  );
}

/* ── tiny helpers ─────────────────────────────────────────────────────── */

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 8px 5px 12px", background: "rgba(188,233,85,0.18)",
      border: "1px solid rgba(188,233,85,0.6)", borderRadius: 9999,
      fontSize: 12, fontFamily: "var(--font-body)", color: "var(--color-primary)", fontWeight: 600,
    }}>
      {label}
      <button type="button" onClick={onRemove} aria-label="Remove filter" style={{ background: "transparent", border: 0, padding: 2, cursor: "pointer", color: "inherit", display: "inline-flex" }}>
        <Icon name="x" size={12} />
      </button>
    </span>
  );
}
