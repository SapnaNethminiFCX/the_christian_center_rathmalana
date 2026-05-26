"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

export type CellType  = "g12" | "care" | "children" | "outreach";
export type CellState = "active" | "archived";

export interface Cell {
  id: string;
  name: string;
  type: CellType;
  area: string;
  leaderUid: string;
  leaderName?: string;
  g12LeaderUid?: string;
  g12LeaderName?: string;
  memberCount: number;
  reportCount: number;
  state: CellState;
  createdAt: string;
  updatedAt: string;
}

export interface CellDetail extends Cell {
  members?: { uid: string; displayName: string }[];
}

function parseList(res: unknown): Cell[] {
  if (Array.isArray(res)) return res as Cell[];
  const r = res as { items?: Cell[] };
  return r.items ?? [];
}

/**
 * Fetch the paginated cell list scoped by the caller's role.
 * Server auto-applies scope: Member/Student → active cells;
 * Leader → cells they lead; G12 → network; Admin → all.
 */
interface UseCellsParams {
  search?: string;
  type?: CellType | "all";
  state?: CellState;
  /** Filter by physical area (per spec). */
  area?: string;
  /** Filter by leader UID (per spec). */
  leaderUid?: string;
  /**
   * Hint to the server about which scope to apply. The auto-scope returns
   * "cells you lead" for a Leader caller, which is too narrow for the
   * Leader-page "Other cells" tab — that tab wants the same org-wide
   * directory the Member role implicitly sees. Sending `scope=org` (or
   * `scope=all`) lets the backend opt into the wider view when supported;
   * older backends ignore the param without error.
   */
  scope?: "mine" | "network" | "org" | "all";
}

/**
 * GET /cells with server-side filtering per the V2 spec.
 * Paginates internally via `cursor` and stops at 10 pages × 100 items.
 *
 * Spec params:  type | state | area | leaderUid | search | limit | cursor
 */
export function useCells(params?: UseCellsParams) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCells = useCallback(async () => {
    setLoading(true);
    try {
      const collected: Cell[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i++) {
        const qs = new URLSearchParams({ limit: "100" });
        if (params?.state)          qs.set("state", params.state);
        if (params?.type && params.type !== "all") qs.set("type", params.type);
        if (params?.area?.trim())   qs.set("area", params.area.trim());
        if (params?.leaderUid)      qs.set("leaderUid", params.leaderUid);
        if (params?.search?.trim()) qs.set("search", params.search.trim());
        if (params?.scope)          qs.set("scope", params.scope);
        if (cursor)                 qs.set("cursor", cursor);
        const res = await apiRequest<unknown>(`/cells?${qs}`);
        collected.push(...parseList(res));
        const next = (res as { nextCursor?: string | null })?.nextCursor;
        if (!next) break;
        cursor = next;
      }
      setCells(collected);
    } catch {
      setCells([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.search, params?.type, params?.state, params?.area, params?.leaderUid, params?.scope]);

  useEffect(() => { fetchCells(); }, [fetchCells]);

  return { cells, loading, refetch: fetchCells };
}

/**
 * Fetch cells the signed-in user belongs to (GET /cells/mine).
 */
export function useMyCells() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyCells = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<unknown>("/cells/mine");
      setCells(parseList(res));
    } catch {
      setCells([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyCells(); }, [fetchMyCells]);

  return { cells, loading, refetch: fetchMyCells };
}

/**
 * Cell mutations — create, update, archive.
 */
export function useCellMutations() {
  const dispatch = useAppDispatch();

  const createCell = async (body: {
    name: string; type: CellType; area: string; g12LeaderUid?: string;
  }): Promise<Cell | null> => {
    try {
      const created = await apiRequest<Cell>("/cells", { method: "POST", body });
      dispatch(pushToast({ tone: "success", title: "Cell created" }));
      return created;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to create cell.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't create cell", message: msg }));
      return null;
    }
  };

  const updateCell = async (cellId: string, body: Partial<{ name: string; type: CellType; area: string }>): Promise<Cell | null> => {
    try {
      const updated = await apiRequest<Cell>(`/cells/${cellId}`, { method: "PATCH", body });
      dispatch(pushToast({ tone: "success", title: "Cell updated" }));
      return updated;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to update cell.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't update cell", message: msg }));
      return null;
    }
  };

  const archiveCell = async (cellId: string): Promise<boolean> => {
    try {
      await apiRequest(`/cells/${cellId}/archive`, { method: "POST" });
      dispatch(pushToast({ tone: "success", title: "Cell archived" }));
      return true;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to archive cell.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't archive cell", message: msg }));
      return false;
    }
  };

  return { createCell, updateCell, archiveCell };
}
