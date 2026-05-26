"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SUPERADMIN_NAV, isLink } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useSidebarCounts } from "@/application/hooks/useSidebarCounts";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/super-admin\/dashboard/, title: "Super Admin" },
  { test: /^\/super-admin\/admins\/new/, title: "Invite admin" },
  { test: /^\/super-admin\/admins\/[^/]+\/upgrade/, title: "Upgrade Admin" },
  { test: /^\/super-admin\/admins\/[^/]+/, title: "Administrator" },
  { test: /^\/super-admin\/admins/, title: "Administrators" },
  { test: /^\/super-admin\/students\/[^/]+\/upgrade/, title: "Upgrade Role" },
  { test: /^\/super-admin\/students\/[^/]+/, title: "User" },
  { test: /^\/super-admin\/students/, title: "Users" },
  { test: /^\/super-admin\/registrations/, title: "Role Requests" },
  { test: /^\/super-admin\/enrollments/, title: "Enrollments" },
  { test: /^\/super-admin\/courses/, title: "Courses" },
  { test: /^\/super-admin\/profile/, title: "Profile" },
  { test: /^\/super-admin\/audit-log/, title: "Audit Log" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "Super Admin";
  const user = useSessionUser();
  useSidebarCounts();
  const pendingRegistrations = useAppSelector((s) => s.ui.pendingRegistrations);
  const pendingEnrollments = useAppSelector((s) => s.ui.pendingEnrollments);
  const totalAdmins = useAppSelector((s) => s.ui.totalAdmins);

  const navItems = useMemo(
    () =>
      SUPERADMIN_NAV.map((item) => {
        if (!isLink(item)) return item;
        if (item.id === "registrations") return { ...item, count: pendingRegistrations };
        if (item.id === "enrollments") return { ...item, count: pendingEnrollments };
        if (item.id === "admins") return { ...item, count: totalAdmins, hint: "Total admins" };
        return item;
      }),
    [pendingRegistrations, pendingEnrollments, totalAdmins],
  );

  return (
    <AuthGuard allowedRoles={["super_admin"]}>
      <AppShell
        navItems={navItems}
        user={user}
        roleLabel="Super Admin"
        title={title}
        dashboardHref="/super-admin/dashboard"
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
