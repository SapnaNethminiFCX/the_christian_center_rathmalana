"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

const RESEND_THROTTLE_SECONDS = 60;

interface Props {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
}

type Step = "email" | "otp" | "done";

export function ForgotPasswordModal({ open, initialEmail = "", onClose }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Tick the resend cooldown each second until it hits zero. Started right
  // after every successful (or silently-failed) password-reset request.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleClose = () => {
    setStep("email");
    setEmail(initialEmail);
    setOtp("");
    setEmailError("");
    setOtpError("");
    setLoading(false);
    setResendCooldown(0);
    onClose();
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      // Returns 204 regardless of whether the email exists (anti-enumeration)
      await apiRequest("/auth/password-reset", {
        method: "POST",
        auth: false,
        body: { email: email.trim() },
      });
      setStep("otp");
      setResendCooldown(RESEND_THROTTLE_SECONDS);
    } catch {
      // Even on network error we proceed — same UX as backend's enumeration-proof design
      setStep("otp");
      setResendCooldown(RESEND_THROTTLE_SECONDS);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/auth/password-reset/verify", {
        method: "POST",
        auth: false,
        body: { email: email.trim(), otp: otp.trim() },
      });
      setStep("done");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVALID_OTP") {
          setOtpError("Invalid code. Please check the email and try again.");
        } else if (err.code === "OTP_EXPIRED") {
          setOtpError("Code expired. Please request a new one.");
        } else if (err.code === "OTP_MAX_ATTEMPTS") {
          setOtpError("Too many incorrect attempts. Request a new code.");
        } else {
          setOtpError(err.message || "Verification failed.");
        }
      } else {
        setOtpError("Could not verify code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    setOtp("");
    setLoading(true);
    try {
      await apiRequest("/auth/password-reset", {
        method: "POST",
        auth: false,
        body: { email: email.trim() },
      });
    } catch {
      /* anti-enumeration — always silent */
    } finally {
      setLoading(false);
      setResendCooldown(RESEND_THROTTLE_SECONDS);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {step === "email" && (
        <>
          <div className="modal-ico">
            <Icon name="key" size={22} />
          </div>
          <h2>Reset your password</h2>
          <p>Enter the email on your account. We&apos;ll send a 6-digit verification code.</p>
          <form onSubmit={submitEmail}>
            <div style={{ textAlign: "left", marginTop: 8 }}>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                error={emailError}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                autoFocus
              />
            </div>
            <div className="form-actions" style={{ justifyContent: "center", borderTop: "none" }}>
              <Button variant="ghost" onClick={handleClose} type="button" disabled={loading}>
                Cancel
              </Button>
              <Button icon="send" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </Button>
            </div>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <div className="modal-ico">
            <Icon name="shield-check" size={22} />
          </div>
          <h2>Enter verification code</h2>
          <p>
            If an account exists for <b>{email}</b>, we&apos;ve sent a 6-digit code.
            It expires in 15 minutes.
          </p>
          <form onSubmit={submitOtp}>
            <div style={{ textAlign: "left", marginTop: 8 }}>
              <Input
                label="6-digit code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                error={otpError}
                maxLength={6}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(digits);
                  if (otpError) setOtpError("");
                }}
                autoFocus
                style={{ letterSpacing: 8, textAlign: "center", fontSize: 18, fontWeight: 600 }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: "var(--font-body)", fontSize: 13 }}>
              Didn&apos;t get the code?{" "}
              <button
                type="button"
                onClick={resendCode}
                disabled={loading || resendCooldown > 0}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  color: resendCooldown > 0 ? "var(--color-muted)" : "var(--color-primary)",
                  textDecoration: resendCooldown > 0 ? "none" : "underline",
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
              </button>
            </div>
            <div className="form-actions" style={{ justifyContent: "center", borderTop: "none" }}>
              <Button variant="ghost" onClick={handleClose} type="button" disabled={loading}>
                Cancel
              </Button>
              <Button icon="check" type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying…" : "Verify code"}
              </Button>
            </div>
          </form>
        </>
      )}

      {step === "done" && (
        <>
          <div className="modal-ico" style={{ background: "rgba(188,233,85,0.15)", color: "#152A24" }}>
            <Icon name="mail-check" size={22} />
          </div>
          <h2>Check your inbox</h2>
          <p>
            Code verified! We&apos;ve sent a password reset link to <b>{email}</b>.
            Click the link to set your new password.
          </p>
          <div className="form-actions" style={{ justifyContent: "center", borderTop: "none" }}>
            <Button onClick={handleClose}>Got it</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
