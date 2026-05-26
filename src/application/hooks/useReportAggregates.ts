"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { Cell } from "./useCells";

interface CellReportV2 {
  id?: string;
  date?: string;        // "2026-05-21"
  cellId?: string;
  cellType?: string;
  voided?: boolean;
  attendance?: Array<{ status?: string }>;
  satisfactionRate?: number;
  additionalVisitors?: number;
}

export interface WeeklyPoint {
  week: string;       // "2026-W18"
  reports: number;
  present: number;
  absent: number;
  rate: number;       // 0..1
}

export interface MeetingTypeSlice {
  type: string;
  count: number;
}

/** ISO week label for a given date string ("YYYY-MM-DD" or ISO datetime). */
function isoWeekLabel(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  // Move to nearest Thursday — ISO 8601 week starts on Monday, but week-of-year
  // is calculated relative to the Thursday of that week.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Aggregate weekly attendance + meeting-type breakdown from real cell reports.
 *
 * Strategy:
 *   1. For each cell in `cells`, GET /cells/:id/reports?limit=100
 *   2. Filter out voided reports.
 *   3. Bucket by ISO week → count attendance.
 *   4. Bucket by `cellType` (from the report, else fallback to the cell's type).
 *
 * This is a frontend fallback while the backend `/analytics/*` endpoints
 * aren't populating data.
 */
export function useReportAggregates(cells: Cell[] | undefined, { weeks = 8 }: { weeks?: number } = {}) {
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeSlice[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stabilise the deps — only refetch when the actual cell ID list changes.
  const cellsKey = (cells ?? []).map((c) => c.id).sort().join("|");

  useEffect(() => {
    if (!cells || cells.length === 0) {
      setWeekly([]); setMeetingTypes([]); setTotalReports(0); return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Parallel-fetch reports for each cell.
        const buckets = await Promise.all(
          cells.map(async (c) => {
            try {
              const res = await apiRequest<{ items?: CellReportV2[] } | CellReportV2[]>(
                `/cells/${c.id}/reports?limit=100`,
              );
              const items = Array.isArray(res) ? res : (res.items ?? []);
              return items.map((r) => ({ ...r, cellId: r.cellId ?? c.id, cellType: r.cellType ?? c.type }));
            } catch (err) {
              if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) return [];
              return [];
            }
          }),
        );
        if (cancelled) return;
        const reports = buckets.flat().filter((r) => !r.voided);
        setTotalReports(reports.length);

        // ── Weekly bucket ────────────────────────────────────────────
        const weekMap = new Map<string, { reports: number; present: number; absent: number }>();
        for (const r of reports) {
          const wk = isoWeekLabel(r.date);
          if (!wk) continue;
          const bucket = weekMap.get(wk) ?? { reports: 0, present: 0, absent: 0 };
          bucket.reports += 1;
          for (const a of r.attendance ?? []) {
            if (a.status === "present") bucket.present += 1;
            else if (a.status === "absent") bucket.absent += 1;
          }
          weekMap.set(wk, bucket);
        }
        const sortedWeeks = Array.from(weekMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-weeks)
          .map(([week, b]) => {
            const total = b.present + b.absent;
            return { week, reports: b.reports, present: b.present, absent: b.absent, rate: total > 0 ? b.present / total : 0 };
          });
        setWeekly(sortedWeeks);

        // ── Meeting-type bucket ──────────────────────────────────────
        const typeMap = new Map<string, number>();
        for (const r of reports) {
          const t = (r.cellType ?? "other").toString();
          typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
        }
        setMeetingTypes(Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsKey, weeks]);

  return { weekly, meetingTypes, totalReports, loading };
}
