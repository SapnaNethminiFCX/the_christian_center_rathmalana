"use client";

/**
 * G12 → Reports page (UI ONLY).
 *
 * Cross-network reports overview for a G12 leader. Month picker drives all
 * the figures: KPI cards, weekly bar chart, cell-type donut, attendance
 * trend, top cells list, and a flat table of reports filed in the month.
 *
 * Backend integration is intentionally NOT wired — mock data is generated
 * deterministically from the selected month so the UI shows the right
 * shape and stays stable as you switch months. Wire to real endpoints
 * later (likely /analytics/reports?month=YYYY-MM and /cells/:id/reports).
 */

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { MemberGrowthLine } from "@/components/analytics/MemberGrowthLine";

const TYPE_COLORS: Record<string, string> = {
  care: "#1D4ED8",
  outreach: "#15803D",
  children: "#D97706",
  g12: "#7C3AED",
};

const CELL_NAMES = [
  "Rathmalana West",
  "Bethel Care · Colombo",
  "Children of Hope",
  "Outreach · Dehiwala",
  "G12 Foundation",
  "Nugegoda Cell A",
  "Sapphire Outreach",
  "Bethel Kids",
];

const LEADER_NAMES = [
  "Sithuru Kavinda",
  "Nadun Madawala",
  "Ushani Amanda",
  "Saman Silva",
  "Kamala Perera",
];

/** Build a list of the last 12 months ending at today (newest first). */
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

/** Deterministic pseudo-RNG so the same month always renders the same data. */
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
  cellName: string;
  cellType: "care" | "outreach" | "children" | "g12";
  leaderName: string;
  date: string;       // YYYY-MM-DD
  attendance: number; // present count
  members: number;    // cell roster size
  satisfaction: number; // 1..5
  visitors: number;
}

interface MonthData {
  rows: ReportRow[];
  weekly: { week: string; reports: number; attendance: number }[];
  cellTypes: { type: string; count: number }[];
  attendanceTrend: { label: string; value: number }[];
  topCells: { name: string; reports: number; type: string }[];
  cellsHeld: number;
  reportsFiled: number;
  activeLeaders: number;
  attendanceTotal: number;
  uniqueTypes: number;
  avgSatisfaction: number;
  visitorsTotal: number;
}

function buildMockData(month: string): MonthData {
  const [yyyy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  const rand = mulberry32(seedFromMonth(month));
  const cellPool = CELL_NAMES.map((name, idx) => ({
    name,
    type: (["care", "outreach", "children", "g12"] as const)[idx % 4],
    leader: LEADER_NAMES[idx % LEADER_NAMES.length],
    members: 4 + Math.floor(rand() * 10),
  }));

  // 1..3 reports per cell across the month — randomized day per report.
  const rows: ReportRow[] = [];
  let id = 1;
  for (const c of cellPool) {
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      const presentRatio = 0.5 + rand() * 0.45;
      rows.push({
        id: `r-${month}-${id++}`,
        cellName: c.name,
        cellType: c.type,
        leaderName: c.leader,
        date: `${yyyy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        attendance: Math.max(1, Math.round(c.members * presentRatio)),
        members: c.members,
        satisfaction: 3 + Math.floor(rand() * 3),
        visitors: Math.floor(rand() * 3),
      });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Weekly buckets (week 1..n) within the month.
  const weekCount = Math.ceil(daysInMonth / 7);
  const weekly: { week: string; reports: number; attendance: number }[] = [];
  for (let w = 0; w < weekCount; w++) {
    const lo = w * 7 + 1;
    const hi = Math.min((w + 1) * 7, daysInMonth);
    const wRows = rows.filter((r) => {
      const d = Number(r.date.slice(-2));
      return d >= lo && d <= hi;
    });
    weekly.push({
      week: `W${w + 1}`,
      reports: wRows.length,
      attendance: wRows.reduce((s, r) => s + r.attendance, 0),
    });
  }

  // Cell-type breakdown (count cells that filed ≥1 report in this month).
  const typeMap = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = typeMap.get(r.cellType) ?? new Set<string>();
    set.add(r.cellName);
    typeMap.set(r.cellType, set);
  }
  const cellTypes = Array.from(typeMap.entries()).map(([type, set]) => ({
    type,
    count: set.size,
  }));

  // Top cells by report count.
  const reportsPerCell = new Map<string, { name: string; type: string; reports: number }>();
  for (const r of rows) {
    const cur = reportsPerCell.get(r.cellName) ?? { name: r.cellName, type: r.cellType, reports: 0 };
    cur.reports += 1;
    reportsPerCell.set(r.cellName, cur);
  }
  const topCells = Array.from(reportsPerCell.values())
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 5);

  const cellsHeld = new Set(rows.map((r) => r.cellName)).size;
  const reportsFiled = rows.length;
  const activeLeaders = new Set(rows.map((r) => r.leaderName)).size;
  const attendanceTotal = rows.reduce((s, r) => s + r.attendance, 0);
  const uniqueTypes = cellTypes.length;
  const avgSatisfaction =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.satisfaction, 0) / rows.length) * 10) / 10
      : 0;
  const visitorsTotal = rows.reduce((s, r) => s + r.visitors, 0);

  return {
    rows,
    weekly,
    cellTypes,
    attendanceTrend: weekly.map((w) => ({ label: w.week, value: w.attendance })),
    topCells,
    cellsHeld,
    reportsFiled,
    activeLeaders,
    attendanceTotal,
    uniqueTypes,
    avgSatisfaction,
    visitorsTotal,
  };
}

function formatDay(iso: string): string {
  const [, , dd] = iso.split("-");
  return dd;
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

export default function G12ReportsPage() {
  const months = useMemo(recentMonths, []);
  const [month, setMonth] = useState(months[0].value);
  const data = useMemo(() => buildMockData(month), [month]);

  const selectedLabel = months.find((m) => m.value === month)?.label ?? month;

  const weeklyBars = data.weekly.map((w) => ({ label: w.week, value: w.reports }));
  const typeSlices = data.cellTypes.map((s) => ({
    label: s.type,
    value: s.count,
    color: TYPE_COLORS[s.type] ?? "#999",
  }));

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="page-header"
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-heading)",
              fontSize: 32,
              color: "var(--color-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Reports
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "var(--color-body-green)",
            }}
          >
            Cross-network reports overview — pick a month to drill in.
          </p>
        </div>

        {/* Month picker */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1px solid var(--color-stroke)",
            borderRadius: 12,
            padding: "8px 14px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <Icon name="calendar" size={16} style={{ color: "var(--color-body-green)" }} />
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              border: 0,
              background: "transparent",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-primary)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <KpiMini label="Cells held" value={data.cellsHeld} sub={`in ${selectedLabel}`} />
        <KpiMini label="Reports filed" value={data.reportsFiled} sub="across all cells" />
        <KpiMini label="Cell types" value={data.uniqueTypes} sub="of meeting categories" />
        <KpiMini label="Active leaders" value={data.activeLeaders} sub="filed ≥1 report" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <KpiMini label="Attendance" value={data.attendanceTotal} sub="members marked present" />
        <KpiMini label="Visitors" value={data.visitorsTotal} sub="unregistered attendees" />
        <KpiMini
          label="Avg. satisfaction"
          value={data.avgSatisfaction ? `${data.avgSatisfaction}/5` : "—"}
          sub="from filed reports"
        />
        <KpiMini
          label="Reports per cell"
          value={
            data.cellsHeld > 0
              ? (Math.round((data.reportsFiled / data.cellsHeld) * 10) / 10).toString()
              : "—"
          }
          sub="month avg."
        />
      </div>

      {/* ── Chart row 1: Weekly + Cell types ────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <ChartCard title="Reports filed by week" sub={`${selectedLabel} · weekly breakdown`}>
          <WeeklyAttendanceBars
            bars={weeklyBars}
            highlightIndex={weeklyBars.findIndex((b) => b.value === Math.max(...weeklyBars.map((x) => x.value)))}
          />
        </ChartCard>

        <ChartCard
          title="Meetings by cell type"
          sub="cells that met this month"
          legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <MeetingTypeDonut slices={typeSlices} size={200} />
          </div>
        </ChartCard>
      </div>

      {/* ── Chart row 2: Attendance trend + Top cells ───────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) minmax(280px, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <ChartCard title="Attendance trend" sub="members present per week">
          <MemberGrowthLine points={data.attendanceTrend} />
        </ChartCard>

        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-stroke)",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: 16,
                color: "var(--color-primary)",
              }}
            >
              Top cells by reports
            </h3>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "var(--color-body-green)",
              }}
            >
              {selectedLabel}
            </span>
          </div>

          {data.topCells.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--color-muted)" }}>
              No reports filed.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.topCells.map((c) => {
                const max = data.topCells[0].reports || 1;
                const pct = (c.reports / max) * 100;
                return (
                  <div key={c.name}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                        fontFamily: "var(--font-body)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          className={`cell-type ${c.type}`}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          {c.type}
                        </span>
                        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{c.name}</span>
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-body-green)",
                          fontSize: 12,
                        }}
                      >
                        {c.reports} report{c.reports === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "var(--color-stroke-2)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: TYPE_COLORS[c.type] ?? "var(--color-accent)",
                          borderRadius: 4,
                          transition: "width 200ms ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Reports table ───────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--color-stroke)",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--color-stroke)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: 16,
                color: "var(--color-primary)",
              }}
            >
              All reports in {selectedLabel}
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--color-body-green)",
              }}
            >
              {data.rows.length} report{data.rows.length === 1 ? "" : "s"} from {data.cellsHeld} cell
              {data.cellsHeld === 1 ? "" : "s"}.
            </p>
          </div>
          <Badge tone="info">UI preview</Badge>
        </div>

        {data.rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-muted)" }}>
            <Icon name="file-text" size={26} style={{ opacity: 0.4 }} />
            <p style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 14 }}>
              No reports were filed in {selectedLabel}.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: "var(--color-body-green)",
                    background: "var(--color-stroke-2)",
                  }}
                >
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Day</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Cell</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Leader</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>
                    Attendance
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>
                    Visitors
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--color-stroke)" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-body-green)",
                      }}
                    >
                      {formatDay(r.date)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-primary)", fontWeight: 500 }}>
                      {r.cellName}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`cell-type ${r.cellType}`} style={{ fontSize: 11 }}>
                        {r.cellType}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-body-green)" }}>
                      {r.leaderName}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {r.attendance}/{r.members}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-body-green)",
                      }}
                    >
                      {r.visitors}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <StarRating value={r.satisfaction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UI-only disclaimer footer */}
      <p
        style={{
          marginTop: 18,
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "var(--color-muted)",
          textAlign: "center",
        }}
      >
        <Icon name="info" size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
        UI preview — figures are illustrative. Wire to <code>/analytics/reports?month=YYYY-MM</code> when the backend is ready.
      </p>
    </div>
  );
}
