"use client";

import { useMemo } from "react";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { EmptyChart } from "@/components/analytics/EmptyChart";
import { useCells } from "@/application/hooks/useCells";
import {
  useCellsWeekly,
  useAttendance,
  useMeetingTypes,
} from "@/application/hooks/useAnalytics";
import { useReportAggregates } from "@/application/hooks/useReportAggregates";

const TYPE_COLORS: Record<string, string> = {
  care: "#1D4ED8",
  outreach: "#15803D",
  children: "#D97706",
  g12: "#7C3AED",
};

function weekLabel(w: unknown): string {
  if (typeof w !== "string" || w.length === 0) return "";
  return w.length >= 3 ? w.slice(-3) : w;
}

const KNOWN_CELL_TYPES = new Set(["g12", "care", "children", "outreach"]);

function toMeetingTypeArray(d: unknown): Array<{ type: string; count: number }> {
  if (Array.isArray(d)) return d as Array<{ type: string; count: number }>;
  if (d && typeof d === "object") {
    const obj = d as Record<string, unknown>;
    // Backend envelope: { scope, period, breakdown: { care: N, ... } }
    if (obj.breakdown && typeof obj.breakdown === "object") {
      return toMeetingTypeArray(obj.breakdown);
    }
    // Raw object map { care: N, outreach: N } — only accept if keys look like cell types.
    const entries = Object.entries(obj).filter(([k]) => KNOWN_CELL_TYPES.has(k));
    if (entries.length === 0) return [];
    return entries.map(([type, count]) => ({
      type,
      count: typeof count === "number" ? count : Number(count) || 0,
    }));
  }
  return [];
}

/**
 * G12 Dashboard — "Network overview". All numbers derived from real API:
 *   - /cells (G12 backend-scoped to their network) → cell count + leader count
 *   - /analytics/cells/weekly → reports filed in last 8 weeks
 *   - /analytics/attendance   → weekly attendance bars + avg attendance rate
 *   - /analytics/meeting-types → by-cell-type donut
 */
export default function G12DashboardPage() {
  const { cells, loading: cellsLoading } = useCells();
  const cellsWeekly = useCellsWeekly({ weeks: 8 });
  const attendance = useAttendance();
  const meetingTypes = useMeetingTypes();
  // Fallback aggregates computed from real cell reports across the network.
  const aggregates = useReportAggregates(cells, { weeks: 8 });

  const leadersInNetwork = useMemo(
    () => new Set((cells ?? []).map((c) => c.leaderUid).filter(Boolean)).size,
    [cells],
  );
  const cellsInNetwork = cells?.length ?? 0;

  // Total reports filed across the network — sourced from each cell's
  // `reportCount` field (populated by the backend on /cells). Falls back to
  // the analytics endpoint if cells haven't loaded yet.
  const totalReports = useMemo(() => {
    const fromCells = (cells ?? []).reduce((s, c) => s + (c.reportCount ?? 0), 0);
    if (fromCells > 0) return fromCells;
    return (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0);
  }, [cells, cellsWeekly.data]);

  const weeklyBars = useMemo(() => {
    const fromApi = Array.isArray(attendance.data) ? attendance.data : [];
    const apiTotal = fromApi.reduce((s, x) => s + (x?.present ?? 0) + (x?.absent ?? 0), 0);
    const source = apiTotal > 0 ? fromApi : aggregates.weekly;
    return source.slice(-8).map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 }));
  }, [attendance.data, aggregates.weekly]);

  const typeSlices = useMemo(() => {
    const fromApi = toMeetingTypeArray(meetingTypes.data);
    const apiTotal = fromApi.reduce((s, x) => s + (x.count ?? 0), 0);
    // Fall back to real cell-report aggregates when API has no data OR when
    // every slice is zero (common when backend ships the response shape but
    // the aggregation hasn't been wired yet).
    const source = apiTotal > 0 ? fromApi : aggregates.meetingTypes;
    return source.map((s) => ({
      label: s?.type ?? "unknown",
      value: s?.count ?? 0,
      color: TYPE_COLORS[s?.type ?? ""] ?? "#999",
    }));
  }, [meetingTypes.data, aggregates.meetingTypes]);

  return (
    <div className="page">
      <header
        className="page-header"
        style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
            Network overview
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Across leaders in your G12 network.
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiMini
          label="Leaders in network"
          value={cellsLoading ? "…" : leadersInNetwork}
          sub="Unique leaders"
        />
        <KpiMini
          label="Cells in network"
          value={cellsLoading ? "…" : cellsInNetwork}
          sub={cellsInNetwork === 0 ? "no cells yet" : "in your scope"}
        />
        <KpiMini
          label="Total reports"
          value={cellsLoading ? "…" : totalReports}
          sub="Across your network"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
        <ChartCard
          title="Weekly attendance"
          sub="Past 8 weeks · all your network cells combined"
        >
          {(attendance.loading || aggregates.loading) && weeklyBars.length === 0 ? <EmptyChart message="Loading…" /> :
            weeklyBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={weeklyBars} highlightIndex={weeklyBars.length - 1} />}
        </ChartCard>

        <ChartCard
          title="By cell type"
          sub="Reports by cell type"
          legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          {(meetingTypes.loading || aggregates.loading) && typeSlices.length === 0 ? <EmptyChart message="Loading…" /> :
            typeSlices.length === 0 ? <EmptyChart /> :
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={typeSlices} size={200} />
            </div>}
        </ChartCard>
      </div>
    </div>
  );
}
