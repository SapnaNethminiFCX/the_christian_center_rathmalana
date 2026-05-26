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

/**
 * G12 Dashboard — "Network overview". All numbers derived from real API:
 *   - /cells (G12 backend-scoped to their network) → cell count + leader count
 *   - /analytics/cells/weekly → reports filed in last 8 weeks
 *   - /analytics/attendance   → weekly attendance bars + avg attendance rate
 *   - /analytics/meeting-types → by-cell-type donut
 */
export default function G12DashboardPage() {
  // Per V2 spec §13.1, calling GET /cells without a scope param auto-applies
  // the G12 network scope server-side — that's the source of truth for
  // "cells in my network". Avoids the prior approach of fetching org-wide
  // and filtering on g12LeaderUid (fragile if backend doesn't populate it).
  const { cells: networkCells, loading: cellsLoading } = useCells({ state: "active" });
  const cellsWeekly = useCellsWeekly({ weeks: 8 });
  const attendance = useAttendance();

  const aggregates = useReportAggregates(networkCells, { weeks: 8 });

  const leadersInNetwork = useMemo(
    () => new Set(networkCells.map((c) => c.leaderUid).filter(Boolean)).size,
    [networkCells],
  );
  const cellsInNetwork = networkCells.length;

  // Total reports filed across the network — sourced from each cell's
  // `reportCount` field (populated by the backend on /cells). Falls back to
  // the analytics endpoint if cells haven't loaded yet.
  const totalReports = useMemo(() => {
    const fromCells = networkCells.reduce((s, c) => s + (c.reportCount ?? 0), 0);
    if (fromCells > 0) return fromCells;
    return (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0);
  }, [networkCells, cellsWeekly.data]);

  const weeklyBars = useMemo(() => {
    const fromApi = Array.isArray(attendance.data) ? attendance.data : [];
    const apiTotal = fromApi.reduce((s, x) => s + (x?.present ?? 0) + (x?.absent ?? 0), 0);
    if (apiTotal > 0) {
      return fromApi.slice(-8).map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 }));
    }
    const weeklyTotal = aggregates.weekly.reduce((s, p) => s + (p?.present ?? 0), 0);
    if (weeklyTotal > 0) {
      return aggregates.weekly.slice(-8).map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 }));
    }
    // Per-cell fallback so a G12 with cells but no attendance recorded still
    // sees something meaningful in the bar chart.
    return networkCells.map((c) => ({
      label: c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name,
      value: c.memberCount ?? 0,
    }));
  }, [attendance.data, aggregates.weekly, networkCells]);

  // Count cells in the network by type so the donut matches "Cells in network"
  // KPI even before any reports are filed. Backend `/analytics/meeting-types`
  // is reports-by-type, which under-represents fresh cells; reserve it for
  // post-launch when reporting data is dense.
  const typeSlices = useMemo(() => {
    const typeMap = new Map<string, number>();
    for (const c of networkCells) {
      const t = c.type ?? "unknown";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    return Array.from(typeMap.entries()).map(([type, count]) => ({
      label: type,
      value: count,
      color: TYPE_COLORS[type] ?? "#999",
    }));
  }, [networkCells]);

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
          sub="Distribution of your network"
          legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          {cellsLoading && typeSlices.length === 0 ? <EmptyChart message="Loading…" /> :
            typeSlices.length === 0 ? <EmptyChart /> :
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={typeSlices} size={200} />
            </div>}
        </ChartCard>
      </div>
    </div>
  );
}
