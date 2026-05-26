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
    if (obj.breakdown && typeof obj.breakdown === "object") {
      return toMeetingTypeArray(obj.breakdown);
    }
    const entries = Object.entries(obj).filter(([k]) => KNOWN_CELL_TYPES.has(k));
    if (entries.length === 0) return [];
    return entries.map(([type, count]) => ({
      type,
      count: typeof count === "number" ? count : Number(count) || 0,
    }));
  }
  return [];
}

export default function LeaderDashboardPage() {
  const router = useRouter();
  const { cells: myCells, loading: cellsLoading } = useMyCells();
  const cellsWeekly = useCellsWeekly({ weeks: 8 });
  const attendance = useAttendance();
  const meetingTypes = useMeetingTypes();
  // Fallback aggregates derived from real cell reports — used when the
  // backend's /analytics/* endpoints return empty.
  const aggregates = useReportAggregates(myCells, { weeks: 8 });

  const totalMembers = useMemo(
    () => (Array.isArray(myCells) ? myCells : []).reduce((s, c) => s + (c.memberCount ?? 0), 0),
    [myCells],
  );

  // Total reports filed across the leader's cells. `cell.reportCount` is the
  // authoritative source from /cells/mine; the analytics endpoint is used as
  // a fallback if cells haven't loaded yet.
  const totalReports = useMemo(() => {
    const fromCells = (Array.isArray(myCells) ? myCells : []).reduce((s, c) => s + (c.reportCount ?? 0), 0);
    if (fromCells > 0) return fromCells;
    return (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0);
  }, [myCells, cellsWeekly.data]);

  // Prefer backend analytics when populated; fall back to client-side
  // aggregates computed from real cell reports — both when empty AND when the
  // API returns zero-only data (backend shipping shape before aggregation).
  const weeklyBars = useMemo(() => {
    const fromApi = Array.isArray(attendance.data) ? attendance.data : [];
    const apiTotal = fromApi.reduce((s, x) => s + (x?.present ?? 0) + (x?.absent ?? 0), 0);
    const source = apiTotal > 0 ? fromApi : aggregates.weekly;
    return source.slice(-8).map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 }));
  }, [attendance.data, aggregates.weekly]);

  const typeSlices = useMemo(() => {
    const fromApi = toMeetingTypeArray(meetingTypes.data);
    const apiTotal = fromApi.reduce((s, x) => s + (x.count ?? 0), 0);
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
            Leader Dashboard
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Cells you lead at a glance. Filed reports, attendance, and meeting types.
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiMini label="My cells" value={cellsLoading ? "…" : myCells.length} sub="Active cells" />
        <KpiMini label="Total members" value={cellsLoading ? "…" : totalMembers} sub="Across cells" />
        <KpiMini label="Reports filed" value={cellsLoading ? "…" : totalReports} sub="Across your cells" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard
          title="Weekly attendance"
          sub="Members present across all cells over the last 8 weeks"
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
          {(meetingTypes.loading || aggregates.loading) && typeSlices.length === 0 ? <EmptyChart message="Loading…" /> :
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
