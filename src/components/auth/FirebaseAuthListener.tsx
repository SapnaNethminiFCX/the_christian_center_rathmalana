"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/auth";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { store } from "@/application/store";
import {
  setUser,
  setAuthResolving,
  clearSession,
  DASHBOARD_BY_ROLE,
  type SessionUser,
} from "@/application/slices/sessionSlice";
import { tokenService } from "@/infrastructure/firebase/tokenService";
import { isFederatedSignInInProgress } from "@/infrastructure/auth/federatedSignInState";

/** Module-level cache so logout can pass the token to DELETE /me/fcm-token. */
let _cachedFcmToken: string | null = null;
export function getCachedFcmToken() { return _cachedFcmToken; }
export function clearCachedFcmToken() { _cachedFcmToken = null; }

/**
 * Register the FCM push token after login (best-effort — never blocks the login
 * flow). Requires Notification permission and a NEXT_PUBLIC_FCM_VAPID_KEY env.
 */
async function registerFcmToken() {
  try {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) return; // not configured — skip silently

    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging();

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;

    const token = await getToken(messaging, { vapidKey });
    if (!token) return;
    _cachedFcmToken = token;
    await apiRequest("/me/fcm-token", { method: "POST", body: { token } }).catch(() => null);
  } catch {
    // FCM errors are non-fatal — swallow silently
  }
}

/**
 * Listens to Firebase auth state changes.
 *
 * On page reload, Firebase fires onIdTokenChanged(null) ONCE before restoring
 * the session from IndexedDB. We skip that initial null event so API hooks
 * don't fire unauthenticated requests. A 3-second safety timeout ensures we
 * never get stuck in authResolving=true if the user is genuinely logged out.
 */
export function FirebaseAuthListener({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    let firstEvent = true;
    let safetyTimer: ReturnType<typeof setTimeout>;

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      // Federated sign-in (Google/Apple) goes:
      //   signInWithPopup → signOut → POST /auth/federated/* → signInWithCustomToken
      // Each step fires onIdTokenChanged. Skip the intermediate firings — the
      // final signInWithCustomToken event arrives after the suppression flag
      // has been cleared and is processed normally below.
      if (isFederatedSignInInProgress()) return;

      if (!fbUser) {
        if (firstEvent) {
          // Skip the initial null — Firebase is still restoring from IndexedDB.
          // Set a safety timeout so we don't stay stuck if the user is truly logged out.
          firstEvent = false;
          safetyTimer = setTimeout(() => {
            dispatch(clearSession());
            dispatch(setAuthResolving(false));
          }, 3000);
          return;
        }
        // Actual sign-out event — clear immediately.
        clearTimeout(safetyTimer);
        tokenService.clear();
        dispatch(clearSession());
        dispatch(setAuthResolving(false));
        return;
      }

      clearTimeout(safetyTimer);
      firstEvent = false;

      try {
        // Warm the in-memory token cache; apiRequest pulls from tokenService.
        await tokenService.get();

        const me = await apiRequest<SessionUser>("/me");

        // V2: only `suspended` accounts are blocked. No approval queue.
        if (me.status === "suspended") {
          await auth.signOut();
          dispatch(clearSession());
          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            const isProtected =
              path.startsWith("/dashboard") ||
              path.startsWith("/my-courses") ||
              path.startsWith("/browse-courses") ||
              path.startsWith("/profile") ||
              path.startsWith("/notifications") ||
              path.startsWith("/home") ||
              path.startsWith("/my-cells") ||
              path.startsWith("/my-requests") ||
              path.startsWith("/cells") ||
              path.startsWith("/leader") ||
              path.startsWith("/g12") ||
              path.startsWith("/admin") ||
              path.startsWith("/super-admin") ||
              path.startsWith("/apply");
            if (isProtected) {
              window.location.href = "/login?reason=suspended";
            }
          }
          return;
        }

        dispatch(setUser(me));

        // Redirect to role-appropriate dashboard ONLY when the user is sitting
        // on an auth landing page. This catches federated sign-in (Google /
        // Apple via signInWithPopup), where there's no onSubmit handler to do
        // the routing. We don't redirect from other paths because token
        // refreshes also fire this listener — we shouldn't kick mid-session
        // users away from the page they were on.
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path === "/login" || path === "/register" || path === "/") {
            const activeRole = store.getState().session.activeRole ?? "member";
            router.push(DASHBOARD_BY_ROLE[activeRole]);
          }
        }

        // Register FCM push token after every successful sign-in.
        // Best-effort — never blocks the login flow.
        void registerFcmToken();
      } catch (err) {
        if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
          await auth.signOut();
          dispatch(clearSession());
          // Same rule — only kick to /login from protected routes.
          if (typeof window !== "undefined" && err.status === 403) {
            const path = window.location.pathname;
            const isProtected =
              path.startsWith("/dashboard") ||
              path.startsWith("/my-courses") ||
              path.startsWith("/browse-courses") ||
              path.startsWith("/profile") ||
              path.startsWith("/notifications") ||
              path.startsWith("/admin") ||
              path.startsWith("/super-admin");
            if (isProtected) window.location.href = "/login?reason=suspended";
          }
        }
      } finally {
        dispatch(setAuthResolving(false));
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
