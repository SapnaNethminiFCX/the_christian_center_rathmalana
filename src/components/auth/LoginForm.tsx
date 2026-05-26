"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { auth } from "@/infrastructure/firebase/auth";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { store } from "@/application/store";
import { pushToast } from "@/application/slices/uiSlice";
import {
  setUser,
  isRole,
  DASHBOARD_BY_ROLE,
  type SessionUser,
  type Role,
} from "@/application/slices/sessionSlice";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { FederatedSignInButtons } from "./FederatedSignInButtons";
import { LockoutBanner } from "./LockoutBanner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const t = useTranslations("auth.login");

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [pwError, setPwError] = useState("");
  const [formError, setFormError] = useState("");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Read ?reason=... set by FirebaseAuthListener / inactivity timer / 401 handler.
  // V2 only has: suspended, inactive, expired.
  useEffect(() => {
    const reason = searchParams?.get("reason");
    if (!reason) return;
    if (reason === "suspended") setFormError(t("accountSuspended"));
    else if (reason === "inactive") setFormError(t("inactive"));
    else if (reason === "expired") setFormError(t("authFailed"));
  }, [searchParams, t]);

  const clearErrors = () => {
    setEmailError("");
    setPwError("");
    setFormError("");
  };

  // Field-level validators so we can run them onBlur AND on submit without
  // duplicating logic.
  const validateEmail = (value: string): string => {
    if (!value.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) return "Password is required.";
    return "";
  };

  const validate = () => {
    const emailMsg = validateEmail(email);
    const pwMsg = validatePassword(pw);
    setEmailError(emailMsg);
    setPwError(pwMsg);
    return !emailMsg && !pwMsg;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!validate()) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);

      const me = await apiRequest<SessionUser>("/me");

      // V2: no approval queue. Only suspended accounts are blocked.
      if (me.status === "suspended") {
        await auth.signOut();
        setFormError(t("accountSuspended"));
        return;
      }

      // Dispatch — setUser normalises roles and computes activeRole.
      // Read activeRole from the store immediately after to pick the right
      // landing page (avoids reading stale raw backend roles).
      dispatch(setUser(me));
      dispatch(pushToast({ tone: "success", title: `Welcome back, ${me.firstName}` }));

      const activeRoleAfterLogin = store.getState().session.activeRole ?? "member";
      router.push(DASHBOARD_BY_ROLE[activeRoleAfterLogin]);
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
          case "auth/invalid-email": {
            setFormError(t("invalidCredentials"));
            // Fire-and-forget: tell the server about this failed attempt so
            // it can enforce the 10-strikes-per-15-min lock (FR-A-005).
            // We DON'T await — login UX shouldn't depend on this call.
            if (email.trim()) {
              void apiRequest<{ locked: boolean; attempts: number }>(
                "/auth/track-failure",
                { method: "POST", auth: false, body: { email: email.trim() } },
              )
                .then((res) => {
                  if (res?.locked) {
                    // Server doesn't return remaining seconds — assume the
                    // full 15-minute window from the most recent failure.
                    setLockoutSeconds(15 * 60);
                  }
                })
                .catch(() => null);
            }
            break;
          }
          case "auth/user-disabled":
            setFormError(t("accountSuspended"));
            break;
          case "auth/too-many-requests":
            setFormError(t("tooManyAttempts"));
            setLockoutSeconds(15 * 60);
            break;
          case "auth/network-request-failed":
            setFormError(t("networkError"));
            break;
          case "auth/user-not-found":
            // Account exists in DB but has no Firebase Auth entry — typically
            // an admin-created account that was seeded without Firebase Auth.
            setFormError(t("accountNotSetUp"));
            break;
          default:
            setFormError(t("signInFailed"));
        }
      } else if (err instanceof ApiRequestError) {
        // Disambiguate 403 by the backend's error.code — different reasons get
        // different messages. EMAIL_NOT_VERIFIED was being shown as the
        // "account not approved" message which is wrong.
        if (err.code === "EMAIL_NOT_VERIFIED") {
          setFormError(t("emailNotVerified"));
        } else if (err.code === "ACCOUNT_SUSPENDED") {
          setFormError(t("accountSuspended"));
        } else if (err.status === 403) {
          // Trust the backend's message for other 403s (forbidden, role
          // restrictions, etc.) — falls back to the generic notApproved string
          // only if the backend didn't return a message.
          setFormError(err.message || t("notApproved"));
        } else if (err.status === 401) {
          setFormError(t("authFailed"));
        } else {
          setFormError(err.message || t("signInFailed"));
        }
        await auth.signOut();
      } else {
        setFormError(t("signInFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t("title")}</h3>
          <p className="sub" style={{ margin: "4px 0 0" }}>{t("subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <FederatedSignInButtons context="signin" disabled={loading || lockoutSeconds > 0} />

      {lockoutSeconds > 0 && (
        <LockoutBanner
          initialSeconds={lockoutSeconds}
          onClear={() => setLockoutSeconds(0)}
          onReset={() => {
            setLockoutSeconds(0);
            setForgotOpen(true);
          }}
        />
      )}

      {formError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--color-error-bg)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "#DC2626",
          }}
        >
          <Icon name="alert-circle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <Input
          label={t("email")}
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          error={emailError}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
          onBlur={() => setEmailError(validateEmail(email))}
        />
        <Input
          label={t("password")}
          type={showPw ? "text" : "password"}
          placeholder={t("passwordPlaceholder")}
          value={pw}
          error={pwError}
          onChange={(e) => { setPw(e.target.value); if (pwError) setPwError(""); }}
          onBlur={() => setPwError(validatePassword(pw))}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }}
              aria-label={showPw ? t("hidePassword") : t("showPassword")}
            >
              <Icon name={showPw ? "eye-off" : "eye"} size={16} />
            </button>
          }
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            fontSize: 13,
            fontFamily: "var(--font-body)",
          }}
        >
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" defaultChecked /> {t("rememberMe")}
          </label>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "inherit",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              fontSize: 13,
            }}
          >
            {t("forgotPassword")}
          </button>
        </div>
        <div style={{ marginTop: 22 }}>
          <Button full size="lg" type="submit" disabled={loading || lockoutSeconds > 0}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </div>
      </form>
      <div className="alt">
        {t("noAccount")} <Link href="/register">{t("register")}</Link>
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ color: "inherit" }}>
            {t("backHome")}
          </Link>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
      />
    </>
  );
}
