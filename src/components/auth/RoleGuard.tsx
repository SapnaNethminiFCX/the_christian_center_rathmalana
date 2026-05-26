"use client";

import { useRoles } from "@/application/hooks/useRoles";
import type { Role } from "@/application/slices/sessionSlice";

interface Props {
  /** Render children only if the user holds ANY of these roles. */
  allowAny: Role[];
  /** Optional content to render when access is denied (default: render nothing). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * In-page role gate. Use inside pages / components to hide a button, panel,
 * or action when the user's effective roles don't include any of the listed
 * required roles. `super_admin → admin` inheritance is honoured because the
 * underlying `useRoles().can()` uses the expanded `effective` list.
 *
 * Distinct from `<AuthGuard>`, which mounts in route-group layouts and
 * redirects on miss. RoleGuard never redirects; it just hides.
 */
export function RoleGuard({ allowAny, fallback = null, children }: Props) {
  const { can } = useRoles();
  return <>{can(allowAny) ? children : fallback}</>;
}
