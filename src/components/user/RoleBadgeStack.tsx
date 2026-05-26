import type { Role } from "@/application/slices/sessionSlice";

const ORDER: Role[] = ["super_admin", "admin", "g12", "leader", "student", "member"];

const LABELS: Record<Role, string> = {
  super_admin: "super admin",
  admin: "admin",
  g12: "G12",
  leader: "leader",
  student: "student",
  member: "member",
};

interface Props {
  roles: readonly string[] | undefined;
  className?: string;
}

/**
 * Renders a horizontal stack of role chips, sorted by role precedence
 * (highest first). Unknown role strings are ignored.
 */
export function RoleBadgeStack({ roles, className }: Props) {
  const display = Array.from(new Set((roles ?? []).filter((r): r is Role => ORDER.includes(r as Role))))
    .sort((a, b) => ORDER.indexOf(a as Role) - ORDER.indexOf(b as Role)) as Role[];

  if (display.length === 0) return null;

  return (
    <span className={["role-stack", className].filter(Boolean).join(" ")}>
      {display.map((r) => (
        <span key={r} className={`role-chip ${r}`}>
          {LABELS[r]}
        </span>
      ))}
    </span>
  );
}
