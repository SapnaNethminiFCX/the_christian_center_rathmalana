"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { EmptyChart } from "@/components/analytics/EmptyChart";
import {
  useCellsWeekly,
  useAttendance,
  useMeetingTypes,
  downloadAnalyticsCsv,
} from "@/application/hooks/useAnalytics";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";

const TYPE_COLORS: Record<string, string> = {
  care: "#1D4ED8",
  outreach: "#15803D",
  children: "#D97706",
  g12: "#7C3AED",
};

export default function LeaderAnalyticsPage() {
  const dispatch = useAppDispatch();
  const cellsWeekly = useCellsWeekly({ weeks: 12 });
  const attendance = useAttendance();
  const meetingTypes = useMeetingTypes();

  const attendanceBars = useMemo(
    () =>
      (Array.isArray(attendance.data) ? attendance.data : [])
        .slice(-12)
        .map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 })),
    [attendance.data],
  );

  const typeSlices = useMemo(
    () =>
      toMeetingTypeArray(meetingTypes.data).map((s) => ({
        label: s?.type ?? "unknown",
        value: s?.count ?? 0,
        color: TYPE_COLORS[s?.type ?? ""] ?? "#999",
      })),
    [meetingTypes.data],
  );

  const totalReports = useMemo(
    () => (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0),
    [cellsWeekly.data],
  );
  const totalAttendance = useMemo(
    () => (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.attendance ?? 0), 0),
    [cellsWeekly.data],
  );
  const avgRate = useMemo(() => {
    const arr = Array.isArray(attendance.data) ? attendance.data : [];
    if (arr.length === 0) return 0;
    return arr.reduce((s, p) => s + (p?.rate ?? 0), 0) / arr.length;
  }, [attendance.data]);

  const handleExport = async () => {
    try {
      await downloadAnalyticsCsv("attendance");
      dispatch(pushToast({ tone: "success", title: "Export started" }));
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Export failed" }));
    }
  };

  return (
    <div className="page">
      <header
        className="page-header"
        style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
            Analytics
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            How your cells are trending. Export a CSV for offline review.
          </p>
        </div>
        <Button variant="secondary-light" icon="download" onClick={handleExport}>
          Export CSV
        </Button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiMini label="Reports (12w)" value={totalReports} sub="Last 12 weeks" />
        <KpiMini label="Total attendance" value={totalAttendance} sub="Across all reports" />
        <KpiMini label="Avg rate" value={`${Math.round(avgRate * 100)}%`} sub="Present / invited" />
        <KpiMini label="Cell types" value={meetingTypes.data.length} sub="In your scope" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard title="Weekly attendance" sub="Present per ISO week">
          {attendance.loading ? <EmptyChart message="Loading…" /> :
            attendanceBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={attendanceBars} highlightIndex={attendanceBars.length - 1} />}
        </ChartCard>
        <ChartCard
          title="Meeting types"
          sub="Reports filed by cell type"
          legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}
        >
          {meetingTypes.loading ? <EmptyChart message="Loading…" /> :
            typeSlices.length === 0 ? <EmptyChart /> :
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={typeSlices} size={180} />
            </div>}
        </ChartCard>
      </div>
    </div>
  );
}

/** Tolerate missing/short week strings ("2026-W18" → "W18"). */
function weekLabel(w: unknown): string {
  if (typeof w !== "string" || w.length === 0) return "";
  return w.length >= 3 ? w.slice(-3) : w;
}

/** Meeting types may be array or object — coerce to array. */
function toMeetingTypeArray(d: unknown): Array<{ type: string; count: number }> {
  if (Array.isArray(d)) return d as Array<{ type: string; count: number }>;
  if (d && typeof d === "object") {
    return Object.entries(d as Record<string, unknown>).map(([type, count]) => ({
      type,
      count: typeof count === "number" ? count : Number(count) || 0,
    }));
  }
  return [];
}
