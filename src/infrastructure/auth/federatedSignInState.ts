/**
 * Module-level flag set while a federated sign-in (Google / Apple) is in flight.
 *
 * The V2 federated flow is:
 *   signInWithPopup → signOut → POST /auth/federated/* → signInWithCustomToken
 *
 * Each step fires onIdTokenChanged. The intermediate firings would make
 * FirebaseAuthListener call GET /me against a Firebase UID that has no backend
 * row yet (the row is created server-side during the exchange step). The 404
 * caused the original bug where new Google sign-ups got stuck on /login.
 *
 * While this flag is true the listener skips its work and waits for the final
 * signInWithCustomToken event, which lands a fully-provisioned UID where /me
 * will succeed.
 */
let inProgress = false;

export function setFederatedSignInInProgress(v: boolean): void {
  inProgress = v;
}

export function isFederatedSignInInProgress(): boolean {
  return inProgress;
}
