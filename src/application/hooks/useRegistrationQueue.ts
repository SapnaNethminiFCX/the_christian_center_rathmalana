"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest } from "@/infrastructure/api/request";
import { auth } from "@/infrastructure/firebase/auth";

export interface RegistrationItem {
  id: string;
  studentUid: string;
  firstName: string;
  lastName: string;
  email: string;
  /** API v1.2: renamed from `status` */
  state?: string;
  /** Kept for backward-compat in case server still sends the old name. */
  status?: string;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Read either `state` (new) or `status` (legacy) from a registration row. */
function getRegState(r: RegistrationItem): string | undefined {
  return r.state ?? r.status;
}

interface PagedResponse {
  items: RegistrationItem[];
  nextCursor: string | null;
  total: number;
}

export type DateRange = "1h" | "24h" | "7d" | "30d" | "all";

const PAGE_SIZE = 25;
const FETCH_PAGE_SIZE = 100; // Max allowed by API per request
const MAX_PAGES_TO_FETCH = 20; // Safety: cap at 2000 items total

const DATE_RANGE_MS: Record<Exclude<DateRange, "all">, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/_/g, "");
export const isPending  = (s: string | null | undefined) => norm(s).includes("pending");
export const isApproved = (s: string | null | undefined) => norm(s).includes("approved");
export const isRejected = (s: string | null | undefined) => norm(s).includes("rejected");

function getSubmittedAt(r: RegistrationItem): string | undefined {
  // API v1.2 uses createdAt; older versions may still send submittedAt
  return r.createdAt ?? (r as unknown as { submittedAt?: string }).submittedAt;
}

function getTimestamp(r: RegistrationItem): number {
  const value = getSubmittedAt(r);
  if (!value) return 0;
  const d = new Date(value).getTime();
  return isNaN(d) ? 0 : d;
}

export function useRegistrationQueue() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);

  const [allItems, setAllItems] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch the ENTIRE queue across all pages — search/filter happens client-side
  // because the backend does not support a `q` parameter on this endpoint.
  const fetchAll = useCallback(
    async () => {
      setLoading(true);
      try {
        const collected: RegistrationItem[] = [];
        let cursor: string | undefined = undefined;
        let totalCount = 0;
        let pageNo = 0;

        do {
          const params = new URLSearchParams({ limit: String(FETCH_PAGE_SIZE), status: "pending" });
          if (cursor) params.append("cursor", cursor);
          const data: PagedResponse = await apiRequest<PagedResponse>(`/admin/registrations?${params}`);
          collected.push(...(data.items ?? []));
          totalCount = data.total ?? collected.length;
          cursor = data.nextCursor ?? undefined;
          pageNo += 1;
        } while (cursor && pageNo < MAX_PAGES_TO_FETCH);

        setAllItems(collected);
        setTotal(totalCount);
        setSelected(new Set());
        setPage(0);
        // NOTE: This V1 hook does NOT drive the sidebar `pendingRegistrations`
        // badge anymore — the V2 endpoint `/role-requests` is the source of
        // truth (see `useSidebarCounts` + `useRoleRequestQueue`). The V1
        // endpoint returns stale registrations and would otherwise overwrite
        // the correct count when admins land on the dashboard.
      } catch {
        dispatch(pushToast({ tone: "warning", title: "Failed to load registrations" }));
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!user || !auth.currentUser) return;
    fetchAll();
  }, [fetchAll, user]);

  // Reset to page 0 whenever search or date filter changes.
  useEffect(() => {
    setPage(0);
  }, [search, dateRange]);

  // Sort newest first, apply date filter, then client-side search filter.
  const sortedFiltered = useMemo(() => {
    let arr = [...allItems].sort((a, b) => getTimestamp(b) - getTimestamp(a));
    if (dateRange !== "all") {
      const cutoff = Date.now() - DATE_RANGE_MS[dateRange];
      arr = arr.filter((r) => getTimestamp(r) >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        `${r.firstName ?? ""} ${r.lastName ?? ""}`.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
  }, [allItems, dateRange, search]);

  // Client-side pagination — slice the sorted/filtered list.
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = sortedFiltered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const isRowPending = (r: RegistrationItem) => {
    const s = getRegState(r);
    if (isApproved(s)) return false;
    if (isRejected(s)) return false;
    return true;
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const pendingIds = visibleItems.filter(isRowPending).map((r) => r.id);
    const allChecked = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
    setSelected(allChecked ? new Set() : new Set(pendingIds));
  };

  const allChecked =
    visibleItems.filter(isRowPending).length > 0 &&
    visibleItems.filter(isRowPending).every((r) => selected.has(r.id));

  const refresh = () => fetchAll();

  const updateStatus = (id: string, newState: string) => {
    setAllItems((prev) => {
      // V1 hook: no sidebar dispatch (see fetchAll note).
      return prev.map((r) => (r.id === id ? { ...r, state: newState, status: newState } : r));
    });
  };

  const approve = async (id: string) => {
    try {
      await apiRequest(`/admin/registrations/${id}/approve`, { method: "POST" });
      updateStatus(id, "approved");
      dispatch(pushToast({ tone: "success", title: "Registration approved", message: "The student has been notified." }));
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Approval failed", message: "This registration may have already been processed." }));
    }
  };

  const reject = async (id: string, reason?: string) => {
    try {
      await apiRequest(`/admin/registrations/${id}/reject`, {
        method: "POST",
        body: reason ? { reason } : undefined,
      });
      updateStatus(id, "rejected");
      dispatch(pushToast({ tone: "warning", title: "Registration rejected", message: "The student has been notified." }));
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Rejection failed" }));
    }
  };

  const bulkApprove = async () => {
    const ids = [...selected].filter((id) => visibleItems.find((r) => r.id === id && isRowPending(r)));
    if (!ids.length) return;
    try {
      const result = await apiRequest<{ approved: string[]; failed: { id: string; reason: string }[] }>(
        "/admin/registrations/bulk-approve",
        { method: "POST", body: { ids } },
      );
      setAllItems((prev) =>
        prev.map((r) => (result.approved.includes(r.id) ? { ...r, state: "approved", status: "approved" } : r)),
      );
      setSelected(new Set());
      const approvedCount = result.approved.length;
      if (result.failed.length === 0) {
        dispatch(pushToast({ tone: "success", title: `${approvedCount} registrations approved` }));
      } else {
        dispatch(pushToast({
          tone: "warning",
          title: `${approvedCount} approved · ${result.failed.length} failed`,
          message: "Some registrations were already processed.",
        }));
      }
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Bulk approve failed" }));
    }
  };

  return {
    items: visibleItems,
    loading,
    total,
    totalPages,
    page: safePage,
    setPage,
    search,
    setSearch,
    dateRange,
    setDateRange,
    selected,
    toggle,
    toggleAll,
    allChecked,
    isRowPending,
    approve,
    reject,
    bulkApprove,
    refresh,
    nextPage: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
    hasNext: safePage < totalPages - 1,
    hasPrev: safePage > 0,
  };
}
