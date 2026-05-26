"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { API_PREFIX } from "@/infrastructure/api/request";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations("auth.register");
  const preferredLanguage = useAppSelector((s) => s.locale.current);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearField = (field: string) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  // Per-field validators so the same logic powers both onBlur (surface
  // errors when the user leaves the field) and onSubmit (final guard).
  const validateField = (field: string, value: string, pwForConfirm?: string): string => {
    switch (field) {
      case "firstName":
        return value.trim() ? "" : t("firstNameRequired");
      case "lastName":
        return value.trim() ? "" : t("lastNameRequired");
      case "email":
        if (!value.trim()) return t("emailRequired");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t("emailInvalid");
        return "";
      case "pw":
        if (!value) return t("passwordRequired");
        if (value.length < 10) return t("passwordTooShort");
        if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(value))
          return t("passwordRequirements");
        return "";
      case "confirmPw":
        if (!value) return t("confirmPasswordRequired");
        if (value !== (pwForConfirm ?? pw)) return t("passwordsMismatch");
        return "";
      default:
        return "";
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const fName = validateField("firstName", firstName);
    if (fName) e.firstName = fName;
    const lName = validateField("lastName", lastName);
    if (lName) e.lastName = lName;
    const em = validateField("email", email);
    if (em) e.email = em;
    const password = validateField("pw", pw);
    if (password) e.pw = password;
    const confirm = validateField("confirmPw", confirmPw, pw);
    if (confirm) e.confirmPw = confirm;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_PREFIX}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password: pw,
            preferredLanguage,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setFieldError("email", t("emailExists"));
        } else if (res.status === 400 && err?.field) {
          setFieldError(err.field, err.message);
        } else {
          dispatch(pushToast({ tone: "warning", title: t("signUpFailed"), message: err?.message ?? "" }));
        }
        return;
      }

      dispatch(
        pushToast({
          tone: "success",
          title: t("welcomeToast"),
          message: t("welcomeMessage"),
        }),
      );
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch {
      dispatch(pushToast({ tone: "warning", title: t("signUpFailed"), message: t("networkError") }));
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

      <form onSubmit={onSubmit}>
        <div className="form-grid two" style={{ marginBottom: 0 }}>
          <Input
            label={t("firstName")}
            placeholder={t("firstNamePlaceholder")}
            value={firstName}
            error={errors.firstName}
            onChange={(e) => { setFirstName(e.target.value); clearField("firstName"); }}
            onBlur={() => {
              const msg = validateField("firstName", firstName);
              if (msg) setFieldError("firstName", msg);
            }}
          />
          <Input
            label={t("lastName")}
            placeholder={t("lastNamePlaceholder")}
            value={lastName}
            error={errors.lastName}
            onChange={(e) => { setLastName(e.target.value); clearField("lastName"); }}
            onBlur={() => {
              const msg = validateField("lastName", lastName);
              if (msg) setFieldError("lastName", msg);
            }}
          />
        </div>
        <Input
          label={t("email")}
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          error={errors.email}
          onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
          onBlur={() => {
            const msg = validateField("email", email);
            if (msg) setFieldError("email", msg);
          }}
        />
        <Input
          label={t("password")}
          type={showPw ? "text" : "password"}
          placeholder={t("passwordPlaceholder")}
          value={pw}
          error={errors.pw}
          onChange={(e) => { setPw(e.target.value); clearField("pw"); }}
          onBlur={() => {
            const msg = validateField("pw", pw);
            if (msg) setFieldError("pw", msg);
          }}
          hint={errors.pw ? undefined : t("passwordHint")}
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
        <Input
          label={t("confirmPassword")}
          type={showConfirmPw ? "text" : "password"}
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPw}
          onChange={(e) => { setConfirmPw(e.target.value); clearField("confirmPw"); }}
          onBlur={() => {
            const msg = validateField("confirmPw", confirmPw, pw);
            if (msg) setFieldError("confirmPw", msg);
          }}
          error={errors.confirmPw}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }}
              aria-label={showConfirmPw ? t("hidePassword") : t("showPassword")}
            >
              <Icon name={showConfirmPw ? "eye-off" : "eye"} size={16} />
            </button>
          }
        />
        <div style={{ marginTop: 22 }}>
          <Button full size="lg" type="submit" disabled={loading}>
            {loading ? t("creating") : t("createAccount")}
          </Button>
        </div>
      </form>
      <div className="alt">
        {t("alreadyHaveAccount")} <Link href="/login">{t("signIn")}</Link>
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ color: "inherit" }}>
            {t("backHome")}
          </Link>
        </div>
      </div>
    </>
  );
}
