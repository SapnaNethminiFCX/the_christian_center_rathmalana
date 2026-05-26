import { auth } from "./auth";

/**
 * Returns a fresh Firebase ID token for the currently signed-in user, or null.
 * Firebase SDK auto-refreshes the token; getIdToken() returns the cached token
 * if still valid (< 5 min from expiry) or fetches a new one.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}
