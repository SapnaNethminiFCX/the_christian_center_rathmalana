"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast, setPendingRegistrations } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

export interface RoleRequestQueueItem {
  id: string;
  requesterUid: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRoles?: string[];   // current roles from GET /users/:uid
  requesterPhone?: string;     // if backend provides it
  requestedRole: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  decisionByName: string | null;
  decisionNote: string | null;
}

interface QueueState {
  items: RoleRequestQueueItem[];
  total: number;
  nextCursor: string | null;
  loading: boolean;
  status: "pending" | "approved" | "rejected";
  search: string;
}

/**
 * Admin-side hook for the role-requests approval queue.
 * Replaces the V1 useRegistrationQueue (which called /admin/registrations).
 */
export function useRoleRequestQueue() {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<QueueState>({
    items: [],
    total: 0,
    nextCursor: null,
    loading: true,
    status: "pending",
    search: "",
  });
  // All enriched items before search filtering — kept so search/clear never
  // triggers a re-fetch.
  const [allEnriched, setAllEnriched] = useState<RoleRequestQueueItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Apply client-side search to allEnriched and update visible items.
  const applySearch = useCallback((items: RoleRequestQueueItem[], q: string) => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? items.filter((item) => {
          const name  = (item.requesterName  ?? "").toLowerCase();
          const email = (item.requesterEmail ?? "").toLowerCase();
          const role  = (item.requestedRole  ?? "").toLowerCase();
          return name.includes(term) || email.includes(term) || role.includes(term);
        })
      : items;
    setState((s) => ({ ...s, items: filtered, total: filtered.length, search: q }));
  }, []);

  const fetchQueue = useCallback(
    async (overrides?: Partial<Pick<QueueState, "status">>) => {
      // Only status changes need a re-fetch; search is client-side only.
      setState((s) => {
        const next = { ...s, loading: true, ...(overrides ?? {}) };
        return next;
      });
      const status = overrides?.status ?? state.status;
      const search = state.search;
      try {
        const params = new URLSearchParams({ status, limit: "20" });
        if (search) params.set("search", search);
        const res = await apiRequest<{
          items: RoleRequestQueueItem[];
          total: number;
          nextCursor: string | null;
        }>(`/role-requests?${params}`);

        // Enrich each request with name, email, roles, phone from GET /users/:uid
        // because the backend doesn't embed them in the role-request response.
        const enriched = await Promise.all(
          (res.items ?? []).map(async (item) => {
            try {
              const user = await apiRequest<{
                firstName?: string;
                lastName?: string;
                email?: string;
                roles?: string[];
                phone?: string;
              }>(`/users/${item.requesterUid}`);
              const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
              return {
                ...item,
                requesterName:  fullName || item.requesterName,
                requesterEmail: user.email ?? item.requesterEmail,
                requesterRoles: user.roles ?? [],
                requesterPhone: user.phone ?? undefined,
              };
            } catch {
              return item;
            }
          }),
        );

        // Store all enriched items so search/clear can filter without re-fetch.
        setAllEnriched(enriched);

        const q = search.trim().toLowerCase();
        const filtered = q
          ? enriched.filter((item) => {
              const name  = (item.requesterName  ?? "").toLowerCase();
              const email = (item.requesterEmail ?? "").toLowerCase();
              const role  = (item.requestedRole  ?? "").toLowerCase();
              return name.includes(q) || email.includes(q) || role.includes(q);
            })
          : enriched;

        setState((s) => ({
          ...s,
          items: filtered,
          total: filtered.length,
          nextCursor: res.nextCursor ?? null,
          loading: false,
          status,
          search,
        }));

        // Drive the sidebar "Role Requests" badge. The badge tracks the
        // Member→Student approval queue specifically, so count enriched items
        // with status=pending AND requestedRole=student.
        if (status === "pending") {
          const studentPending = enriched.filter(
            (it) => it.status === "pending" && (it.requestedRole ?? "").toLowerCase() === "student",
          ).length;
          dispatch(setPendingRegistrations(studentPending));
        }
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [state],
  );

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = useCallback(
    async (id: string, note = "") => {
      setProcessingId(id);
      try {
        await apiRequest(`/role-requests/${id}/approve`, {
          method: "POST",
          body: { note },
        });
        dispatch(pushToast({ tone: "success", title: "Role request approved" }));
        fetchQueue();
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : "Approval failed.";
        dispatch(pushToast({ tone: "warning", title: "Couldn't approve", message: msg }));
      } finally {
        setProcessingId(null);
      }
    },
    [dispatch, fetchQueue],
  );

  const reject = useCallback(
    async (id: string, note: string) => {
      setProcessingId(id);
      try {
        await apiRequest(`/role-requests/${id}/reject`, {
          method: "POST",
          body: { note },
        });
        dispatch(pushToast({ tone: "success", title: "Role request rejected" }));
        fetchQueue();
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : "Rejection failed.";
        dispatch(pushToast({ tone: "warning", title: "Couldn't reject", message: msg }));
      } finally {
        setProcessingId(null);
      }
    },
    [dispatch, fetchQueue],
  );

  return {
    ...state,
    processingId,
    approve,
    reject,
    // Status change → re-fetch from API (different data set).
    setStatus: (status: QueueState["status"]) => fetchQueue({ status }),
    // Search change → client-side filter only, no re-fetch, no loading spinner.
    setSearch: (search: string) => applySearch(allEnriched, search),
    refetch: () => fetchQueue(),
  };
}
