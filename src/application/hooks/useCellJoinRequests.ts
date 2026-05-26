"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

export interface CellJoinRequest {
  id: string;
  cellId: string;
  requesterUid: string;
  requesterName?: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  decidedByUid?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  decidedAt?: string | null;
}

function parseList(res: unknown): CellJoinRequest[] {
  if (Array.isArray(res)) return res as CellJoinRequest[];
  return ((res as { items?: CellJoinRequest[] }).items) ?? [];
}

/**
 * Member applies to join a cell (POST /cells/:id/join-requests).
 */
export async function applyToJoinCell(cellId: string, message?: string): Promise<CellJoinRequest> {
  return apiRequest<CellJoinRequest>(`/cells/${cellId}/join-requests`, {
    method: "POST",
    body: { message: message ?? null },
  });
}

/**
 * Admin: list + approve / reject join requests for a specific cell.
 */
export function useCellJoinRequests(cellId: string | undefined) {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<CellJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!cellId) return;
    setLoading(true);
    try {
      const res = await apiRequest<unknown>(
        `/cells/${cellId}/join-requests?status=pending&limit=100`,
      );
      setItems(parseList(res));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cellId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const approve = useCallback(async (rid: string, note = ""): Promise<void> => {
    if (!cellId) return;
    setProcessingId(rid);
    try {
      await apiRequest(`/cells/${cellId}/join-requests/${rid}/approve`, {
        method: "POST",
        body: { note },
      });
      dispatch(pushToast({ tone: "success", title: "Join request approved" }));
      fetchRequests();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Approval failed.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't approve", message: msg }));
    } finally {
      setProcessingId(null);
    }
  }, [cellId, dispatch, fetchRequests]);

  const reject = useCallback(async (rid: string, note: string): Promise<void> => {
    if (!cellId) return;
    setProcessingId(rid);
    try {
      await apiRequest(`/cells/${cellId}/join-requests/${rid}/reject`, {
        method: "POST",
        body: { note },
      });
      dispatch(pushToast({ tone: "success", title: "Join request rejected" }));
      fetchRequests();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Rejection failed.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't reject", message: msg }));
    } finally {
      setProcessingId(null);
    }
  }, [cellId, dispatch, fetchRequests]);

  return { items, loading, processingId, approve, reject, refetch: fetchRequests };
}
