"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

export interface Batch {
  id: string;
  courseId: string;
  name: string;
  scheduledOpenAt: string | null;
  intakeStart: string;
  intakeEnd: string;
  capacity: number | null;
  state: "draft" | "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface BatchInput {
  name: string;
  intakeStart: string;
  intakeEnd: string;
  capacity?: number | null;
  scheduledOpenAt?: string | null;
}

/**
 * Hook for managing batches on a specific course.
 * Covers GET /courses/:id/batches, POST, PATCH, open, close.
 */
export function useBatches(courseId: string | undefined) {
  const dispatch = useAppDispatch();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setFetchError(null);
    try {
      // Backend may return { items: Batch[] } or Batch[] directly.
      const res = await apiRequest<{ items: Batch[] } | Batch[]>(
        `/courses/${courseId}/batches`,
      );
      const list = Array.isArray(res) ? res : ((res as { items?: Batch[] }).items ?? []);
      setBatches(list);
    } catch (err) {
      // Don't wipe existing batches on failure — batches added this session stay visible.
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const createBatch = useCallback(async (input: BatchInput): Promise<boolean> => {
    if (!courseId) return false;
    setBusy("creating");
    try {
      const created = await apiRequest<Batch>(`/courses/${courseId}/batches`, {
        method: "POST",
        body: input,
      });
      // Show immediately from POST response, then sync from GET in background.
      setBatches((prev) => [...prev, created]);
      dispatch(pushToast({ tone: "success", title: "Batch created" }));
      void fetchBatches().catch(() => null);
      return true;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to create batch.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't create batch", message: msg }));
      return false;
    } finally {
      setBusy(null);
    }
  }, [courseId, dispatch, fetchBatches]);

  const updateBatch = useCallback(async (batchId: string, input: Partial<BatchInput>): Promise<boolean> => {
    setBusy(batchId);
    try {
      await apiRequest(`/batches/${batchId}`, { method: "PATCH", body: input });
      dispatch(pushToast({ tone: "success", title: "Batch updated" }));
      await fetchBatches();
      return true;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to update batch.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't update batch", message: msg }));
      return false;
    } finally {
      setBusy(null);
    }
  }, [dispatch, fetchBatches]);

  const openBatch = useCallback(async (batchId: string): Promise<void> => {
    setBusy(batchId);
    try {
      await apiRequest(`/batches/${batchId}/open`, { method: "POST" });
      dispatch(pushToast({ tone: "success", title: "Batch opened" }));
      await fetchBatches();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to open batch.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't open batch", message: msg }));
    } finally {
      setBusy(null);
    }
  }, [dispatch, fetchBatches]);

  const closeBatch = useCallback(async (batchId: string): Promise<void> => {
    setBusy(batchId);
    try {
      await apiRequest(`/batches/${batchId}/close`, { method: "POST" });
      dispatch(pushToast({ tone: "success", title: "Batch closed" }));
      await fetchBatches();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to close batch.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't close batch", message: msg }));
    } finally {
      setBusy(null);
    }
  }, [dispatch, fetchBatches]);

  return { batches, loading, fetchError, busy, createBatch, updateBatch, openBatch, closeBatch, refetch: fetchBatches };
}
