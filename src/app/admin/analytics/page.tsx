"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { KpiMini } from "@/components/analytics/KpiMini";
import { ChartCard } from "@/components/analytics/ChartCard";
import { WeeklyAttendanceBars } from "@/components/analytics/WeeklyAttendanceBars";
import { MeetingTypeDonut } from "@/components/analytics/MeetingTypeDonut";
import { MemberGrowthLine } from "@/components/analytics/MemberGrowthLine";
import { EmptyChart } from "@/components/analytics/EmptyChart";
import {
  useCellsWeekly,
  useAttendance,
  useMeetingTypes,
  useGrowth,
  useParticipation,
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

/**
 * Admin analytics — org-wide scope. Backend derives scope from caller's role,
 * so the same hooks return org-wide data when an admin / super_admin calls them.
 */
export default function AdminAnalyticsPage() {
  const dispatch = useAppDispatch();
  const cellsWeekly = useCellsWeekly({ weeks: 12 });
  const attendance = useAttendance();
  const meetingTypes = useMeetingTypes();
  const growth = useGrowth({ weeks: 12 });
  const participation = useParticipation();

  const attendanceBars = useMemo(
    () =>
      (Array.isArray(attendance.data) ? attendance.data : [])
        .slice(-12)
        .map((p) => ({ label: weekLabel(p?.week), value: p?.present ?? 0 })),
    [attendance.data],
  );
  const cellsBars = useMemo(
    () =>
      (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : [])
        .slice(-12)
        .map((p) => ({ label: weekLabel(p?.week), value: p?.reports ?? 0 })),
    [cellsWeekly.data],
  );
  const growthPoints = useMemo(
    () =>
      (Array.isArray(growth.data) ? growth.data : []).map((p) => ({
        label: weekLabel(p?.week),
        value: p?.members ?? 0,
      })),
    [growth.data],
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

  const growthArr = Array.isArray(growth.data) ? growth.data : [];
  const totalMembers = growthArr.at(-1)?.members ?? 0;
  const totalReports = useMemo(
    () => (Array.isArray(cellsWeekly.data) ? cellsWeekly.data : []).reduce((s, p) => s + (p?.reports ?? 0), 0),
    [cellsWeekly.data],
  );
  const avgRate = useMemo(() => {
    const arr = Array.isArray(attendance.data) ? attendance.data : [];
    if (arr.length === 0) return 0;
    return arr.reduce((s, p) => s + (p?.rate ?? 0), 0) / arr.length;
  }, [attendance.data]);

  const handleExport = async (chart: "attendance" | "growth" | "cells/weekly") => {
    try {
      await downloadAnalyticsCsv(chart);
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
            Organisation analytics
          </h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Aggregated trends across every cell, leader, and member at TCCR.
          </p>
        </div>
        <Button variant="secondary-light" icon="download" onClick={() => handleExport("attendance")}>
          Export attendance
        </Button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiMini label="Total members" value={totalMembers} sub="Latest count" />
        <KpiMini label="Cells reporting" value={participation.data.length} sub="With activity" />
        <KpiMini label="Reports (12w)" value={totalReports} sub="Last 12 weeks" />
        <KpiMini label="Attendance rate" value={`${Math.round(avgRate * 100)}%`} sub="Present / invited" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard title="Member growth" sub="Cumulative across TCCR">
          {growth.loading ? <EmptyChart message="Loading…" /> :
            growthPoints.length < 2 ? <EmptyChart /> :
            <MemberGrowthLine points={growthPoints} height={200} />}
        </ChartCard>
        <ChartCard title="Meeting types" sub="Reports by cell type" legend={typeSlices.map((s) => ({ label: s.label, color: s.color }))}>
          {meetingTypes.loading ? <EmptyChart message="Loading…" /> :
            typeSlices.length === 0 ? <EmptyChart /> :
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <MeetingTypeDonut slices={typeSlices} size={180} />
            </div>}
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <ChartCard title="Weekly attendance" sub="Present per week, org-wide">
          {attendance.loading ? <EmptyChart message="Loading…" /> :
            attendanceBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={attendanceBars} highlightIndex={attendanceBars.length - 1} />}
        </ChartCard>
        <ChartCard title="Cells reporting" sub="Reports filed per week">
          {cellsWeekly.loading ? <EmptyChart message="Loading…" /> :
            cellsBars.length === 0 ? <EmptyChart /> :
            <WeeklyAttendanceBars bars={cellsBars} highlightIndex={cellsBars.length - 1} />}
        </ChartCard>
      </div>

      <h3 style={{ margin: "24px 0 12px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>
        Participation per cell
      </h3>
      <div className="tbl-card" style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 14 }}>
          <thead style={{ background: "var(--color-stroke-2)" }}>
            <tr>
              <th style={thStyle()}>Cell</th>
              <th style={thStyle()}>Reports filed</th>
              <th style={thStyle()}>Avg attendance</th>
            </tr>
          </thead>
          <tbody>
            {participation.loading ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: "center", color: "var(--color-muted)" }}>Loading…</td></tr>
            ) : participation.data.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: "center", color: "var(--color-muted)" }}>No participation data yet.</td></tr>
            ) : participation.data.map((p) => (
              <tr key={p.cellId} style={{ borderTop: "1px solid var(--color-stroke-2)" }}>
                <td style={tdStyle()}>{p.cellName}</td>
                <td style={tdStyle()}>{p.reportsFiled}</td>
                <td style={tdStyle()}>{p.attendanceAvg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tolerate missing/short week strings from the backend ("2026-W18" → "W18"). */
function weekLabel(w: unknown): string {
  if (typeof w !== "string" || w.length === 0) return "";
  return w.length >= 3 ? w.slice(-3) : w;
}

/**
 * Meeting-types may arrive as an array `[{type, count}]` OR as an object
 * `{care: 12, outreach: 5}`. Normalise to the array form callers expect.
 */
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

function thStyle(): React.CSSProperties {
  return { textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-body-green)", textTransform: "uppercase", letterSpacing: "0.04em" };
}
function tdStyle(): React.CSSProperties {
  return { padding: "14px 16px", color: "var(--color-primary)" };
}
