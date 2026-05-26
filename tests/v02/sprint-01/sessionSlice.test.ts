import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import sessionReducer, {
  setUser,
  setActiveRole,
  clearSession,
  type SessionUser,
} from "@/application/slices/sessionSlice";

function makeStore() {
  return configureStore({ reducer: { session: sessionReducer } });
}

const user: SessionUser = {
  uid: "u-123",
  email: "u@example.com",
  roles: ["member", "student", "admin"],
  status: "approved",
  firstName: "Test",
  lastName: "User",
  profilePhotoUrl: null,
};

beforeEach(() => {
  // Vitest provides a real localStorage via jsdom — clear between tests.
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sessionSlice", () => {
  it("setUser picks the highest priority role as activeRole when none is saved", () => {
    const store = makeStore();
    store.dispatch(setUser(user));
    expect(store.getState().session.activeRole).toBe("admin");
  });

  it("setUser honours a saved activeRole from localStorage if it's a held role", () => {
    localStorage.setItem(`edupath.activeRole.${user.uid}`, "student");
    const store = makeStore();
    store.dispatch(setUser(user));
    expect(store.getState().session.activeRole).toBe("student");
  });

  it("setUser ignores a saved activeRole that the user does not actually hold", () => {
    localStorage.setItem(`edupath.activeRole.${user.uid}`, "g12");
    const store = makeStore();
    store.dispatch(setUser(user));
    expect(store.getState().session.activeRole).toBe("admin"); // falls back to highest
  });

  it("setActiveRole rejects a role the user does not hold", () => {
    const store = makeStore();
    store.dispatch(setUser(user));
    store.dispatch(setActiveRole("g12")); // user doesn't hold g12
    expect(store.getState().session.activeRole).toBe("admin"); // unchanged
  });

  it("setActiveRole persists the new role to localStorage", () => {
    const store = makeStore();
    store.dispatch(setUser(user));
    store.dispatch(setActiveRole("student"));
    expect(localStorage.getItem(`edupath.activeRole.${user.uid}`)).toBe("student");
  });

  it("clearSession removes both user and the persisted activeRole", () => {
    const store = makeStore();
    store.dispatch(setUser(user));
    store.dispatch(setActiveRole("student"));
    expect(localStorage.getItem(`edupath.activeRole.${user.uid}`)).toBe("student");
    store.dispatch(clearSession());
    expect(store.getState().session.user).toBeNull();
    expect(store.getState().session.activeRole).toBeNull();
    expect(localStorage.getItem(`edupath.activeRole.${user.uid}`)).toBeNull();
  });
});
