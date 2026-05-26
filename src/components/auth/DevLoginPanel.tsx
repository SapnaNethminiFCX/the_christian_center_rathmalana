"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import {
  setUser,
  setAuthResolving,
  DASHBOARD_BY_ROLE,
  type Role,
  type SessionUser,
} from "@/application/slices/sessionSlice";
import { TCCR_DIRECTORY } from "@/lib/mock/tccrDirectory";

interface DemoRole {
  id: string;
  label: string;
  roles: Role[];
  /** Which TCCR_DIRECTORY entry to mirror name / email / avatar from. */
  directoryIndex: number;
}

const DEMO_ROLES: DemoRole[] = [
  { id: "member",         label: "Member",              roles: ["member"],                                     directoryIndex: 4  /* Nadeesha */ },
  { id: "member-student", label: "Member + Student",    roles: ["member", "student"],                          directoryIndex: 2  /* Priya */ },
  { id: "leader",         label: "Leader",              roles: ["member", "student", "leader"],                directoryIndex: 1  /* Ravi */ },
  { id: "g12",            label: "G12",                 roles: ["member", "student", "leader", "g12"],         directoryIndex: 3  /* Tania */ },
  { id: "admin",          label: "Admin",               roles: ["member", "admin"],                            directoryIndex: 8  /* Janaka */ },
  { id: "super-admin",    label: "Super Admin",         roles: ["member", "admin", "super_admin"],             directoryIndex: 0  /* Anjali — repurposed */ },
];

/**
 * Dev-only mock login. Since the backend has no notion of the new V2 roles
 * (`member`, `leader`, `g12`), this panel dispatches a fake SessionUser to
 * Redux directly — no Firebase, no API call — so we can demo every V2 surface.
 *
 * The real email/password flow above this panel is unaffected and is still
 * the only way to sign into student / admin / super_admin with real data.
 */
export function DevLoginPanel() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const onPick = (demo: DemoRole) => {
    const dir = TCCR_DIRECTORY[demo.directoryIndex];
    const [firstName, ...rest] = dir.name.split(" ");
    const lastName = rest.join(" ");

    const mockUser: SessionUser = {
      uid: `dev-${demo.id}`,
      email: dir.email,
      role: demo.roles[demo.roles.length - 1], // legacy scalar — pick highest as default
      roles: demo.roles,
      status: "approved",
      firstName,
      lastName,
      profilePhotoUrl: dir.avatar,
      name: dir.name,
      avatar: dir.avatar,
    };

    // Skip the authResolving gate — we're bypassing Firebase entirely.
    dispatch(setAuthResolving(false));
    dispatch(setUser(mockUser));

    // pickDefaultActiveRole already runs inside setUser; the resulting
    // activeRole is the highest-priority role on the user. Route to that
    // role's dashboard.
    const target = demo.roles.includes("super_admin")
      ? "super_admin"
      : demo.roles.includes("admin")
      ? "admin"
      : demo.roles.includes("g12")
      ? "g12"
      : demo.roles.includes("leader")
      ? "leader"
      : demo.roles.includes("student")
      ? "student"
      : "member";

    dispatch(
      pushToast({
        tone: "success",
        title: `Demo sign-in: ${demo.label}`,
        message: "Mock session — backend is not contacted for this role.",
      }),
    );

    router.push(DASHBOARD_BY_ROLE[target]);
  };

  return (
    <details className="dev-login">
      <summary>Demo sign-in (no backend)</summary>
      <p className="hint">
        The V2 surfaces (Member, Leader, G12) have no backend yet. Pick a role below to
        demo with a mock session. The form above still runs real Firebase auth for
        student / admin / super-admin accounts.
      </p>
      <div className="grid">
        {DEMO_ROLES.map((d) => (
          <button type="button" key={d.id} onClick={() => onPick(d)}>
            {d.label}
          </button>
        ))}
      </div>
    </details>
  );
}
