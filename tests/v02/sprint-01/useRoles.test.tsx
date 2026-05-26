import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sessionReducer, {
  setUser,
  type SessionUser,
} from "@/application/slices/sessionSlice";
import localeReducer from "@/application/slices/localeSlice";
import { useRoles } from "@/application/hooks/useRoles";

function makeStore(user: SessionUser | null) {
  const store = configureStore({
    reducer: {
      session: sessionReducer,
      locale: localeReducer,
    },
  });
  if (user) store.dispatch(setUser(user));
  return store;
}

function userWith(roles: SessionUser["roles"]): SessionUser {
  return {
    uid: "test-uid",
    email: "t@example.com",
    roles,
    status: "approved",
    firstName: "Test",
    lastName: "User",
    profilePhotoUrl: null,
  };
}

function wrap(store: ReturnType<typeof makeStore>) {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
}

describe("useRoles", () => {
  it("returns empty arrays when no user is signed in", () => {
    const { result } = renderHook(() => useRoles(), { wrapper: wrap(makeStore(null)) });
    expect(result.current.roles).toEqual([]);
    expect(result.current.effective).toEqual([]);
    expect(result.current.primary).toBeNull();
    expect(result.current.can(["admin"])).toBe(false);
  });

  it("expands super_admin to include admin in effective", () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: wrap(makeStore(userWith(["member", "super_admin"]))),
    });
    expect(result.current.effective).toEqual(
      expect.arrayContaining(["member", "super_admin", "admin"]),
    );
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(true);
  });

  it("does NOT add super_admin when only admin is held", () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: wrap(makeStore(userWith(["admin"]))),
    });
    // V2 normalisation always ensures "member" is present as the base role.
    expect(result.current.effective).toEqual(expect.arrayContaining(["member", "admin"]));
    expect(result.current.effective).not.toContain("super_admin");
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(true);
  });

  it("can() returns false for empty required array", () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: wrap(makeStore(userWith(["member", "leader"]))),
    });
    expect(result.current.can([])).toBe(false);
  });

  it("can() matches any of the required roles", () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: wrap(makeStore(userWith(["member", "leader"]))),
    });
    expect(result.current.can(["admin", "leader"])).toBe(true);
    expect(result.current.can(["g12", "admin"])).toBe(false);
  });

  it("picks the highest-priority role as primary when no activeRole is set", () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: wrap(makeStore(userWith(["member", "student", "leader"]))),
    });
    // activeRole is auto-picked by setUser; for this user-set the priority
    // ranking gives leader > student > member.
    expect(result.current.primary).toBe("leader");
  });
});
