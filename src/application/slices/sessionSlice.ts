import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";

export type Role =
  | "member"        // V2: every authenticated user holds this implicitly
  | "student"
  | "leader"        // V2: cell-group leader
  | "g12"           // V2: senior leader overseeing leaders
  | "admin"
  | "super_admin";
/** V2 statuses. pending_approval is a V1 legacy value the backend may still
 *  return during migration — treated client-side as a plain Member. */
export type UserStatus = "approved" | "suspended" | "pending_approval" | "rejected";

/** Where each role lands after login. Picked by the user's activeRole.
 *  member/student always start at /home — the member hub. From there they
 *  navigate to Bible School, cells, etc. Admin roles go to their dashboards. */
export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  member:      "/home",
  student:     "/home",
  leader:      "/home",
  g12:         "/home",
  admin:       "/admin/dashboard",
  super_admin: "/super-admin/dashboard",
};

const ROLE_LITERALS: ReadonlySet<Role> = new Set<Role>([
  "member",
  "student",
  "leader",
  "g12",
  "admin",
  "super_admin",
]);

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && ROLE_LITERALS.has(v as Role);
}

export interface SessionUser {
  uid: string;
  email: string;
  /** V1 scalar — backend may still send it; kept optional. Read roles[] instead. */
  role?: Role;
  roles: string[];
  /** V2 user profile additions. */
  preferredLanguage?: "si" | "ta" | "en";
  providers?: string[];
  notificationPreferences?: { email: boolean; push: boolean };
  status: UserStatus;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePhotoUrl: string | null;
  /** Extended profile (PATCH /me §3.2). Required by the student
   *  role-request flow per spec; optional on the profile form itself —
   *  the apply page just warns when they're missing. */
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "other" | null;
  address?: string | null;
  qualificationTitle?: string | null;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
  avatar?: string;
}

export interface SessionState {
  user: SessionUser | null;
  /**
   * The role the user is currently acting as. Picked from the user's roles[]
   * at login (highest assigned, or last-saved preference from localStorage).
   * Used by the sidebar, route guards, and dashboard redirect logic.
   */
  activeRole: Role | null;
  authResolving: boolean;
}

const initialState: SessionState = {
  user: null,
  activeRole: null,
  authResolving: true,
};

/** Pick the highest assigned role as the default active role.
 *  Priority: super_admin > admin > g12 > leader > student > member. */
function pickDefaultActiveRole(roles: string[] | undefined): Role {
  const set = new Set(roles ?? []);
  if (set.has("super_admin")) return "super_admin";
  if (set.has("admin")) return "admin";
  if (set.has("g12")) return "g12";
  if (set.has("leader")) return "leader";
  if (set.has("student")) return "student";
  return "member";
}

/** Restore the user's last-selected active role from localStorage. */
function readSavedActiveRole(uid: string): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(`edupath.activeRole.${uid}`);
    return isRole(v) ? v : null;
  } catch { /* ignore */ }
  return null;
}

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<SessionUser | null>) {
      if (action.payload) {
        const u = action.payload;

        // Trust roles[] from the backend as the source of truth.
        // "pending_approval" status is a V1 legacy artifact that the backend
        // never updates — roles[] is what actually reflects granted permissions.
        const raw = u.roles?.length ? u.roles : (u.role ? [u.role] : []);
        const effectiveRoles = raw.includes("member") ? raw : ["member", ...raw];

        state.user = {
          ...u,
          roles: effectiveRoles,
          name: u.name ?? `${u.firstName} ${u.lastName}`.trim(),
        };

        const saved = readSavedActiveRole(u.uid);
        const defaultActive = pickDefaultActiveRole(effectiveRoles);
        if (saved && effectiveRoles.includes(saved)) {
          state.activeRole = saved as Role;
        } else {
          state.activeRole = defaultActive;
        }
      } else {
        state.user = null;
        state.activeRole = null;
      }
    },
    setActiveRole(state, action: PayloadAction<Role>) {
      // Only switch if the user actually holds that role.
      if (!state.user) return;
      if (!state.user.roles.includes(action.payload)) return;
      state.activeRole = action.payload;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`edupath.activeRole.${state.user.uid}`, action.payload);
        } catch { /* ignore */ }
      }
    },
    setAuthResolving(state, action: PayloadAction<boolean>) {
      state.authResolving = action.payload;
    },
    clearSession(state) {
      if (state.user && typeof window !== "undefined") {
        try {
          localStorage.removeItem(`edupath.activeRole.${state.user.uid}`);
        } catch { /* ignore */ }
      }
      state.user = null;
      state.activeRole = null;
      state.authResolving = false;
    },
  },
  extraReducers: (builder) => {
    // When redux-persist rehydrates on page reload, reset authResolving to true
    // so API hooks wait for Firebase to restore its session before fetching.
    builder.addCase(REHYDRATE, (state) => {
      state.authResolving = true;
    });
  },
});

export const { setUser, setActiveRole, setAuthResolving, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;
