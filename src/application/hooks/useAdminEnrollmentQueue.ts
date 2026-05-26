"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { pushToast, setPendingEnrollments } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { auth } from "@/infrastructure/firebase/auth";

export interface StudentProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl: string | null;
}

export interface EnrollmentItem {
  id: string;
  studentUid: string;
  courseId: string;
  state: string;
  reason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: StudentProfile; // enriched after fetch
  courseTitle?: string; // enriched after fetch
  [key: string]: unknown;
}

interface PagedResponse {
  items: EnrollmentItem[];
  nextCursor: string | null;
  total: number;
}

const PAGE_SIZE = 25;
const FETCH_PAGE_SIZE = 100;
const MAX_PAGES = 20;

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/_/g, "");
export const isPending  = (s: string | null | undefined) => norm(s).includes("pending");
export const isApproved = (s: string | null | undefined) => norm(s).includes("approved");
export const isRejected = (s: string | null | undefined) => norm(s).includes("rejected");

function getTimestamp(r: EnrollmentItem): number {
  const d = new Date(r.createdAt).getTime();
  return isNaN(d) ? 0 : d;
}

export type EnrollmentStatusFilter = "pending" | "approved" | "rejected" | "all";

export function useAdminEnrollmentQueue(courseIdFilter?: string) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);

  const [allItems, setAllItems] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatusFilter>("pending");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1 — fetch all enrollment pages (no status filter; filter pending client-side).
      const collected: EnrollmentItem[] = [];
      let cursor: string | undefined = undefined;
      let pageNo = 0;

      do {
        const params = new URLSearchParams({ limit: String(FETCH_PAGE_SIZE) });
        if (cursor) params.append("cursor", cursor);
        if (courseIdFilter) params.append("courseId", courseIdFilter);
        const data: PagedResponse = await apiRequest<PagedResponse>(`/enrollments?${params}`);
        collected.push(...(data.items ?? []));
        cursor = data.nextCursor ?? undefined;
        pageNo += 1;
      } while (cursor && pageNo < MAX_PAGES);

      // Step 2 — render the table immediately with raw rows. Don't make the
      // admin wait on the per-row enrichment fan-out (one request per unique
      // user + per unique course) before seeing anything. Loading flips off
      // here so the table appears with UIDs / "Course unavailable" placeholders
      // while step 3 runs in the background.
      setAllItems(collected);
      setTotal(collected.length);
      setSelected(new Set());
      setPage(0);
      const pendingTotal = collected.filter((e) => isPending(e.state)).length;
      dispatch(setPendingEnrollments(pendingTotal));
      setLoading(false);

      // Step 3 — enrich in parallel. We collect the failed IDs so we can retry
      // once after a short delay. This is the original source of the "names
      // show up after 3 minutes" bug: a transient failure here left the row
      // un-enriched until the admin manually clicked Refresh.
      const uniqueUids = [...new Set(collected.map((e) => e.studentUid))];
      const uniqueCourseIds = [...new Set(collected.map((e) => e.courseId))];
      const profileMap = new Map<string, StudentProfile>();
      const courseTitleMap = new Map<string, string>();

      const fetchProfile = async (uid: string) => {
        try {
          const profile = await apiRequest<StudentProfile>(`/users/${uid}`);
          profileMap.set(uid, profile);
        } catch { /* will retry below */ }
      };
      const fetchCourseTitle = async (courseId: string) => {
        try {
          const course = await apiRequest<{ id: string; title: string }>(`/courses/${courseId}`);
          if (course?.title) courseTitleMap.set(courseId, course.title);
        } catch { /* will retry below */ }
      };

      await Promise.allSettled([
        ...uniqueUids.map(fetchProfile),
        ...uniqueCourseIds.map(fetchCourseTitle),
      ]);

      // Apply first-pass enrichment.
      setAllItems((prev) =>
        prev.map((e) => ({
          ...e,
          student: profileMap.get(e.studentUid) ?? e.student,
          courseTitle: courseTitleMap.get(e.courseId) ?? e.courseTitle,
        })),
      );

      // Step 4 — retry any that failed. The previous build would render the
      // un-enriched row for the rest of the session; this catches transient
      // failures (token-refresh race, brief 5xx) without forcing a manual
      // refresh. Two short retries with backoff are enough in practice.
      const stillMissingUids = uniqueUids.filter((uid) => !profileMap.has(uid));
      const stillMissingCourseIds = uniqueCourseIds.filter((id) => !courseTitleMap.has(id));
      if (stillMissingUids.length === 0 && stillMissingCourseIds.length === 0) return;

      for (const delayMs of [800, 2500]) {
        await new Promise((r) => setTimeout(r, delayMs));
        const retryUids = uniqueUids.filter((uid) => !profileMap.has(uid));
        const retryCourseIds = uniqueCourseIds.filter((id) => !courseTitleMap.has(id));
        if (retryUids.length === 0 && retryCourseIds.length === 0) break;
        await Promise.allSettled([
          ...retryUids.map(fetchProfile),
          ...retryCourseIds.map(fetchCourseTitle),
        ]);
        setAllItems((prev) =>
          prev.map((e) => ({
            ...e,
            student: profileMap.get(e.studentUid) ?? e.student,
            courseTitle: courseTitleMap.get(e.courseId) ?? e.courseTitle,
          })),
        );
      }
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Failed to load enrollments" }));
      setLoading(false);
    }
  }, [dispatch, courseIdFilter]);

  useEffect(() => {
    if (!user || !auth.currentUser) return;
    fetchAll();
  }, [user, fetchAll]);

  useEffect(() => { setPage(0); }, [search, statusFilter]);

  // Sort newest first + status filter + client-side search.
  const sortedFiltered = useMemo(() => {
    let arr = [...allItems].sort((a, b) => getTimestamp(b) - getTimestamp(a));
    if (statusFilter !== "all") {
      arr = arr.filter((r) => {
        if (statusFilter === "pending")  return isPending(r.state);
        if (statusFilter === "approved") return isApproved(r.state);
        if (statusFilter === "rejected") return isRejected(r.state);
        return true;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) => {
        const fullName = `${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`.toLowerCase();
        const email = (r.student?.email ?? "").toLowerCase();
        const courseTitle = (r.courseTitle ?? "").toLowerCase();
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          courseTitle.includes(q) ||
          r.courseId.toLowerCase().includes(q) ||
          r.studentUid.toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [allItems, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = sortedFiltered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const isRowPending = (r: EnrollmentItem) => {
    if (isApproved(r.state)) return false;
    if (isRejected(r.state)) return false;
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

  const updateState = (id: string, newState: string) => {
    setAllItems((prev) => prev.map((r) => (r.id === id ? { ...r, state: newState } : r)));
  };

  const approve = async (id: string) => {
    try {
      await apiRequest(`/enrollments/${id}/approve`, { method: "POST" });
      updateState(id, "approved");
      dispatch(pushToast({ tone: "success", title: "Enrollment approved", message: "The student has been notified." }));
      // Pending badge: one fewer pending. Total stays — the row is now Approved.
      dispatch(setPendingEnrollments(
        Math.max(0, allItems.filter((r) => isPending(r.state) && r.id !== id).length),
      ));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        dispatch(pushToast({ tone: "warning", title: "Already processed" }));
      } else {
        dispatch(pushToast({ tone: "warning", title: "Approval failed" }));
      }
    }
  };

  const reject = async (id: string, reason?: string) => {
    try {
      await apiRequest(`/enrollments/${id}/reject`, {
        method: "POST",
        body: reason ? { note: reason } : undefined,
      });
      updateState(id, "rejected");
      dispatch(pushToast({ tone: "warning", title: "Enrollment rejected", message: "The student has been notified." }));
      dispatch(setPendingEnrollments(
        Math.max(0, allItems.filter((r) => isPending(r.state) && r.id !== id).length),
      ));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        dispatch(pushToast({ tone: "warning", title: "Already processed" }));
      } else {
        dispatch(pushToast({ tone: "warning", title: "Rejection failed" }));
      }
    }
  };

  return {
    items: visibleItems,
    loading,
    total,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selected,
    toggle,
    toggleAll,
    allChecked,
    isRowPending,
    approve,
    reject,
    refresh: fetchAll,
    nextPage: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
    hasNext: safePage < totalPages - 1,
    hasPrev: safePage > 0,
    pendingCount: allItems.filter((r) => isPending(r.state)).length,
    approvedCount: allItems.filter((r) => isApproved(r.state)).length,
    rejectedCount: allItems.filter((r) => isRejected(r.state)).length,
  };
}
