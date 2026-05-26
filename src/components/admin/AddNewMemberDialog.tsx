"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export type AssignableRole = "leader" | "g12" | "admin";

export interface AddNewMemberPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AssignableRole;
}

interface Props {
  open: boolean;
  busy?: boolean;
  /** Which roles the current caller is allowed to assign. */
  allowedRoles: AssignableRole[];
  onCancel: () => void;
  /** Backend wiring happens later — for now the parent receives the payload. */
  onSubmit: (payload: AddNewMemberPayload) => void;
}

const ROLE_LABEL: Record<AssignableRole, string> = {
  leader: "Cell Leader",
  g12: "G12 Leader",
  admin: "Administrator",
};

/**
 * Create-and-invite dialog used by G12 / Admin / Super Admin to add a person
 * who has never registered. The backend (when shipped) will:
 *   - Create the user record with the assigned role + Member
 *   - Email the credentials + a password-reset link + the system URL
 *
 * Until the API exists, this dialog only collects + validates inputs and
 * hands the payload to the parent via onSubmit.
 */
export function AddNewMemberDialog({ open, busy, allowedRoles, onCancel, onSubmit }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<AssignableRole>(allowedRoles[0] ?? "leader");

  const [errors, setErrors] = useState<Partial<Record<keyof AddNewMemberPayload, string>>>({});

  // Reset state every time the dialog is opened, and default the role to
  // the first allowed option for this caller.
  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setShowPw(false);
      setRole(allowedRoles[0] ?? "leader");
      setErrors({});
    }
  }, [open, allowedRoles]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim())  next.lastName  = "Last name is required.";
    if (!email.trim())     next.email     = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password)         next.password  = "Temporary password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    if (!allowedRoles.includes(role)) next.role = "Pick a role to assign.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role,
    });
  };

  return (
    <Modal open={open} onClose={onCancel}>
      <h2 style={{ margin: 0, marginBottom: 4 }}>Add a new member</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16, fontSize: 13, fontFamily: "var(--font-body)" }}>
        Creates an account and emails the credentials + a password-reset link to the user.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
        <Input
          label="First name"
          value={firstName}
          error={errors.firstName}
          onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined })); }}
        />
        <Input
          label="Last name"
          value={lastName}
          error={errors.lastName}
          onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined })); }}
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        error={errors.email}
        placeholder="user@example.com"
        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
      />

      <Input
        label="Temporary password"
        type={showPw ? "text" : "password"}
        value={password}
        error={errors.password}
        placeholder="At least 8 characters"
        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            <Icon name={showPw ? "eye-off" : "eye"} size={16} />
          </button>
        }
      />

      <div className="field" style={{ marginTop: 10 }}>
        <label className="label" style={{ display: "block", marginBottom: 8 }}>Role to assign</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {allowedRoles.map((r) => (
            <label
              key={r}
              className={`chip${role === r ? " active" : ""}`}
              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <input
                type="radio"
                name="add-member-role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                style={{ accentColor: "var(--color-accent-hover)" }}
              />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
        {errors.role && (
          <span className="hint" style={{ color: "#DC2626", fontSize: 12, marginTop: 6, display: "inline-block" }}>
            {errors.role}
          </span>
        )}
        <p className="hint" style={{ marginTop: 8, fontSize: 12, color: "var(--color-body-green)" }}>
          The user will also receive the <b>Member</b> role automatically (every authed user is a Member).
        </p>
      </div>

      <div style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "var(--color-light-gray)",
        border: "1px dashed var(--color-stroke)",
        borderRadius: 10,
        fontFamily: "var(--font-body)",
        fontSize: 12,
        color: "var(--color-body-green)",
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <Icon name="mail" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          On submit, an email will be sent to <b>{email.trim() || "the user"}</b> containing the temporary
          password, a password-reset link, and the system URL. They can sign in immediately with the
          credentials above or reset the password first.
        </span>
      </div>

      <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: 16, borderTop: "none" }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button icon="send" disabled={busy} onClick={handleSubmit}>
          {busy ? "Sending…" : "Register & send email"}
        </Button>
      </div>
    </Modal>
  );
}
