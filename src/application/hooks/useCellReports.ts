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
