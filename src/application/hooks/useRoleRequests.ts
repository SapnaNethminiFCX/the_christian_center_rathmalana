"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "./useAppSelector";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

export interface RoleRequest {
  id: string;
  requesterUid?: string;
  requestedRole: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  decidedByUid?: string | null;   // actual backend field
  decisionByName?: string | null; // embedded by some backends
  decisionNote: string | null;
}

interface UseRoleRequestsResult {
  items: RoleRequest[];
  loading: boolean;
  /** The most recent student role request (any status). */
  latestStudent: RoleRequest | null;
  hasPendingStudent: boolean;
  refetch: () => void;
}

/**
 * Member-side hook — fetches GET /role-requests/mine.
 * Used on /apply/student, /apply/student/pending, /my-requests, and /home.
 */
export function useRoleRequests(): UseRoleRequestsResult {
  const user = useAppSelector((s) => s.session.user);
  const [items, setItems] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Backend may return { items: [...] } (V2 spec) or [...] (plain array).
      const res = await apiRequest<{ items?: RoleRequest[] } | RoleRequest[]>(
        "/role-requests/mine",
      );
      const list = Array.isArray(res)
        ? res
        : ((res as { items?: RoleRequest[] }).items ?? []);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const studentRequests = items.filter((r) => r.requestedRole === "student");
  const latestStudent = studentRequests.length
    ? studentRequests.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    : null;

  return {
    items,
    loading,
    latestStudent,
    hasPendingStudent: latestStudent?.status === "pending",
    refetch: fetchRequests,
  };
}

/**
 * Submit a new role request (POST /role-requests).
 * Returns the created request or throws ApiRequestError.
 */
export async function submitRoleRequest(
  requestedRole: "student",
): Promise<RoleRequest> {
  return apiRequest<RoleRequest>("/role-requests", {
    method: "POST",
    body: { requestedRole },
  });
}
