"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LEADER_NAV, G12_NAV } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/leader\/dashboard/, title: "Leader Dashboard" },
  { test: /^\/leader\/analytics/, title: "Analytics" },
  { test: /^\/cells\/new/, title: "New Cell" },
  { test: /^\/cells\/[^/]+\/reports\/new/, title: "Cell Report" },
  { test: /^\/cells\/[^/]+\/reports\/[^/]+/, title: "Report" },
  { test: /^\/cells\/[^/]+\/edit/, title: "Edit Cell" },
  { test: /^\/cells\/[^/]+\/members/, title: "Cell Members" },
  { test: /^\/cells\/[^/]+/, title: "Cell" },
  { test: /^\/cells/, title: "Cells" },
];

/**
 * Shell for cell-management surfaces.
 *
 * Both Leader and G12 share the same /cells routes (same data, same forms).
 * The sidebar must reflect the viewer's *actual* role, otherwise a G12 user
 * who clicks "Cells" in the G12 sidebar would land here under LEADER_NAV
 * (incorrectly flipping them into Leader-mode).
 *
 * Rule:
 *   - viewer holds `g12` → render G12_NAV, dashboard href = /g12/dashboard
 *   - viewer holds `leader` (without g12) → LEADER_NAV, /leader/dashboard
 *
 * Admin / Super Admin who hit this layout (rare in practice — they don't
 * usually hold leader/g12) fall through to LEADER_NAV.
 */
export default function LeaderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "Cell Groups";
  const user = useSessionUser();
  const roles = useAppSelector((s) => s.session.user?.roles ?? []);

  const isG12 = roles.includes("g12");
  const navItems = isG12 ? G12_NAV : LEADER_NAV;
  const roleLabel = isG12 ? "G12 Leader" : "Leader";
  const dashboardHref = isG12 ? "/g12/dashboard" : "/leader/dashboard";

  return (
    <AuthGuard allowedRoles={["leader", "g12", "admin", "super_admin"]}>
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
