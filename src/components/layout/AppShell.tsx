"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Toaster } from "@/components/ui/Toaster";
import type { NavItem } from "./RoleNav";
import type { NotificationItem } from "@/lib/mock/notifications";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useNotifications } from "@/application/hooks/useNotifications";
import { useInactivityTimer } from "@/application/hooks/useInactivityTimer";
import { pushToast } from "@/application/slices/uiSlice";
import {
  clearSession,
  setActiveRole,
  DASHBOARD_BY_ROLE,
  type Role,
} from "@/application/slices/sessionSlice";
import { auth } from "@/infrastructure/firebase/auth";
import { apiRequest } from "@/infrastructure/api/request";
import { tokenService } from "@/infrastructure/firebase/tokenService";
import { getCachedFcmToken, clearCachedFcmToken } from "@/components/auth/FirebaseAuthListener";

interface Props {
  navItems: NavItem[];
  user: { name: string; avatar?: string };
  roleLabel: string;
  title: string;
  /** Optional override — when omitted, AppShell uses the real notifications hook. */
  notifications?: NotificationItem[];
  dashboardHref: string;
  rightExtras?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  navItems,
  user,
  roleLabel,
  title,
  notifications,
  dashboardHref,
  rightExtras,
  children,
}: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);
  const activeRole = useAppSelector((s) => s.session.activeRole);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real notifications + unread count. Used by the bell unless caller
  // supplies a mock list via the `notifications` prop.
  const { items: liveNotifications, unreadCount, markRead } = useNotifications({ pollUnread: true });

  const onSwitchRole = (newRole: Role) => {
    dispatch(setActiveRole(newRole));
    dispatch(pushToast({
      tone: "success",
      title: `Switched to ${newRole === "super_admin" ? "super admin" : newRole} view`,
    }));
    // Use the canonical per-role landing page so Member / Leader / G12 don't
    // accidentally end up on the Student dashboard.
    router.push(DASHBOARD_BY_ROLE[newRole]);
  };

  const performSignOut = useCallback(
    async (redirectTo: string) => {
      try {
        // Deregister FCM push token before signing out.
        const fcmToken = getCachedFcmToken();
        if (fcmToken) {
          await apiRequest("/me/fcm-token", { method: "DELETE", body: { token: fcmToken } }).catch(() => null);
          clearCachedFcmToken();
        }
        // Revoke Firebase refresh tokens server-side.
        await apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
      } finally {
        await signOut(auth).catch(() => null);
        tokenService.clear();
        dispatch(clearSession());
        router.push(redirectTo);
      }
    },
    [dispatch, router],
  );

  const onLogout = async () => {
    await performSignOut("/login");
  };

  // 30-minute inactivity timeout (FR-A-008 / NFR-SEC-002). Only armed when a
  // user is actually signed in — public pages don't reach AppShell anyway,
  // but the explicit `enabled` guards against edge cases.
  useInactivityTimer({
    minutes: 30,
    enabled: Boolean(sessionUser),
    onTimeout: () => {
      dispatch(
        pushToast({
          tone: "warning",
          title: "Signed out for inactivity",
          message: "Please sign in again to continue.",
        }),
      );
      void performSignOut("/login?reason=inactive");
    },
  });

  // Map real API notifications into the NotificationItem shape the bell expects.
  const mappedNotifications: NotificationItem[] = liveNotifications.map((n) => {
    const cat = (n.category ?? "").toLowerCase();
    const ico = cat.includes("approved") ? "check-circle"
      : cat.includes("rejected") || cat.includes("suspended") ? "alert-triangle"
      : cat.includes("registration") ? "user-plus"
      : cat.includes("enrollment") ? "clipboard-list"
      : "bell";
    const tone = cat.includes("rejected") || cat.includes("suspended") ? "warning"
      : cat.includes("approved") ? "success"
      : "info";
    const ts = new Date(n.createdAt).getTime();
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const when = m < 1 ? "just now" : m < 60 ? `${m} min ago`
      : m < 1440 ? `${Math.floor(m / 60)} h ago`
      : `${Math.floor(m / 1440)} d ago`;
    return {
      id: n.id,
      ico,
      tone: tone as NotificationItem["tone"],
      title: n.title,
      body: n.body || undefined,
      when,
      read: n.read,
      link: n.link || undefined,
    } as NotificationItem & { id: string };
  });

  const onNotificationClick = (n: NotificationItem) => {
    const realId = (n as NotificationItem & { id?: string }).id;
    if (realId && !n.read) markRead(realId);
    if (n.link) router.push(n.link);
  };

  // Caller can override (e.g. for testing); otherwise we use real data.
  const notifsToShow = notifications ?? mappedNotifications;

  return (
    <div className="shell">
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        navItems={navItems}
        user={user}
        roleLabel={roleLabel}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="shell-main">
        <TopNav
          title={title}
          user={user}
          roleLabel={roleLabel}
          roles={sessionUser?.roles}
          activeRole={activeRole}
          onSwitchRole={onSwitchRole}
          notifications={notifsToShow}
          dashboardHref={dashboardHref}
          onLogout={onLogout}
          onNotificationClick={onNotificationClick}
          rightExtras={rightExtras}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
        <div className="shell-scroll">{children}</div>
        <footer className="shell-footer">
          <div className="shell-footer-inner">
            <span className="shell-footer-brand">
              <span className="dot" />© 2026 TCCR
            </span>
            <span className="shell-footer-version">v0.1.0</span>
          </div>
        </footer>
      </main>
      <Toaster />
    </div>
  );
}
