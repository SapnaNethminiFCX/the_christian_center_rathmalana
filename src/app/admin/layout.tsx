"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ADMIN_NAV, isLink } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useSidebarCounts } from "@/application/hooks/useSidebarCounts";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/admin\/dashboard/, title: "Admin Dashboard" },
  { test: /^\/admin\/registrations/, title: "Role Requests" },
  { test: /^\/admin\/enrollments/, title: "Enrollments" },
  { test: /^\/admin\/courses\/new/, title: "New course" },
  { test: /^\/admin\/courses\/[^/]+\/publish/, title: "Publish course" },
  { test: /^\/admin\/courses\/[^/]+\/view/, title: "Course details" },
  { test: /^\/admin\/courses\/[^/]+/, title: "Edit course" },
  { test: /^\/admin\/courses/, title: "Courses" },
  { test: /^\/admin\/students\/[^/]+/, title: "User" },
  { test: /^\/admin\/students/, title: "Users" },
  { test: /^\/admin\/profile/, title: "Profile" },
  { test: /^\/admin\/notifications/, title: "Notifications" },
  { test: /^\/admin\/audit-log/, title: "Audit Log" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "Admin";
  const user = useSessionUser();
  useSidebarCounts();
  const pendingRegistrations = useAppSelector((s) => s.ui.pendingRegistrations);
  const pendingEnrollments = useAppSelector((s) => s.ui.pendingEnrollments);

  // Inject live counts into nav items.
  const navItems = useMemo(
    () =>
      ADMIN_NAV.map((item) => {
        if (!isLink(item)) return item;
        if (item.id === "registrations") return { ...item, count: pendingRegistrations };
        if (item.id === "enrollments") return { ...item, count: pendingEnrollments };
        return item;
      }),
    [pendingRegistrations, pendingEnrollments],
  );

  return (
    <AuthGuard allowedRoles={["admin", "super_admin"]}>
      <AppShell
        navItems={navItems}
        user={user}
        roleLabel="Administrator"
        title={title}
        dashboardHref="/admin/dashboard"
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
