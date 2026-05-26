"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { CellDetail } from "./useCells";

/**
 * Fetch a single cell with its full member roster (GET /cells/:id).
 */
export function useCell(cellId: string | undefined) {
  const [cell, setCell] = useState<CellDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const fetchCell = useCallback(async () => {
    if (!cellId) return;
    setLoading(true);
    try {
      const data = await apiRequest<CellDetail>(`/cells/${cellId}`);

      // Enrich leaderName if backend didn't return it or returned the UID.
      // Note: leader enrichment is handled below via the unified UID→name map
      // built for members; we keep this block as a fast-path when only the
      // leader needs lookup (no other members).
      let enriched = data;
      if (data.leaderUid && (!data.leaderName || data.leaderName === data.leaderUid)) {
        try {
          const leader = await apiRequest<{ firstName?: string; lastName?: string; email?: string }>(
            `/users/${data.leaderUid}`,
          );
          const name = [leader.firstName, leader.lastName].filter(Boolean).join(" ").trim() || leader.email || "";
          if (name) enriched = { ...data, leaderName: name };
        } catch { /* silent — fall back to UID if user fetch fails */ }
      }

      // Enrich each cell member with their display name when missing/equals UID.
      // The /cells/:id endpoint sometimes returns members as bare UIDs.
      const rawMembers = (data.members ?? []) as Array<{ uid?: string; displayName?: string } | string>;
      const needsNames: string[] = [];
      const normalised = rawMembers.map((m) => {
        const uid = typeof m === "string" ? m : (m?.uid ?? "");
        const displayName = typeof m === "string" ? "" : (m?.displayName ?? "");
        if (uid && (!displayName || displayName === uid)) needsNames.push(uid);
        return { uid, displayName };
      });

      if (needsNames.length > 0) {
        // Build UID → { name, roles } map. Strategy:
        //   1. Paginate `GET /users?limit=100` across all pages (accessible to
        //      leader/g12 per the V2 spec) and capture name + roles[].
        //   2. For anyone still unresolved, fall back to per-uid `/users/:uid`.
        const nameByUid = new Map<string, string>();
        const rolesByUid = new Map<string, string[]>();
        try {
          let cursor: string | undefined;
          for (let i = 0; i < 10; i++) {
            const qs = new URLSearchParams({ limit: "100" });
            if (cursor) qs.set("cursor", cursor);
            const list = await apiRequest<{
              items?: Array<{ uid: string; firstName?: string; lastName?: string; email?: string; roles?: string[] }>;
              nextCursor?: string | null;
            }>(`/users?${qs}`);
            for (const u of list.items ?? []) {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "";
              if (u.uid && name) nameByUid.set(u.uid, name);
              if (u.uid && Array.isArray(u.roles)) rolesByUid.set(u.uid, u.roles);
            }
            cursor = list.nextCursor ?? undefined;
            if (!cursor) break;
          }
        } catch { /* fall through to per-uid */ }

        const stillMissing = [...new Set(needsNames)].filter((uid) => !nameByUid.has(uid));
        if (stillMissing.length > 0) {
          const profiles = await Promise.all(
            stillMissing.map(async (uid) => {
              try {
                const u = await apiRequest<{ firstName?: string; lastName?: string; email?: string; roles?: string[] }>(`/users/${uid}`);
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "";
                return [uid, name, Array.isArray(u.roles) ? u.roles : []] as const;
              } catch { return [uid, "", [] as string[]] as const; }
            }),
          );
          for (const [uid, name, roles] of profiles) {
            if (name) nameByUid.set(uid, name);
            if (roles.length) rolesByUid.set(uid, roles);
          }
        }

        const filled = normalised.map((m) => ({
          uid: m.uid,
          displayName: m.displayName || nameByUid.get(m.uid) || m.uid,
          roles: rolesByUid.get(m.uid) ?? [],
        }));
        enriched = { ...enriched, members: filled as unknown as CellDetail["members"] };
      } else if (normalised.length > 0) {
        enriched = { ...enriched, members: normalised as unknown as CellDetail["members"] };
      }

      setCell(enriched);
      setError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err);
      setCell(null);
    } finally {
      setLoading(false);
    }
  }, [cellId]);

  useEffect(() => { fetchCell(); }, [fetchCell]);

  return { cell, loading, error, refetch: fetchCell };
}

/**
 * Add / remove cell members (Leader / G12 / Admin only).
 */
export function useCellMembers(cellId: string | undefined) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const addMembers = async (userUids: string[]): Promise<{ added: string[]; memberCount: number } | null> => {
    if (!cellId) return null;
    setBusy(true);
    try {
      const res = await apiRequest<{ added: string[]; memberCount: number }>(
        `/cells/${cellId}/members`,
        { method: "POST", body: { userUids } },
      );
      dispatch(pushToast({ tone: "success", title: `${res.added.length} member${res.added.length === 1 ? "" : "s"} added` }));
      return res;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to add members.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't add members", message: msg }));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (uid: string): Promise<boolean> => {
    if (!cellId) return false;
    setBusy(true);
    try {
      await apiRequest(`/cells/${cellId}/members/${uid}`, { method: "DELETE" });
      dispatch(pushToast({ tone: "success", title: "Member removed" }));
      return true;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to remove member.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't remove member", message: msg }));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, addMembers, removeMember };
}
