"use client";

import { useEffect } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { setPendingRegistrations, setPendingEnrollments } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

/**
 * Sprint 8 — fetches the live pending counts for the admin / super-admin
 * sidebar badges on layout mount.
 *
 * Why not just trust `response.total`? The backend currently returns the
 * *unfiltered* grand total on the registrations/enrollments endpoints even
 * when `?status=pending` is passed. So we paginate the items ourselves and
 * count only those whose `status`/`state` is actually pending.
 *
 * Cap of 10 pages × 100 items keeps the call cheap. 401/403/404 are
 * swallowed silently — the badge falls back to 0.
 */

const FETCH_PAGE_SIZE = 100;
const MAX_PAGES = 10;

const isPending = (s: unknown): boolean =>
  typeof s === "string" && s.toLowerCase().replace(/_/g, "").includes("pending");

interface PagedResponse {
  items?: Array<Record<string, unknown>>;
  nextCursor?: string | null;
}

/**
 * Some endpoints use `state`, some use `status`, V1 used both. Read whichever
 * is present and return the lowercased, underscore-stripped value.
 */
function stateOf(item: Record<string, unknown>): string {
  const raw =
    (typeof item.state === "string" && item.state) ||
    (typeof item.status === "string" && item.status) ||
    "";
  return raw;
}

/**
 * Count pending items at `basePath`. When `requestedRole` is given, only items
 * whose `requestedRole` field matches are counted — used by `/role-requests`
 * because that endpoint returns leader/g12/student requests in one list but
 * the sidebar's "Role Requests" badge tracks the Member→Student path only.
 */
async function countPending(
  basePath: string,
  opts: { requestedRole?: string } = {},
): Promise<number> {
  let cursor: string | undefined;
  let count = 0;
  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = new URLSearchParams({ limit: String(FETCH_PAGE_SIZE), status: "pending" });
      if (opts.requestedRole) params.set("requestedRole", opts.requestedRole);
      if (cursor) params.set("cursor", cursor);
      const data = await apiRequest<PagedResponse>(`${basePath}?${params}`);
      const items = data.items ?? [];
      for (const it of items) {
        if (!isPending(stateOf(it))) continue;
        if (opts.requestedRole) {
          const role = typeof it.requestedRole === "string" ? it.requestedRole : "";
          if (role.toLowerCase() !== opts.requestedRole.toLowerCase()) continue;
        }
        count += 1;
      }
      cursor = data.nextCursor ?? undefined;
      if (!cursor) break;
    }
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403 || err.status === 404)) {
      return 0;
    }
    return 0;
  }
  return count;
}

export function useSidebarCounts({ enabled = true }: { enabled?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    (async () => {
      const [regCount, enrCount] = await Promise.all([
        // V2: role requests live at /role-requests. The "Role Requests" badge
        // counts the Member→Student access path only — the page's "Pending (N)"
        // chip reflects the same filter.
        countPending("/role-requests", { requestedRole: "student" }),
        countPending("/admin/enrollments"),
      ]);
      if (cancelled) return;
      dispatch(setPendingRegistrations(regCount));
      dispatch(setPendingEnrollments(enrCount));
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, user, dispatch]);
}
