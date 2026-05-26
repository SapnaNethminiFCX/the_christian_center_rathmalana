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

  /** Update profile via PATCH /me — only send changed fields. */
  const updateProfile = useCallback(
    async (changes: ProfileUpdate): Promise<boolean> => {
      if (Object.keys(changes).length === 0) return true;
      setSaving(true);
      clearAllErrors();
      try {
        const updated = await apiRequest<SessionUser>("/me", {
          method: "PATCH",
          body: changes,
        });
        // Backend's PATCH response sometimes strips fields it accepts but
        // doesn't echo (e.g. `phone`). Merge the request body back so the UI
        // reflects what the user just submitted. Once backend echoes every
        // accepted field, this becomes a no-op.
        dispatch(setUser({ ...updated, ...changes } as SessionUser));
        // Keep locale slice in sync when preferred language changes.
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
    changePassword,
    updateNotificationPrefs,
    linkProvider,
    unlinkProvider,
  };
}
