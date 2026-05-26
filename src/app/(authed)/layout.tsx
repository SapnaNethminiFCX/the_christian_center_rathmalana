"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MEMBER_NAV, STUDENT_NAV, type NavItem } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { setActiveRole } from "@/application/slices/sessionSlice";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/home/, title: "Home" },
  { test: /^\/school/, title: "Bible School" },
  { test: /^\/apply\/student\/pending/, title: "Application Submitted" },
  { test: /^\/apply\/student/, title: "Apply to Become a Student" },
  { test: /^\/my-requests/, title: "My Requests" },
  { test: /^\/my-cells\/[^/]+/, title: "Cell" },
  { test: /^\/my-cells/, title: "My Cells" },
  { test: /^\/profile/, title: "Profile" },
  { test: /^\/notifications/, title: "Notifications" },
];

/**
 * Universal authenticated shell.
 *
 * For most routes this is the Member cross-module hub — the sidebar shows
 * MEMBER_NAV regardless of the viewer's elevated roles, so a G12 / Leader /
 * Student clicking "Home" gets the full Member experience.
 *
 * For `/my-requests` the rule flips: the page is the user's *own* requests,
 * so the sidebar follows the user's highest-priority active role. A Student
 * clicking "My Requests" from their Student sidebar stays in the Student
 * shell; a Leader stays in Leader shell; a pure Member stays in MEMBER_NAV.
 * This stops the route from yanking the user out of their working context.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "TCCR";
  const user = useSessionUser();
  const dispatch = useAppDispatch();
  const activeRole = useAppSelector((s) => s.session.activeRole);

  // Sync activeRole to "member" on Member-specific pages (home, school,
  // my-cells, my-requests, apply). The shared surfaces (profile, notifications)
  // intentionally do NOT update activeRole — they preserve whatever the user
  // came from (Member or Student).
  const isMemberSurface = /^\/(home|school|my-cells|my-requests|apply)/.test(pathname);
  useEffect(() => {
    if (user && isMemberSurface && activeRole !== "member") {
      dispatch(setActiveRole("member"));
    }
  }, [user, isMemberSurface, activeRole, dispatch]);

  // Default: Member shell for all (authed) routes.
  let navItems: NavItem[] = MEMBER_NAV;
  let roleLabel = "Member";
  let dashboardHref = "/home";

  // Profile and Notifications are shared surfaces. For Member+Student dual-role
  // users they should *follow the active section*: if the user came from the
  // Student sidebar (activeRole === "student"), keep them in the Student shell
  // — otherwise stay in Member. Pure Members are always activeRole === "member"
  // and therefore unaffected.
  const isSharedSurface = /^\/(profile|notifications)/.test(pathname);
  if (isSharedSurface && activeRole === "student") {
    navItems = STUDENT_NAV;
    roleLabel = "Student";
    dashboardHref = "/dashboard";
  }

  return (
    <AuthGuard allowedRoles={["member", "student", "leader", "g12", "admin", "super_admin"]}>
      <AppShell
        navItems={navItems}
        user={user}
        roleLabel={roleLabel}
        title={title}
        dashboardHref={dashboardHref}
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
