"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { EmptyChart } from "@/components/analytics/EmptyChart";
import { useMyCells } from "@/application/hooks/useCells";
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

export default function LeaderDashboardPage() {
  const router = useRouter();
  // /cells/mine returns every cell the user belongs to (member + led).
  // The strict filter below narrows it to cells where THIS user is the
  // leader — strict equality so we never accidentally match cells where
  // both `currentUid` and `leaderUid` are undefined (which would let every
  // row through and inflate the KPI).
  const { cells: myCells, loading: cellsLoading } = useMyCells();
  const currentUid = useAppSelector((s) => s.session.user?.uid);
  const cellsWeekly = useCellsWeekly({ weeks: 8 });
  const attendance = useAttendance();

  const myLedCells = useMemo(() => {
    if (!currentUid) return [];
    return (myCells ?? []).filter((c) => !!c.leaderUid && c.leaderUid === currentUid);
  }, [myCells, currentUid]);

  // Fallback aggregates derived from real cell reports — used when the
  // backend's /analytics/* endpoints return empty.
  const aggregates = useReportAggregates(myLedCells, { weeks: 8 });

  const totalMembers = useMemo(
    () => myLedCells.reduce((s, c) => s + (c.memberCount ?? 0), 0),
    [myLedCells],
  );

  // Total reports filed across the leader's cells. `cell.reportCount` is the
  // authoritative source from /cells/mine; the analytics endpoint is used as
  // a fallback if cells haven't loaded yet.
  const totalReports = useMemo(() => {
    const fromCells = myLedCells.reduce((s, c) => s + (c.reportCount ?? 0), 0);
    if (fromCells > 0) return fromCells;
    return (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0);
  }, [myLedCells, cellsWeekly.data]);

  // Prefer backend analytics when populated; fall back to client-side
  // aggregates computed from real cell reports. If neither produces data
  // (typical for a leader with cells but no recent attendance recorded),
  // fall back further to per-cell member counts so the chart is never empty.
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
    // Per-cell fallback. Truncate names so labels fit the tiny SVG axis.
    return myLedCells.map((c) => ({
      label: c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name,
      value: c.memberCount ?? 0,
    }));
  }, [attendance.data, aggregates.weekly, myLedCells]);

  // The "By cell type" card is labelled "Distribution of your cells", so it
  // should count cells, not reports. Counting reports under-represented types
  // whose cells hadn't filed any report yet (e.g. a leader with 4 cells across
  // different types but only "children" reports filed would show 1 slice).
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
            Leader Dashboard
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Cells you lead at a glance. Filed reports, attendance, and meeting types.
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiMini label="My cells" value={cellsLoading ? "…" : myLedCells.length} sub="Active cells" />
        <KpiMini label="Total members" value={cellsLoading ? "…" : totalMembers} sub="Across cells" />
        <KpiMini label="Reports filed" value={cellsLoading ? "…" : totalReports} sub="Across your cells" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard
          title="Weekly attendance"
          sub={
            (Array.isArray(attendance.data) && attendance.data.length > 0) || aggregates.weekly.length > 0
              ? "Members present across all cells over the last 8 weeks"
              : "Members per cell — file reports to start seeing weekly trends"
          }
        >
          {(attendance.loading || aggregates.loading) && weeklyBars.length === 0 ? <EmptyChart message="Loading…" /> :
            weeklyBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={weeklyBars} highlightIndex={weeklyBars.length - 1} />}
        </ChartCard>

        <ChartCard
          title="By cell type"
          sub="Distribution of your cells"
          legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          {cellsLoading && typeSlices.length === 0 ? <EmptyChart message="Loading…" /> :
            typeSlices.length === 0 ? <EmptyChart /> :
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={typeSlices} size={180} />
            </div>}
        </ChartCard>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 16, color: "var(--color-primary)" }}>
            Quick actions
          </h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button icon="users" onClick={() => router.push("/cells")}>
            View all cells
          </Button>
          <Button variant="secondary-light" icon="bar-chart-3" onClick={() => router.push("/leader/analytics")}>
            Open analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
