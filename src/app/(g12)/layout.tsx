"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { G12_NAV } from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/g12\/dashboard/, title: "G12 Dashboard" },
  { test: /^\/g12\/network/, title: "Network" },
  { test: /^\/g12\/promote/, title: "Promote" },
  { test: /^\/g12\/analytics/, title: "G12 Analytics" },
];

/**
 * G12 shell — accessible to G12, Admin, Super Admin.
 */
export default function G12Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "G12";
  const user = useSessionUser();

  return (
    <AuthGuard allowedRoles={["g12", "admin", "super_admin"]}>
      <AppShell
        navItems={G12_NAV}
        user={user}
        roleLabel="G12 Leader"
        title={title}
        dashboardHref="/g12/dashboard"
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
