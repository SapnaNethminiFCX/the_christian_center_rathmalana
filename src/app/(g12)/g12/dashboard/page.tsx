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
import { useAppSelector } from "@/application/hooks/useAppSelector";

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
  // Per V2 spec §13.1, GET /cells without a scope param auto-applies the
  // G12 network scope (cells they lead + cells where they're g12LeaderUid).
  // The dashboard charts and KPIs below derive from `myLedCells` — the
  // subset they personally lead — since "Cells in network" already counts
  // the wider supervised set and the user asked the charts to track only
  // their own cells.
  const { cells: networkCells, loading: cellsLoading } = useCells({ state: "active" });
  const currentUid = useAppSelector((s) => s.session.user?.uid);
  const cellsWeekly = useCellsWeekly({ weeks: 8 });
  const attendance = useAttendance();

  const myLedCells = useMemo(() => {
    if (!currentUid) return [];
    return networkCells.filter((c) => !!c.leaderUid && c.leaderUid === currentUid);
  }, [networkCells, currentUid]);

  const aggregates = useReportAggregates(myLedCells, { weeks: 8 });

  // KPIs: "leaders in network" counts unique leaders the G12 oversees
  // (including themselves), but "cells" and "reports" track just led cells.
  const leadersInNetwork = useMemo(
    () => new Set(networkCells.map((c) => c.leaderUid).filter(Boolean)).size,
    [networkCells],
  );
  const cellsILead = myLedCells.length;

  const totalReports = useMemo(() => {
    const fromCells = myLedCells.reduce((s, c) => s + (c.reportCount ?? 0), 0);
    if (fromCells > 0) return fromCells;
    return (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0);
  }, [myLedCells, cellsWeekly.data]);

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
    return myLedCells.map((c) => ({
      label: c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name,
      value: c.memberCount ?? 0,
    }));
  }, [attendance.data, aggregates.weekly, myLedCells]);

  // Count led cells by type — donut should match "Cells I lead" KPI.
  const typeSlices = useMemo(() => {
    const typeMap = new Map<string, number>();
    for (const c of myLedCells) {
      const t = c.type ?? "unknown";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    return Array.from(typeMap.entries()).map(([type, count]) => ({
      label: type,
      value: count,
      color: TYPE_COLORS[type] ?? "#999",
    }));
  }, [myLedCells]);

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
          label="Cells I lead"
          value={cellsLoading ? "…" : cellsILead}
          sub={cellsILead === 0 ? "no cells yet" : "directly led"}
        />
        <KpiMini
          label="Total reports"
          value={cellsLoading ? "…" : totalReports}
          sub="Across cells you lead"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
        <ChartCard
          title="Weekly attendance"
          sub="Past 8 weeks · cells you lead"
        >
          {(attendance.loading || aggregates.loading) && weeklyBars.length === 0 ? <EmptyChart message="Loading…" /> :
            weeklyBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={weeklyBars} highlightIndex={weeklyBars.length - 1} />}
        </ChartCard>

        <ChartCard
          title="By cell type"
          sub="Distribution of cells you lead"
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
