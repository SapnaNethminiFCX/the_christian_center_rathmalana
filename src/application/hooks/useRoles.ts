"use client";

import { useMemo } from "react";
import { useAppSelector } from "./useAppSelector";
import type { Role } from "@/application/slices/sessionSlice";

export interface UseRolesResult {
  /** Roles as returned by the server. */
  roles: Role[];
  /** Roles with super_admin expanded to include admin (FR-R-002). */
  effective: Role[];
  /** The role the user is currently acting as. */
  activeRole: Role | null;
  /** Convenience: activeRole, or fallback to highest assigned. */
  primary: Role | null;
  isMember: boolean;
  isStudent: boolean;
  isLeader: boolean;
  isG12: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** True if the user's effective roles include any of the required roles. */
  can: (required: Role[]) => boolean;
}

const ROLE_PRIORITY: Role[] = ["super_admin", "admin", "g12", "leader", "student", "member"];

function pickPrimary(roles: Role[]): Role | null {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return null;
}

/**
 * Central role / permission hook.
 *
 * The server returns `roles[]` (additive multi-role model — FR-R-001). The
 * client adds a `super_admin → admin` inheritance to `effective` so every
 * "admin can do X" check also matches super admins, without duplicating that
 * logic at each call site.
 *
 * Prefer `useRoles().can([...])` over reading `user.roles` directly — it
 * handles inheritance and accepts the empty-array case cleanly.
 */
export function useRoles(): UseRolesResult {
  const userRoles = useAppSelector((s) => s.session.user?.roles);
  const activeRole = useAppSelector((s) => s.session.activeRole);

  return useMemo<UseRolesResult>(() => {
    const roles = ((userRoles ?? []) as Role[]).filter(Boolean);
    const effective = roles.includes("super_admin")
      ? Array.from(new Set<Role>([...roles, "admin"]))
      : roles;
    const primary = activeRole ?? pickPrimary(roles);

    return {
      roles,
      effective,
      activeRole,
      primary,
      isMember: effective.includes("member"),
      isStudent: effective.includes("student"),
      isLeader: effective.includes("leader"),
      isG12: effective.includes("g12"),
      isAdmin: effective.includes("admin"),
      isSuperAdmin: effective.includes("super_admin"),
      can: (required) => {
        if (required.length === 0) return false;
        return required.some((r) => effective.includes(r));
      },
    };
  }, [userRoles, activeRole]);
}
