"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest } from "@/infrastructure/api/request";
import { auth } from "@/infrastructure/firebase/auth";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface Notification {
  id: string;
  userUid: string;
  category: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  /** IDs of identical duplicates collapsed into this row (so mark-read clears them all). */
  duplicateIds?: string[];
  [key: string]: unknown;
}

interface PagedResponse {
  items: Notification[];
  nextCursor: string | null;
  total: number;
}

interface UseNotificationsOptions {
  /** When true, also poll for new notifications every 60s. Default false. */
  pollUnread?: boolean;
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useNotifications({ pollUnread = false }: UseNotificationsOptions = {}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);

  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    setLoading(true);
    try {
      const data = await apiRequest<PagedResponse>(`/me/notifications?limit=50`);
      const sorted = (data.items ?? []).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      // Deduplicate by content (category + title + body). Backend occasionally
      // emits the same notification multiple times — keep only the newest.
      // We also collect the duplicate IDs so "mark read" can clear them all.
      const seen = new Map<string, Notification & { duplicateIds: string[] }>();
      for (const n of sorted) {
        const key = `${n.category ?? ""}|${n.title}|${n.body ?? ""}`;
        const existing = seen.get(key);
        if (existing) {
          existing.duplicateIds.push(n.id);
        } else {
          seen.set(key, { ...n, duplicateIds: [] });
        }
      }
      const deduped = Array.from(seen.values());
      setItems(deduped);
      setUnreadCount(deduped.filter((n) => !n.read).length);
    } catch {
      // Silent — notification failures shouldn't interrupt the UX.
    } finally {
      setLoading(false);
    }
  }, [user, dispatch]);

  const fetchUnreadOnly = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    try {
      const data = await apiRequest<PagedResponse>(`/me/notifications?read=false&limit=1`);
      setUnreadCount(data.total ?? 0);
    } catch {
      // Silent — bell badge degrades gracefully.
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Optional: poll unread count every 60s while the user is on the page.
  useEffect(() => {
    if (!pollUnread || !user) return;
    const id = setInterval(fetchUnreadOnly, 60_000);
    return () => clearInterval(id);
  }, [pollUnread, user, fetchUnreadOnly]);

  const markRead = useCallback(async (id: string) => {
    // Find the row + any duplicate IDs collapsed into it.
    const row = items.find((n) => n.id === id);
    const idsToMark = [id, ...(row?.duplicateIds ?? [])];

    // Optimistic update.
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      // Mark every backend record for this content as read.
      await Promise.allSettled(
        idsToMark.map((i) => apiRequest(`/me/notifications/${i}/read`, { method: "POST" })),
      );
    } catch {
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: false, readAt: null } : n));
      setUnreadCount((prev) => prev + 1);
      dispatch(pushToast({ tone: "warning", title: "Failed to mark as read" }));
    }
  }, [items, dispatch]);

  const markAllRead = useCallback(async () => {
    const previouslyUnread = items.filter((n) => !n.read);
    if (previouslyUnread.length === 0) return;
    setItems((prev) => prev.map((n) => n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }));
    setUnreadCount(0);
    try {
      const res = await apiRequest<{ markedCount?: number } | undefined>(`/me/notifications/read-all`, { method: "POST" });
      const count = (res as { markedCount?: number } | undefined)?.markedCount ?? previouslyUnread.length;
      dispatch(pushToast({ tone: "success", title: `${count} notification${count === 1 ? "" : "s"} marked as read` }));
    } catch {
      // Rollback.
      setItems((prev) => prev.map((n) => {
        const wasUnread = previouslyUnread.some((u) => u.id === n.id);
        return wasUnread ? { ...n, read: false, readAt: null } : n;
      }));
      setUnreadCount(previouslyUnread.length);
      dispatch(pushToast({ tone: "warning", title: "Failed to mark all as read" }));
    }
  }, [items, dispatch]);

  return {
    items,
    unreadCount,
    loading,
    refresh: fetchAll,
    markRead,
    markAllRead,
  };
}
