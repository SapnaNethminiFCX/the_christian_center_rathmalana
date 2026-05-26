"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

const FETCH_PAGE_SIZE = 100;
const MAX_PAGES = 20;

export interface CourseSummary {
  id: string;
  title: string;
  name?: string;          // V2 backend may return "name" instead of "title"
  state: "draft" | "published" | "archived";
  status?: string;        // V2 alias for state
  semesterCount: number;
  batchCount?: number;      // V2 field
  batches_count?: number;  // possible snake_case from backend
  coverImageUrl?: string | null;
  createdBy?: string;
  publishedAt: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** SubjectView returned inside the GET /courses/:id semester tree. */
export interface Subject {
  id: string;
  title: string;
  name?: string;        // V2 alias
  order: number;
  imageUrls?: string[]; // V2 new — PNG/JPG cover images
  createdAt?: string;
  updatedAt?: string;
}

/** SemesterView returned inside the GET /courses/:id tree. */
export interface Semester {
  id: string;
  title?: string;  // V1 field
  name?: string;   // V2 field
  order?: number;
  number?: number; // V2 field
  openDate?: string | null;
  endDate?: string | null;
  status?: string;
  subjectCount: number;
  subjects?: Subject[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseDetail extends CourseSummary {
  semesters?: Semester[];
}

interface PagedResponse {
  items: CourseSummary[];
  nextCursor: string | null;
  total: number;
}

interface UseCoursesOptions {
  /** Items per page (default 20). Public catalog uses higher, landing uses 4. */
  limit?: number;
  /** Optional state filter for admins (draft, published, archived). */
  state?: "draft" | "published" | "archived";
  /** Whether to fire request (e.g. wait for auth). Defaults true. */
  enabled?: boolean;
  /** Use authenticated request. Set false for unauthenticated public listing. */
  authenticated?: boolean;
}

/**
 * List courses with client-side search and pagination.
 *
 * Backend does not currently support `?q=` on `/courses`, so we fetch all
 * pages and filter client-side. Same pattern as `useRegistrationQueue`.
 */
export function useCourses({
  limit = 25,
  state,
  enabled = true,
  authenticated = true,
}: UseCoursesOptions = {}) {
  const dispatch = useAppDispatch();

  const [allItems, setAllItems] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalFetched, setTotalFetched] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  /** Fetch the entire course list across all backend pages. */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const collected: CourseSummary[] = [];
      let cursor: string | undefined = undefined;
      let totalCount = 0;
      let pageNo = 0;

      do {
        const params = new URLSearchParams({ limit: String(FETCH_PAGE_SIZE) });
        if (cursor) params.append("cursor", cursor);
        if (state) params.append("state", state);
        const data: PagedResponse = await apiRequest<PagedResponse>(
          `/courses?${params}`,
          { auth: authenticated },
        );
        collected.push(...(data.items ?? []));
        totalCount = data.total ?? collected.length;
        cursor = data.nextCursor ?? undefined;
        pageNo += 1;
      } while (cursor && pageNo < MAX_PAGES);

      setAllItems(collected);
      setTotalFetched(totalCount);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) return;
      dispatch(pushToast({ tone: "warning", title: "Failed to load courses" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, state, authenticated]);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
  }, [fetchAll, enabled]);

  // Reset to page 0 when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  // Client-side filter by title (debounced via the 300ms search-handler typing).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((c) => c.title.toLowerCase().includes(q));
  }, [allItems, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages - 1);
  const items = filtered.slice(safePage * limit, (safePage + 1) * limit);

  const nextPage = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const prevPage = () => setPage((p) => Math.max(0, p - 1));
  const refresh = () => fetchAll();

  /** POST /courses/:id/publish */
  const publish = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/courses/${id}/publish`, { method: "POST" });
        await fetchAll();
        dispatch(pushToast({ tone: "success", title: "Course published" }));
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.code === "EMPTY_SEMESTER" || err.code === "NO_SEMESTERS") {
            dispatch(pushToast({ tone: "warning", title: "Cannot publish", message: err.message }));
          } else if (err.status === 409) {
            dispatch(pushToast({ tone: "warning", title: "Already published" }));
          } else {
            dispatch(pushToast({ tone: "warning", title: "Publish failed", message: err.message }));
          }
        }
      }
    },
    [dispatch, fetchAll],
  );

  /** POST /courses/:id/unpublish */
  const unpublish = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/courses/${id}/unpublish`, { method: "POST" });
        await fetchAll();
        dispatch(pushToast({ tone: "success", title: "Course unpublished" }));
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          dispatch(pushToast({ tone: "warning", title: "Already a draft" }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Unpublish failed" }));
        }
      }
    },
    [dispatch, fetchAll],
  );

  /** POST /courses/:id/archive */
  const archive = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/courses/${id}/archive`, { method: "POST" });
        await fetchAll();
        dispatch(pushToast({ tone: "success", title: "Course archived" }));
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          dispatch(pushToast({ tone: "warning", title: "Already archived" }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Archive failed" }));
        }
      }
    },
    [dispatch, fetchAll],
  );

  /** POST /courses/:id/restore — restore archived course back to draft (V2 NEW) */
  const restore = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/courses/${id}/restore`, { method: "POST" });
        await fetchAll();
        dispatch(pushToast({ tone: "success", title: "Course restored", message: "Back to Draft — re-publish to make it visible." }));
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          dispatch(pushToast({ tone: "warning", title: "Can't restore", message: "Only archived courses can be restored." }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Restore failed" }));
        }
      }
    },
    [dispatch, fetchAll],
  );

  /** DELETE /courses/:id (soft delete, recoverable 30d) */
  const remove = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/courses/${id}`, { method: "DELETE" });
        await fetchAll();
        dispatch(pushToast({ tone: "success", title: "Course deleted" }));
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          dispatch(pushToast({ tone: "warning", title: "Course not found" }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Delete failed" }));
        }
      }
    },
    [dispatch, fetchAll],
  );

  return {
    items,
    loading,
    total: filtered.length,
    totalAll: totalFetched,
    page: safePage,
    totalPages,
    search,
    setSearch,
    nextPage,
    prevPage,
    hasNext: safePage < totalPages - 1,
    hasPrev: safePage > 0,
    refresh,
    publish,
    unpublish,
    archive,
    restore,
    remove,
  };
}

/**
 * Fetch course + structure. The detail endpoint OFTEN returns an empty
 * semesters[] even when semesterCount > 0, so we fall back to listing
 * semesters and their subjects through the standard REST routes.
 */
async function fetchCourseWithStructure(
  courseId: string,
  authenticated: boolean,
): Promise<CourseDetail> {
  // Step 1 — get the course (always works)
  const course = await apiRequest<CourseDetail>(`/courses/${courseId}`, { auth: authenticated });

  // Step 2 — always fetch GET /courses/:id/semesters separately because the
  // embedded semesters in GET /courses/:id are V1 format and omit openDate/endDate.
  // The standalone endpoint returns the full V2 shape with dates.
  try {
    const semRes = await apiRequest<Semester[] | { items: Semester[] }>(
      `/courses/${courseId}/semesters`,
      { auth: authenticated },
    );
    const semesters: Semester[] = Array.isArray(semRes)
      ? semRes
      : ((semRes as { items?: Semester[] }).items ?? []);

    const enriched = await Promise.all(
      semesters.map(async (sem) => {
        try {
          const subRes = await apiRequest<Subject[] | { items: Subject[] }>(
            `/semesters/${sem.id}/subjects`,
            { auth: authenticated },
          );
          const subjects: Subject[] = Array.isArray(subRes)
            ? subRes
            : ((subRes as { items?: Subject[] }).items ?? []);
          return { ...sem, subjects };
        } catch {
          return { ...sem, subjects: [] };
        }
      }),
    );
    return { ...course, semesters: enriched };
  } catch {
    // Fallback endpoints don't exist — return what we have.
    return course;
  }
}

/**
 * Get a single course with its full semester/subject tree.
 * - `GET /courses/:id`
 * - 404 → returns null + redirects (caller handles)
 */
export function useCourse(courseId: string | undefined, authenticated = true) {
  const dispatch = useAppDispatch();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; status: number } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCourseWithStructure(courseId, authenticated)
      .then((data) => {
        if (cancelled) return;
        setCourse(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError) {
          setError({ code: err.code, status: err.status });
          if (err.status === 404) {
            dispatch(pushToast({ tone: "warning", title: "Course not found" }));
          } else if (err.status === 403) {
            dispatch(pushToast({ tone: "warning", title: "Enrollment required", message: "You must be enrolled to view this course." }));
          } else if (err.status !== 401) {
            dispatch(pushToast({ tone: "warning", title: "Failed to load course" }));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [courseId, authenticated, dispatch]);

  return { course, loading, error };
}
