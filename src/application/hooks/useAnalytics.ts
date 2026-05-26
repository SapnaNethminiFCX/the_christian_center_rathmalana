"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

/**
 * Sprint 8 — Analytics hooks.
 *
 * One function per chart endpoint. Backend scopes the response based on the
 * caller's roles:
 *   - Leader  → own cells only
 *   - G12     → own network
 *   - Admin   → org-wide
 *   - Super   → org-wide
 *
 * All hooks share the same return shape: { data, scope, loading, error, refresh }.
 *
 * Empty / undefined data is normalised to an empty array so callers never
 * have to defend against `data?.length`.
 */

export type AnalyticsScope = "leader" | "g12" | "admin" | "super_admin" | "unknown";

interface BaseResponse<T> {
  data: T;
  scope?: AnalyticsScope;
}

type ChartName =
  | "cells/weekly"
  | "attendance"
  | "meeting-types"
  | "growth"
  | "participation";

interface UseChartState<T> {
  data: T;
  scope: AnalyticsScope;
  loading: boolean;
  error: { status: number; code: string } | null;
  refresh: () => Promise<void>;
}

/** Generic fetcher. Handles `{data, scope}` envelope and raw-array shapes. */
function useAnalyticsEndpoint<T>(
  path: string,
  empty: T,
  enabled: boolean,
): UseChartState<T> {
  const dispatch = useAppDispatch();
  const [data, setData] = useState<T>(empty);
  const [scope, setScope] = useState<AnalyticsScope>("unknown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ status: number; code: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<BaseResponse<T> | T>(path);
      // Common backend envelopes: {data,scope}, {items:[]}, raw array, null
      let next: T = empty;
      if (res == null) {
        next = empty;
      } else if (Array.isArray(res)) {
        next = res as unknown as T;
      } else if (typeof res === "object") {
        const obj = res as { data?: T; items?: T; scope?: AnalyticsScope };
        if (obj.data !== undefined) {
          next = obj.data ?? empty;
          setScope(obj.scope ?? "unknown");
        } else if (Array.isArray(obj.items)) {
          next = obj.items as unknown as T;
        } else {
          next = res as T;
        }
      } else {
        next = (res as T) ?? empty;
      }
      setData(next ?? empty);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError({ status: err.status, code: err.code });
        if (err.status === 403) {
          dispatch(pushToast({ tone: "warning", title: "No access", message: "You don't have permission to view this analytic." }));
        } else if (err.status !== 401 && err.status !== 404) {
          dispatch(pushToast({ tone: "warning", title: "Couldn't load analytics" }));
        }
      }
    } finally {
      setLoading(false);
    }
    // empty is a stable sentinel passed by caller — exclude from deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, dispatch]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
  }, [fetchData, enabled]);

  return { data, scope, loading, error, refresh: fetchData };
}

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface WeeklyPoint {
  week: string;        // ISO week, e.g. "2026-W18"
  reports: number;
  attendance: number;
}

export interface AttendancePoint {
  week: string;
  present: number;
  absent: number;
  rate: number;        // 0-1
}

export interface MeetingTypeSlice {
  type: "g12" | "care" | "children" | "outreach" | string;
  count: number;
}

export interface GrowthPoint {
  week: string;
  members: number;
  delta: number;
}

export interface ParticipationRow {
  cellId: string;
  cellName: string;
  reportsFiled: number;
  attendanceAvg: number;
}

// ── Hooks (one per chart) ─────────────────────────────────────────────────────

/** GET /analytics/cells/weekly?weeks=12 — reports + attendance per ISO week */
export function useCellsWeekly({ weeks = 12, enabled = true }: { weeks?: number; enabled?: boolean } = {}) {
  return useAnalyticsEndpoint<WeeklyPoint[]>(
    `/analytics/cells/weekly?weeks=${weeks}`,
    [] as WeeklyPoint[],
    enabled,
  );
}

/** GET /analytics/attendance?from=&to= — present/absent breakdown per week */
export function useAttendance({ from, to, enabled = true }: { from?: string; to?: string; enabled?: boolean } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  return useAnalyticsEndpoint<AttendancePoint[]>(
    `/analytics/attendance${q ? `?${q}` : ""}`,
    [] as AttendancePoint[],
    enabled,
  );
}

/** GET /analytics/meeting-types — count of reports by cell type */
export function useMeetingTypes({ enabled = true }: { enabled?: boolean } = {}) {
  return useAnalyticsEndpoint<MeetingTypeSlice[]>(
    `/analytics/meeting-types`,
    [] as MeetingTypeSlice[],
    enabled,
  );
}

/** GET /analytics/growth?weeks=12 — running member count + weekly delta */
export function useGrowth({ weeks = 12, enabled = true }: { weeks?: number; enabled?: boolean } = {}) {
  return useAnalyticsEndpoint<GrowthPoint[]>(
    `/analytics/growth?weeks=${weeks}`,
    [] as GrowthPoint[],
    enabled,
  );
}

/** GET /analytics/participation — per-cell participation summary */
export function useParticipation({ enabled = true }: { enabled?: boolean } = {}) {
  return useAnalyticsEndpoint<ParticipationRow[]>(
    `/analytics/participation`,
    [] as ParticipationRow[],
    enabled,
  );
}

// ── Export helper (used by Sprint 8 branch 2, but place here for cohesion) ────

/**
 * Trigger a CSV download for the given chart.
 * Calls GET /analytics/:chart/export?<filters> with Accept: text/csv.
 */
export async function downloadAnalyticsCsv(
  chart: ChartName,
  filters: Record<string, string | number | undefined> = {},
): Promise<void> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const q = params.toString();
  const path = `/analytics/${chart}/export${q ? `?${q}` : ""}`;

  // apiRequest returns parsed JSON by default — for CSV we need the raw blob.
  // Build the URL manually with the existing tokenService.
  const { tokenService } = await import("@/infrastructure/firebase/tokenService");
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const token = await tokenService.get();
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      Accept: "text/csv",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeChart = chart.replace("/", "-");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `analytics-${safeChart}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
