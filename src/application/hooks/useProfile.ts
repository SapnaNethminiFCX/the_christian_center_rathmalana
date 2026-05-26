"use client";

import { useState, useCallback } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { setLocale } from "@/application/slices/localeSlice";
import { setUser, type SessionUser } from "@/application/slices/sessionSlice";
import { API_PREFIX, apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { auth } from "@/infrastructure/firebase/auth";

interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  preferredLanguage?: "si" | "ta" | "en";
  profilePhotoUrl?: string | null;
  /** Extended fields per PATCH /me §3.2. Required by the student
   *  role-request flow; nullable on the endpoint itself. */
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "other" | null;
  address?: string | null;
  qualificationTitle?: string | null;
  /** V2 PATCH /me §3.2: ordered list of qualification entries. The first
   *  entry is auto-used as the primary qualification on role requests. */
  qualifications?: { id: string; title: string; fileUrl: string | null }[];
}

export function useProfile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<"google" | "apple" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState("");

  const setFieldError = (field: string, msg: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  const clearAllErrors = () => setFieldErrors({});

  /**
   * Update profile via PATCH /me.
   *
   * Caller is expected to send the FULL profile payload every time (all
   * PATCH-able fields per spec §3.2), not just dirty ones. This keeps the
   * backend's view of the user's profile complete on every save.
   *
   * Does NOT write to Redux. Redux is the source of truth for the
   * SIGNED-IN user as established by the most recent GET /me; PATCH /me
   * here just fires the save request. The next GET /me (page reload,
   * re-login, etc.) will refresh Redux from the server's canonical state.
   */
  const updateProfile = useCallback(
    async (changes: ProfileUpdate): Promise<boolean> => {
      if (Object.keys(changes).length === 0) return true;
      setSaving(true);
      clearAllErrors();
      try {
        await apiRequest<SessionUser>("/me", {
          method: "PATCH",
          body: changes,
        });
        // Locale slice is a UI-only concern (controls next-intl catalogue)
        // and lives outside the session user, so flip it immediately on
        // language change so the UI re-renders in the new language.
        if (changes.preferredLanguage) {
          dispatch(setLocale(changes.preferredLanguage));
        }
        dispatch(pushToast({ tone: "success", title: "Profile saved" }));
        return true;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.status === 400 && err.details) {
            Object.entries(err.details).forEach(([k, v]) => {
              setFieldError(k, Array.isArray(v) ? v[0] : String(v));
            });
            dispatch(pushToast({ tone: "warning", title: "Please fix the errors below" }));
          } else {
            dispatch(pushToast({ tone: "warning", title: "Couldn't save profile", message: err.message }));
          }
        } else {
          dispatch(pushToast({ tone: "warning", title: "Couldn't save profile" }));
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [dispatch],
  );

  /**
   * Upload avatar via POST /me/avatar (multipart, max 2 MB, JPEG/PNG).
   * Returns the new profilePhotoUrl on success.
   */
  const uploadAvatar = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Only JPG and PNG are accepted." }));
        return null;
      }
      if (file.size > 2 * 1024 * 1024) {
        dispatch(pushToast({ tone: "warning", title: "File too large", message: "Max 2 MB. Please resize the image first." }));
        return null;
      }
      setUploadingAvatar(true);
      try {
        const form = new FormData();
        form.append("photo", file);

        // multipart upload — cannot use apiRequest's JSON serialisation
        const { tokenService } = await import("@/infrastructure/firebase/tokenService");
        const token = await tokenService.get();
        const res = await fetch(`${API_PREFIX}/me/avatar`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Accept-Language": localStorage.getItem("edupath.locale") ?? "en",
          },
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
          dispatch(pushToast({ tone: "warning", title: "Upload failed", message: err?.error?.message ?? "Please try again." }));
          return null;
        }

        const { profilePhotoUrl } = await res.json() as { profilePhotoUrl: string };
        dispatch(setUser({ ...user!, profilePhotoUrl }));
        dispatch(pushToast({ tone: "success", title: "Photo updated" }));
        return profilePhotoUrl;
      } catch {
        dispatch(pushToast({ tone: "warning", title: "Upload failed", message: "Check your connection and try again." }));
        return null;
      } finally {
        setUploadingAvatar(false);
      }
    },
    [dispatch, user],
  );

  /**
   * Upload a qualification PDF via POST /me/qualification (multipart).
   * Backend uploads to Firebase Storage and returns the hosted URL, which
   * the caller then includes in the next PATCH /me { qualifications: [...] }
   * payload to associate the file with a specific entry.
   *
   * Per spec §3.2, `fileUrl` on a qualification entry IS this URL.
   *
   * Toasts on failure; on success the caller chains the URL into PATCH /me
   * (no toast here so the unified Save flow only shows one success toast).
   */
  const uploadQualification = useCallback(
    async (file: File): Promise<string | null> => {
      if (file.type !== "application/pdf") {
        dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Only PDF files are accepted." }));
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        dispatch(pushToast({ tone: "warning", title: "File too large", message: "Max 5 MB per attachment." }));
        return null;
      }
      try {
        const form = new FormData();
        // Backend expects the form field named "qualification" — confirmed
        // against the POST /me/qualification endpoint contract.
        form.append("qualification", file);

        const { tokenService } = await import("@/infrastructure/firebase/tokenService");
        const token = await tokenService.get();
        const res = await fetch(`${API_PREFIX}/me/qualification`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Accept-Language": localStorage.getItem("edupath.locale") ?? "en",
          },
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
          dispatch(pushToast({
            tone: "warning",
            title: "Couldn't upload PDF",
            message: err?.error?.message ?? `Server returned ${res.status}.`,
          }));
          return null;
        }

        // Defensive parse — backend response shape may vary. Try the obvious
        // fields in order: fileUrl, url, qualificationUrl, downloadUrl.
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        const url =
          typeof data.fileUrl === "string"           ? data.fileUrl
          : typeof data.url === "string"             ? data.url
          : typeof data.qualificationUrl === "string" ? data.qualificationUrl
          : typeof data.downloadUrl === "string"     ? data.downloadUrl
          : null;
        if (!url) {
          dispatch(pushToast({
            tone: "warning",
            title: "Upload returned no URL",
            message: "The PDF reached the server but no fileUrl came back. Check backend response shape.",
          }));
          return null;
        }
        return url;
      } catch {
        dispatch(pushToast({ tone: "warning", title: "Upload failed", message: "Check your connection and try again." }));
        return null;
      }
    },
    [dispatch],
  );

  /** Change password via POST /me/change-password. */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      setSavingPassword(true);
      setPasswordError("");
      try {
        await apiRequest("/me/change-password", {
          method: "POST",
          body: { currentPassword, newPassword },
        });
        dispatch(pushToast({ tone: "success", title: "Password updated", message: "You'll stay signed in on this device." }));
        return true;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.status === 400 && err.details) {
            const firstField = Object.keys(err.details)[0];
            const msg = err.details[firstField];
            setPasswordError(Array.isArray(msg) ? msg[0] : String(msg));
          } else if (err.status === 401) {
            setPasswordError("Current password is incorrect.");
          } else {
            setPasswordError(err.message || "Couldn't update password.");
          }
        } else {
          setPasswordError("Couldn't update password.");
        }
        return false;
      } finally {
        setSavingPassword(false);
      }
    },
    [dispatch],
  );

  /** Update notification preferences via PATCH /me/notifications/preferences. */
  const updateNotificationPrefs = useCallback(
    async (prefs: { email: boolean; push: boolean }): Promise<void> => {
      setSavingPrefs(true);
      try {
        const updated = await apiRequest<{ email: boolean; push: boolean }>(
          "/me/notifications/preferences",
          { method: "PATCH", body: prefs },
        );
        dispatch(setUser({ ...user!, notificationPreferences: updated }));
      } catch {
        dispatch(pushToast({ tone: "warning", title: "Couldn't save preferences" }));
      } finally {
        setSavingPrefs(false);
      }
    },
    [dispatch, user],
  );

  /** Link Google or Apple via popup → POST /me/providers/link. */
  const linkProvider = useCallback(
    async (provider: "google" | "apple"): Promise<void> => {
      setLinkingProvider(provider);
      try {
        const authProvider =
          provider === "google"
            ? (() => { const gp = new GoogleAuthProvider(); gp.addScope("email"); return gp; })()
            : (() => { const ap = new OAuthProvider("apple.com"); ap.addScope("email"); return ap; })();

        const cred = await signInWithPopup(auth, authProvider);
        const oauthCred =
          provider === "google"
            ? GoogleAuthProvider.credentialFromResult(cred)
            : OAuthProvider.credentialFromResult(cred);
        const idToken = oauthCred?.idToken;
        if (!idToken) throw new Error("No ID token returned from provider.");

        const result = await apiRequest<{ providers: string[] }>("/me/providers/link", {
          method: "POST",
          body: { provider, idToken },
        });
        dispatch(setUser({ ...user!, providers: result.providers }));
        dispatch(pushToast({ tone: "success", title: `${provider === "google" ? "Google" : "Apple"} account linked` }));
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
        dispatch(pushToast({ tone: "warning", title: "Couldn't link account", message: (err as Error).message }));
      } finally {
        setLinkingProvider(null);
      }
    },
    [dispatch, user],
  );

  /** Unlink Google or Apple via DELETE /me/providers/:provider. */
  const unlinkProvider = useCallback(
    async (provider: "google" | "apple"): Promise<void> => {
      try {
        const result = await apiRequest<{ providers: string[] }>(
          `/me/providers/${provider}`,
          { method: "DELETE" },
        );
        dispatch(setUser({ ...user!, providers: result.providers }));
        dispatch(pushToast({ tone: "success", title: `${provider === "google" ? "Google" : "Apple"} account unlinked` }));
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === "INVALID_STATE") {
          dispatch(pushToast({ tone: "warning", title: "Can't unlink", message: "Add another sign-in method first." }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Couldn't unlink account" }));
        }
      }
    },
    [dispatch, user],
  );

  return {
    user,
    saving,
    uploadingAvatar,
    savingPassword,
    savingPrefs,
    linkingProvider,
    fieldErrors,
    passwordError,
    setPasswordError,
    clearFieldError,
    updateProfile,
    uploadAvatar,
    uploadQualification,
    changePassword,
    updateNotificationPrefs,
    linkProvider,
    unlinkProvider,
  };
}
