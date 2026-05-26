"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

/**
 * Sprint 8 — Audit log hook.
 *
 * Wraps GET /audit-log (org-wide) and GET /users/:uid/audit-log (per-user).
 * Tolerates several backend response envelopes and snake_case field names so
 * the UI keeps working as the backend contract evolves.
 *
 * Returns { entries, total, nextCursor, loading, error, fetchPage, refresh }.
 */

export interface AuditEntry {
  id: string;
  /** ISO datetime — backend returns `when`; we keep this name internally. */
  when: string;
  actorUid: string;
  actorEmail?: string;
  category: string;
  action: string;
  targetType?: string;
  targetId?: string;
  requestId?: string;
}

export interface AuditFilters {
  actorUid?: string;
  action?: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  from?: string;       // ISO datetime
  to?: string;
  limit?: number;
}

// ── Field-name coercion ───────────────────────────────────────────────────────

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function normaliseEntry(raw: unknown): AuditEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const actor =
    r.actor && typeof r.actor === "object" ? (r.actor as Record<string, unknown>) : undefined;
  const id = pickString(r, "id", "uid", "auditId", "audit_id", "logId");
  const actorUid =
    pickString(actor ?? {}, "uid", "id") ??
    pickString(r, "actorUid", "actor_uid", "actorId", "actor_id", "userId", "user_id") ??
    "unknown";
  const actorEmail =
    pickString(actor ?? {}, "email") ??
    pickString(r, "actorEmail", "actor_email", "email");
  const when =
    pickString(r, "when", "createdAt", "created_at", "timestamp", "ts", "occurredAt", "occurred_at") ??
    new Date(0).toISOString();
  const action = pickString(r, "action", "event", "type", "name") ?? "unknown";
  const category = pickString(r, "category", "cat", "scope") ?? "other";
  return {
    id: id ?? `${actorUid}-${when}`,
    when,
    actorUid,
    actorEmail,
    category,
    action,
    targetType: pickString(r, "targetType", "target_type"),
    targetId: pickString(r, "targetId", "target_id"),
    requestId: pickString(r, "requestId", "request_id", "reqId"),
  };
}

interface PageState {
  entries: AuditEntry[];
  total: number;
  nextCursor: string | null;
}

/** Unwrap any of the common backend envelope shapes into a uniform page. */
function unwrapPage(res: unknown): PageState {
  if (Array.isArray(res)) {
    const entries = res.map(normaliseEntry).filter((e): e is AuditEntry => e !== null);
    return { entries, total: entries.length, nextCursor: null };
  }
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const rawList =
      (Array.isArray(obj.items) && obj.items) ||
      (Array.isArray(obj.entries) && obj.entries) ||
      (Array.isArray(obj.data) && obj.data) ||
      (Array.isArray(obj.results) && obj.results) ||
      [];
    const entries = rawList.map(normaliseEntry).filter((e): e is AuditEntry => e !== null);
    const total =
      typeof obj.total === "number"
        ? obj.total
        : typeof obj.count === "number"
          ? obj.count
          : entries.length;
    const nextCursor =
      typeof obj.nextCursor === "string"
        ? obj.nextCursor
        : typeof obj.next_cursor === "string"
          ? obj.next_cursor
          : typeof obj.cursor === "string"
            ? obj.cursor
            : null;
    return { entries, total, nextCursor };
  }
  return { entries: [], total: 0, nextCursor: null };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseAuditLogOptions {
  /** When set, calls GET /users/:uid/audit-log instead of /audit-log. */
  userUid?: string;
  filters?: AuditFilters;
  enabled?: boolean;
}

export function useAuditLog({ userUid, filters = {}, enabled = true }: UseAuditLogOptions = {}) {
  const dispatch = useAppDispatch();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const buildPath = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("limit", String(filters.limit ?? 25));
      if (filters.actorUid) params.set("actorUid", filters.actorUid);
      if (filters.action) params.set("action", filters.action);
      if (filters.category) params.set("category", filters.category);
      if (filters.targetType) params.set("targetType", filters.targetType);
      if (filters.targetId) params.set("targetId", filters.targetId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (cursor) params.set("cursor", cursor);
      const base = userUid ? `/users/${userUid}/audit-log` : `/audit-log`;
      return `${base}?${params.toString()}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userUid, filtersKey],
  );

  const fetchPage = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      if (reset) setError(null);
      try {
        const res = await apiRequest<unknown>(buildPath(reset ? null : nextCursor));
        const page = unwrapPage(res);
        setEntries((prev) => (reset ? page.entries : [...prev, ...page.entries]));
        setTotal(page.total);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.status === 403) setError("Insufficient permissions to view the audit log.");
          else if (err.status === 404) setError("Audit log endpoint not available on the backend.");
          else if (err.status >= 500) setError("Server error loading the audit log.");
          else if (err.status !== 401) setError(err.message || "Failed to load audit log.");
        } else {
          setError("Unexpected error loading audit log.");
          dispatch(pushToast({ tone: "warning", title: "Audit log failed to load" }));
        }
      } finally {
        setLoading(false);
      }
    },
    [buildPath, nextCursor, dispatch],
  );

  useEffect(() => {
    if (!enabled) return;
    setEntries([]);
    setNextCursor(null);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, filtersKey, userUid]);

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  return useMemo(
    () => ({ entries, total, nextCursor, loading, error, fetchPage, refresh }),
    [entries, total, nextCursor, loading, error, fetchPage, refresh],
  );
}
