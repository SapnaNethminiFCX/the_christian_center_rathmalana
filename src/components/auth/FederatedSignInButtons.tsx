"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { auth } from "@/infrastructure/firebase/auth";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { setFederatedSignInInProgress } from "@/infrastructure/auth/federatedSignInState";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { AppleIcon } from "./AppleIcon";

interface Props {
  context?: "signin" | "signup";
  disabled?: boolean;
}

interface FederatedExchangeResponse {
  firebaseToken: string;
  uid: string;
  isNewUser: boolean;
}

/**
 * Google + Apple federated sign-in (V2 spec §2.2).
 *
 * Flow:
 *   1. signInWithPopup — pop the provider OAuth flow, extract the provider
 *      ID token from the result. We don't keep the Firebase session this
 *      creates; we only wanted the ID token.
 *   2. signOut — discard the popup-created Firebase session.
 *   3. POST /auth/federated/{google|apple} with the provider ID token.
 *      Backend verifies the token, creates the Member row + Firebase user
 *      (via Admin SDK) if new, and returns a Firebase custom token.
 *   4. signInWithCustomToken — establish the real Firebase session for a
 *      UID that already has a backend row, so the listener's /me call will
 *      succeed and routing will happen.
 *
 * setFederatedSignInInProgress suppresses FirebaseAuthListener during the
 * popup → signOut → exchange dance, so it doesn't call /me against an
 * unprovisioned UID partway through.
 */
export function FederatedSignInButtons({ context = "signin", disabled }: Props) {
  const dispatch = useAppDispatch();
  const preferredLanguage = useAppSelector((s) => s.locale.current);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function handleFederated(provider: "google" | "apple") {
    if (busy) return;
    setBusy(provider);

    const label = provider === "google" ? "Google" : "Apple";
    const action = context === "signin" ? "sign-in" : "sign-up";

    setFederatedSignInInProgress(true);

    try {
      const authProvider =
        provider === "google"
          ? (() => {
              const gp = new GoogleAuthProvider();
              gp.addScope("email");
              gp.addScope("profile");
              return gp;
            })()
          : (() => {
              const ap = new OAuthProvider("apple.com");
              ap.addScope("email");
              ap.addScope("name");
              return ap;
            })();

      // Step 1: get the provider ID token via Firebase's popup flow.
      const result = await signInWithPopup(auth, authProvider);

      const credential =
        provider === "google"
          ? GoogleAuthProvider.credentialFromResult(result)
          : OAuthProvider.credentialFromResult(result);
      const providerIdToken = credential?.idToken;

      if (!providerIdToken) {
        throw new Error(`No ${label} ID token returned from sign-in popup`);
      }

      // Step 2: discard the popup-created Firebase session. The backend will
      // mint the real one in step 3.
      await signOut(auth);

      // Step 3: exchange the provider ID token for a Firebase custom token.
      // Endpoint is public per V2 spec §2.2 — no Authorization header.
      const endpoint =
        provider === "google" ? "/auth/federated/google" : "/auth/federated/apple";
      const exchange = await apiRequest<FederatedExchangeResponse>(endpoint, {
        method: "POST",
        auth: false,
        body: { idToken: providerIdToken, preferredLanguage },
      });

      // Step 4: clear the suppression flag so FirebaseAuthListener processes
      // the next onIdTokenChanged event normally, then sign in with the
      // backend-minted custom token.
      setFederatedSignInInProgress(false);
      await signInWithCustomToken(auth, exchange.firebaseToken);
    } catch (err) {
      setFederatedSignInInProgress(false);
      // Make sure we're not left holding a half-finished Firebase session
      // from the popup step.
      await signOut(auth).catch(() => null);

      const code = (err as { code?: string })?.code ?? "unknown";
      console.error(`[FederatedSignIn] ${provider} error:`, code, err);

      // Don't show a toast when the user closed the popup themselves.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Something went wrong. Please use email + password instead.";
      if (code === "auth/operation-not-allowed") {
        message = `${label} sign-in is not enabled in Firebase Console. Enable it under Authentication → Sign-in method → ${label}.`;
      } else if (code === "auth/account-exists-with-different-credential") {
        message = "An account with this email uses a different sign-in method. Sign in that way first.";
      } else if (code === "auth/network-request-failed") {
        message = "Network error. Check your connection and try again.";
      } else if (code === "auth/popup-blocked") {
        message = "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
      } else if (code === "auth/unauthorized-domain") {
        message = "This domain isn't authorized for sign-in. Add it under Firebase → Authentication → Settings → Authorized domains.";
      } else if (code === "auth/user-disabled") {
        message = `This ${label} account is disabled. Contact an administrator.`;
      } else if (code === "auth/invalid-credential" && provider === "apple") {
        message = "Apple rejected the sign-in. The Services ID, Team ID, Key ID, or private key in Firebase Console may not match the Apple Developer registration.";
      } else if (err instanceof ApiRequestError) {
        if (err.status === 401 && err.code === "FEDERATED_TOKEN_INVALID") {
          message = `${label} rejected the sign-in token. Please try again.`;
        } else if (err.status === 404) {
          message = `${label} sign-in is not yet available on the server. Please try again later.`;
        } else {
          message = err.message;
        }
      }

      dispatch(
        pushToast({
          tone: "warning",
          title: `${label} ${action} failed`,
          message,
        }),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fed-row">
        <button
          type="button"
          className="fed-btn"
          disabled={disabled || busy !== null}
          onClick={() => handleFederated("google")}
          aria-label="Continue with Google"
        >
          <GoogleIcon size={18} />
          {busy === "google" ? "Signing in…" : "Google"}
        </button>
        <button
          type="button"
          className="fed-btn"
          disabled={disabled || busy !== null}
          onClick={() => handleFederated("apple")}
          aria-label="Continue with Apple"
        >
          <AppleIcon size={18} />
          {busy === "apple" ? "Signing in…" : "Apple"}
        </button>
      </div>
      <div className="fed-divider">OR CONTINUE WITH EMAIL</div>
    </>
  );
}
