"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { API_PREFIX, apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { tokenService } from "@/infrastructure/firebase/tokenService";

export interface AttendanceEntry {
  userUid?: string;
  name: string;
  status: "present" | "absent" | "new";
  isNew: boolean;
}

export interface CellReportData {
  date: string;
  didMeet: boolean;
  noMeetReason?: string | null;
  leaderPresent?: boolean;
  conductedByIfAbsent?: string | null;
  location?: string;
  timeStarted?: string;
  timeEnded?: string;
  language?: "si" | "ta" | "en";
  subjectDiscussed?: "sunday_sermon" | "other";
  otherSubjectReason?: string | null;
  cellType?: string;
  g12LeaderUid?: string;
  immediateG12LeaderText?: string | null;
  attendance?: AttendanceEntry[];
  contactedAbsentees?: "yes" | "no" | "future";
  absenteeNotes?: string | null;
  additionalVisitors?: number;
  childrenCount?: number;
  satisfactionRate?: number;
  additionalInfo?: string | null;
  photoUrls?: string[];
}

export interface CellReport extends CellReportData {
  id: string;
  cellId: string;
  filledByUid: string;
  voided: boolean;
  createdAt: string;
}

function parseList(res: unknown): CellReport[] {
  if (Array.isArray(res)) return res as CellReport[];
  return ((res as { items?: CellReport[] }).items) ?? [];
}

/**
 * Fetch past reports for a cell (GET /cells/:id/reports).
 */
export function useCellReports(cellId: string | undefined, showVoided = false) {
  const [reports, setReports] = useState<CellReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!cellId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "50" });
      if (showVoided) qs.set("voided", "true");
      const res = await apiRequest<unknown>(`/cells/${cellId}/reports?${qs}`);
      setReports(parseList(res));
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [cellId, showVoided]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}

/**
 * Fetch a single report (GET /cells/:id/reports/:rid).
 */
export function useCellReport(cellId: string | undefined, reportId: string | undefined) {
  const [report, setReport] = useState<CellReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cellId || !reportId) return;
    setLoading(true);
    apiRequest<CellReport>(`/cells/${cellId}/reports/${reportId}`)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [cellId, reportId]);

  return { report, loading };
}

/**
 * Upload report photos before filing (POST /cells/:id/report-photos).
 * Returns public URLs to embed in the report data.
 */
export async function uploadReportPhotos(
  cellId: string,
  files: File[],
): Promise<string[]> {
  const token = await tokenService.get();
  const locale = (typeof localStorage !== "undefined" ? localStorage.getItem("edupath.locale") : null) ?? "en";
  const form = new FormData();
  files.forEach((f) => form.append("photos", f));
  const res = await fetch(`${API_PREFIX}/cells/${cellId}/report-photos`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Accept-Language": locale,
    },
    body: form,
  });
  if (!res.ok) throw new Error("Photo upload failed");
  const json = await res.json() as { photoUrls: string[] };
  return json.photoUrls ?? [];
}

/**
 * File a cell report (POST /cells/:id/reports).
 * Sends data as JSON string + optional photos as multipart.
 * Requires X-Idempotency-Key header.
 */
export async function fileCellReport(
  cellId: string,
  data: CellReportData,
  idempotencyKey: string,
): Promise<CellReport> {
  const token = await tokenService.get();
  const locale = (typeof localStorage !== "undefined" ? localStorage.getItem("edupath.locale") : null) ?? "en";

  const form = new FormData();
  form.append("data", JSON.stringify(data));

  const res = await fetch(`${API_PREFIX}/cells/${cellId}/reports`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Accept-Language": locale,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Failed to file report (${res.status})`);
  }
  return res.json() as Promise<CellReport>;
}

/**
 * Edit a cell report (PATCH /cells/:id/reports/:rid).
 *
 * V2 spec §14.5 — only the original filer or a super_admin can edit, and
 * only within 24 hours of the original `createdAt`. After that the backend
 * returns 422 EDIT_WINDOW_EXPIRED.
 *
 * Editable fields: location, satisfactionRate, additionalInfo, attendance.
 */
export interface ReportEditPayload {
  location?: string;
  satisfactionRate?: number;
  additionalInfo?: string | null;
  attendance?: AttendanceEntry[];
}

export function useEditReport() {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const editReport = async (
    cellId: string,
    reportId: string,
    payload: ReportEditPayload,
  ): Promise<CellReport | null> => {
    // Reject empty payloads on the client too — backend will return 400 but
    // saves a round trip.
    if (Object.keys(payload).length === 0) {
      dispatch(pushToast({ tone: "warning", title: "Nothing to update" }));
      return null;
    }
    setBusy(true);
    try {
      const updated = await apiRequest<CellReport>(
        `/cells/${cellId}/reports/${reportId}`,
        { method: "PATCH", body: payload },
      );
      dispatch(pushToast({ tone: "success", title: "Report updated" }));
      return updated;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        // 422 is the headline one — past 24h, report becomes read-only.
        if (err.code === "EDIT_WINDOW_EXPIRED" || err.status === 422) {
          dispatch(pushToast({
            tone: "warning",
            title: "Editing window closed",
            message: "Reports can only be edited within 24 hours of filing.",
          }));
        } else if (err.code === "REPORT_ALREADY_VOIDED" || err.status === 409) {
          dispatch(pushToast({
            tone: "warning",
            title: "Report voided",
            message: "Voided reports cannot be edited.",
          }));
        } else if (err.status === 403) {
          dispatch(pushToast({
            tone: "warning",
            title: "Not permitted",
            message: "Only the original filer or a super admin can edit this report.",
          }));
        } else if (err.status === 404) {
          dispatch(pushToast({
            tone: "warning",
            title: "Not found",
            message: err.code === "CELL_NOT_FOUND" ? "Cell no longer exists." : "Report no longer exists.",
          }));
        } else if (err.status === 400) {
          dispatch(pushToast({
            tone: "warning",
            title: "Validation error",
            message: err.message || "Please check the fields and try again.",
          }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Couldn't update report", message: err.message }));
        }
      } else {
        dispatch(pushToast({ tone: "warning", title: "Couldn't update report" }));
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { editReport, busy };
}

/** True if the report was filed within the last 24 hours (edit window). */
export function isWithinEditWindow(createdAt: string): boolean {
  if (!createdAt) return false;
  const filedAt = new Date(createdAt).getTime();
  if (Number.isNaN(filedAt)) return false;
  const elapsedMs = Date.now() - filedAt;
  return elapsedMs >= 0 && elapsedMs < 24 * 60 * 60 * 1000;
}

/** Remaining seconds in the edit window, or 0 if expired. */
export function editWindowSecondsRemaining(createdAt: string): number {
  if (!createdAt) return 0;
  const filedAt = new Date(createdAt).getTime();
  if (Number.isNaN(filedAt)) return 0;
  const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - filedAt);
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Void a cell report (POST /cells/:id/reports/:rid/void).
 */
export function useVoidReport() {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const voidReport = async (cellId: string, reportId: string, reason: string): Promise<boolean> => {
    setBusy(true);
    try {
      await apiRequest(`/cells/${cellId}/reports/${reportId}/void`, {
        method: "POST",
        body: { reason },
      });
      dispatch(pushToast({ tone: "success", title: "Report voided" }));
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "REPORT_ALREADY_VOIDED") {
        dispatch(pushToast({ tone: "warning", title: "Already voided" }));
      } else {
        dispatch(pushToast({ tone: "warning", title: "Couldn't void report" }));
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { voidReport, busy };
}
