"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { STUDENT_NAV } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { setActiveRole } from "@/application/slices/sessionSlice";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/dashboard/, title: "Dashboard" },
  { test: /^\/my-courses\/[^/]+\/[^/]+/, title: "Lesson" },
  { test: /^\/my-courses\/[^/]+/, title: "Course" },
  { test: /^\/my-courses/, title: "My Courses" },
  { test: /^\/browse-courses\/[^/]+/, title: "Course Details" },
  { test: /^\/browse-courses/, title: "Browse Courses" },
  { test: /^\/profile/, title: "Profile" },
  { test: /^\/notifications/, title: "Notifications" },
  { test: /^\/help/, title: "Help & Support" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "Student";
  const user = useSessionUser();
  const dispatch = useAppDispatch();
  const activeRole = useAppSelector((s) => s.session.activeRole);

  // Sync activeRole to "student" whenever the user is inside a Student-section
  // page. This is what the (authed)/profile and (authed)/notifications routes
  // read to decide whether to show STUDENT_NAV or MEMBER_NAV.
  useEffect(() => {
    if (user && activeRole !== "student") dispatch(setActiveRole("student"));
  }, [user, activeRole, dispatch]);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <AppShell
        navItems={STUDENT_NAV}
        user={user}
        roleLabel="Student"
        title={title}
        dashboardHref="/dashboard"
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
