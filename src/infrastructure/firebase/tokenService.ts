import { auth } from "./auth";

/**
 * Centralised access to the Firebase ID token.
 *
 * Firebase SDK already caches the token internally and refreshes when it's
 * within 5 minutes of expiry. This wrapper adds:
 *
 *   - A single seam every authed request goes through (one place to add
 *     instrumentation, fallback logic, etc.)
 *   - `refresh()` to force a fresh token (used after 401 retry).
 *   - `clear()` to signal "user is signed out, drop any cached state" — Firebase
 *     itself doesn't need this (it's stateless once `signOut` runs), but we
 *     keep the call so future caching can wire in here without changing call
 *     sites.
 *
 * No localStorage. No cookies. Token only lives in Firebase's IndexedDB session
 * and our in-memory caller. (Per FR-A-007 / NFR-SEC-002.)
 */
export const tokenService = {
  /** Return the current ID token, refreshing if Firebase says it's near expiry. */
  async get(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  },

  /** Force-refresh the token. Used after a 401 to retry once with a fresh token. */
  async refresh(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(/* forceRefresh */ true);
    } catch {
      return null;
    }
  },

  /** Hook for logout / sign-out cleanup. Firebase itself handles its own clear. */
  clear(): void {
    /* placeholder — held for future in-memory cache layers */
  },
};
