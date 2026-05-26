/**
 * Which roles a cell-member typeahead should surface, based on who is doing
 * the searching:
 *   - Leader → Members + Students
 *   - G12    → Members + Students + Leaders (their network includes leaders)
 *   - Admin / Super Admin → unfiltered
 *
 * Returns `null` when no role filter should be applied.
 *
 * NOTE: This is a temporary client-side narrowing — the V2 spec gives the
 * backend the authority to scope `/users?roles=...` per caller, but until
 * Leader / G12 access to that endpoint is finalised on the server we ship the
 * filter as a query param so the UI does the right thing on its own.
 */
export function cellMemberSearchRoles(
  callerRoles: readonly string[] | undefined,
): string[] | null {
  if (!callerRoles || callerRoles.length === 0) return null;
  if (callerRoles.includes("admin") || callerRoles.includes("super_admin")) return null;
  if (callerRoles.includes("g12")) return ["member", "student", "leader"];
  if (callerRoles.includes("leader")) return ["member", "student"];
  return null;
}
