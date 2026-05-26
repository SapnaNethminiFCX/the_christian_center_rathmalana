"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useProfile } from "@/application/hooks/useProfile";
import { useRoles } from "@/application/hooks/useRoles";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import {
  loadProfileExtras,
  saveProfileExtras,
  newQualificationId,
  EMPTY_PROFILE_EXTRAS,
  type ProfileExtras,
  type Qualification,
} from "@/lib/profileExtras";

// Spec §3.2 gender values are lowercase: male | female | other.
// We show capital labels but send the lowercase value.
const GENDER_OPTIONS: { value: "male" | "female" | "other"; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
];

// Visual required-marker — pure styling, no validation logic.
function ReqMark() {
  return (
    <span style={{ color: "#DC2626", marginLeft: 2 }} aria-hidden="true">
      *
    </span>
  );
}

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}


export default function ProfilePage() {
  const P = useProfile();
  const { roles } = useRoles();
  const dispatch = useAppDispatch();

  // Identity fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dirty, setDirty]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Personal-details fields (PATCH /me §3.2) — qualificationTitle moves to
  // the new Qualifications card below.
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "other">("");
  const [detailsDirty, setDetailsDirty] = useState(false);

  // ── Qualifications list (localStorage; first entry's title mirrors to
  //    the backend's qualificationTitle field via PATCH /me on save). ──
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);
  const [extrasDirty, setExtrasDirty] = useState(false);
  const [extrasSaving, setExtrasSaving] = useState(false);

  // Password fields
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Sync form from Redux on mount / user change
  useEffect(() => {
    if (P.user) {
      setFirstName(P.user.firstName ?? "");
      setLastName(P.user.lastName  ?? "");
      setPhoneNumber(P.user.phoneNumber ?? "");
      setAddress(P.user.address ?? "");
      setDateOfBirth(P.user.dateOfBirth ?? "");
      setGender((P.user.gender ?? "") as "" | "male" | "female" | "other");
      setDirty(false);
      setDetailsDirty(false);
    }
  }, [P.user]);

  // Hydrate the qualifications list from localStorage. If localStorage is
  // empty but the backend already has a single qualificationTitle (from the
  // previous single-field form), seed the list with one entry so the user
  // doesn't lose their existing data.
  useEffect(() => {
    if (!P.user?.uid) return;
    const stored = loadProfileExtras(P.user.uid);
    if (stored.qualifications.length === 0 && P.user.qualificationTitle) {
      setExtras({
        qualifications: [{
          id: newQualificationId(),
          title: P.user.qualificationTitle,
          attachmentName: null,
        }],
      });
    } else {
      setExtras(stored);
    }
    setExtrasDirty(false);
  }, [P.user?.uid, P.user?.qualificationTitle]);

  /* ── Qualification list handlers ─────────────────────────────────── */

  const addQualification = () => {
    setExtras((prev) => ({
      qualifications: [
        ...prev.qualifications,
        { id: newQualificationId(), title: "", attachmentName: null },
      ],
    }));
    setExtrasDirty(true);
  };

  const removeQualification = (id: string) => {
    setExtras((prev) => ({
      qualifications: prev.qualifications.filter((q) => q.id !== id),
    }));
    setExtrasDirty(true);
  };

  const updateQualificationTitle = (id: string, title: string) => {
    setExtras((prev) => ({
      qualifications: prev.qualifications.map((q) =>
        q.id === id ? { ...q, title } : q,
      ),
    }));
    setExtrasDirty(true);
  };

  /** Attach (or replace) a PDF on a single qualification entry. We only
   *  persist the filename — actual file bytes are not uploaded yet because
   *  the backend hasn't shipped that endpoint. */
  const onQualificationFileChange = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Only PDF files are accepted." }));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dispatch(pushToast({ tone: "warning", title: "File too large", message: "Max 5 MB per attachment." }));
      e.target.value = "";
      return;
    }
    setExtras((prev) => ({
      qualifications: prev.qualifications.map((q) =>
        q.id === id ? { ...q, attachmentName: file.name } : q,
      ),
    }));
    setExtrasDirty(true);
    e.target.value = "";
  };

  const removeQualificationAttachment = (id: string) => {
    setExtras((prev) => ({
      qualifications: prev.qualifications.map((q) =>
        q.id === id ? { ...q, attachmentName: null } : q,
      ),
    }));
    setExtrasDirty(true);
  };

  /** Save the qualifications list. The full array (multiple titles +
   *  attachments) lives in localStorage; the FIRST entry's title is also
   *  mirrored to the backend's `qualificationTitle` field so the
   *  apply-student gate continues to work. Backend will be extended to
   *  accept the full array — when that lands, swap this for a single
   *  PATCH that sends the whole `qualifications` array. */
  const onSaveExtras = async () => {
    if (!P.user?.uid) return;
    setExtrasSaving(true);
    saveProfileExtras(P.user.uid, extras);

    const primaryTitle = extras.qualifications[0]?.title.trim() ?? "";
    const backendValue = P.user.qualificationTitle ?? "";
    if (primaryTitle !== backendValue) {
      await P.updateProfile({ qualificationTitle: primaryTitle || null });
    }

    setExtrasDirty(false);
    setExtrasSaving(false);
    dispatch(pushToast({ tone: "success", title: "Qualifications saved" }));
  };

  const onCancelExtras = () => {
    setExtras(loadProfileExtras(P.user?.uid));
    setExtrasDirty(false);
  };

  /** Save the three Personal Details fields via PATCH /me §3.2.
   *  qualificationTitle is saved separately by onSaveExtras below. */
  const onSaveDetails = async () => {
    if (!P.user) return;
    const changes: Parameters<typeof P.updateProfile>[0] = {};
    if (address.trim() !== (P.user.address ?? "")) {
      changes.address = address.trim() || null;
    }
    if (dateOfBirth !== (P.user.dateOfBirth ?? "")) {
      changes.dateOfBirth = dateOfBirth || null;
    }
    if (gender !== (P.user.gender ?? "")) {
      changes.gender = gender || null;
    }
    const ok = await P.updateProfile(changes);
    if (ok) setDetailsDirty(false);
  };

  const onCancelDetails = () => {
    if (!P.user) return;
    setAddress(P.user.address ?? "");
    setDateOfBirth(P.user.dateOfBirth ?? "");
    setGender((P.user.gender ?? "") as "" | "male" | "female" | "other");
    setDetailsDirty(false);
  };

  if (!P.user) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} />
      </div>
    );
  }

  const fullName = `${P.user.firstName} ${P.user.lastName}`.trim();

  const onSave = async () => {
    const changes: Parameters<typeof P.updateProfile>[0] = {};
    if (firstName.trim() !== (P.user!.firstName ?? "")) changes.firstName = firstName.trim();
    if (lastName.trim()  !== (P.user!.lastName  ?? "")) changes.lastName  = lastName.trim();
    if (phoneNumber.trim() !== (P.user!.phoneNumber ?? "")) {
      changes.phoneNumber = phoneNumber.trim() || null;
    }
    const ok = await P.updateProfile(changes);
    if (ok) setDirty(false);
  };

  const onCancel = () => {
    setFirstName(P.user!.firstName ?? "");
    setLastName(P.user!.lastName  ?? "");
    setPhoneNumber(P.user!.phoneNumber ?? "");
    setDirty(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await P.uploadAvatar(file);
    e.target.value = "";
  };

  const onSubmitPassword = async () => {
    setConfirmError("");
    P.setPasswordError("");
    if (!currentPw) { P.setPasswordError("Enter your current password."); return; }
    if (newPw !== confirmPw) { setConfirmError("Passwords do not match."); return; }
    if (newPw.length < 10) { P.setPasswordError("New password must be at least 10 characters."); return; }
    const ok = await P.changePassword(currentPw, newPw);
    if (ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Your profile</h1>
          <RoleBadgeStack roles={roles} />
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          Manage your account details and preferences.
        </p>
      </div>

      {/* ── Identity ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Profile</h2>
        <p className="settings-sub">Your name and photo are visible to others on the platform.</p>

        <div className="avatar-row">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={onFileChange} />
          <button
            type="button"
            title="Click to change photo"
            onClick={() => fileInputRef.current?.click()}
            disabled={P.uploadingAvatar}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", flexShrink: 0, borderRadius: "50%" }}
          >
            <Avatar src={P.user.profilePhotoUrl ?? undefined} size="xl" name={fullName || P.user.email} />
            <span
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(21,42,36,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: P.uploadingAvatar ? 1 : 0, transition: "opacity 150ms" }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseOut={(e) => (!P.uploadingAvatar && (e.currentTarget.style.opacity = "0"))}
            >
              {P.uploadingAvatar
                ? <Icon name="loader" size={22} style={{ color: "#BCE955" }} />
                : <Icon name="upload-cloud" size={22} style={{ color: "#BCE955" }} />}
            </span>
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "var(--color-primary)", marginBottom: 4 }}>
              {fullName || P.user.email}
            </div>
            {P.user.createdAt && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", marginBottom: 12 }}>
                Joined {formatJoined(P.user.createdAt)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button type="button" variant="secondary" icon="upload-cloud" size="sm" disabled={P.uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                {P.uploadingAvatar ? "Uploading…" : "Upload photo"}
              </Button>
            </div>
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)" }}>
              JPG or PNG · max 2 MB
            </p>
          </div>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label className="label">First name<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.firstName ? "input--error" : ""}`}
              required
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setDirty(true); if (P.fieldErrors.firstName) P.clearFieldError("firstName"); }}
            />
            {P.fieldErrors.firstName && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.firstName}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Last name<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.lastName ? "input--error" : ""}`}
              required
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setDirty(true); if (P.fieldErrors.lastName) P.clearFieldError("lastName"); }}
            />
            {P.fieldErrors.lastName && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.lastName}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Phone number<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.phoneNumber ? "input--error" : ""}`}
              type="tel"
              required
              placeholder="+94771234567"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setDirty(true);
                if (P.fieldErrors.phoneNumber) P.clearFieldError("phoneNumber");
              }}
            />
            <span className="hint" style={{ color: P.fieldErrors.phoneNumber ? "#DC2626" : undefined }}>
              {P.fieldErrors.phoneNumber ?? "International format, e.g. +94771234567"}
            </span>
          </div>
          <div className="field">
            <label className="label">Email<ReqMark /></label>
            <input className="input" type="email" value={P.user.email} disabled />
            <span className="hint">Email cannot be changed.</span>
          </div>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancel} disabled={!dirty || P.saving}>Cancel</Button>
          <Button icon="check" onClick={onSave} disabled={!dirty || P.saving}>
            {P.saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Personal details (PATCH /me §3.2) ───────────────────────── */}
      <div className="settings-card">
        <h2>Personal details</h2>
        <p className="settings-sub">
          Required before submitting a Student application. Saved to your
          account so they sync across devices.
        </p>

        <div className="form-grid one">
          <div className="field">
            <label className="label">Address</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Street, city, postal code, country"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setDetailsDirty(true); }}
            />
            {P.fieldErrors.address && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.address}</span>
            )}
          </div>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label className="label">Date of birth</label>
            <input
              className="input"
              type="date"
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); setDetailsDirty(true); }}
            />
            {P.fieldErrors.dateOfBirth && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.dateOfBirth}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Gender</label>
            <select
              className="input"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value as "" | "male" | "female" | "other");
                setDetailsDirty(true);
              }}
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            {P.fieldErrors.gender && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.gender}</span>
            )}
          </div>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancelDetails} disabled={!detailsDirty || P.saving}>
            Cancel
          </Button>
          <Button icon="check" onClick={onSaveDetails} disabled={!detailsDirty || P.saving}>
            {P.saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </div>

      {/* ── Qualifications (optional; each can have a PDF attachment) ── */}
      <div className="settings-card">
        <h2>Qualifications</h2>
        <p className="settings-sub">
          Add your qualifications — degrees, diplomas, certificates. You can
          optionally attach the original document as a PDF for each. None of
          these are mandatory; the first entry&apos;s title is sent with your
          Student application.
        </p>

        {extras.qualifications.length === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              textAlign: "center",
              border: "1.5px dashed rgba(21, 42, 36, 0.18)",
              borderRadius: 12,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--color-muted)",
              marginBottom: 14,
            }}
          >
            No qualifications added yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
            {extras.qualifications.map((q, idx) => (
              <QualificationRow
                key={q.id}
                qualification={q}
                index={idx}
                onTitleChange={(v) => updateQualificationTitle(q.id, v)}
                onFileChange={onQualificationFileChange(q.id)}
                onRemoveAttachment={() => removeQualificationAttachment(q.id)}
                onRemove={() => removeQualification(q.id)}
              />
            ))}
          </div>
        )}

        <Button type="button" variant="secondary" icon="plus" size="sm" onClick={addQualification}>
          Add qualification
        </Button>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancelExtras} disabled={!extrasDirty || extrasSaving}>
            Cancel
          </Button>
          <Button icon="check" onClick={onSaveExtras} disabled={!extrasDirty || extrasSaving}>
            {extrasSaving ? "Saving…" : "Save qualifications"}
          </Button>
        </div>
      </div>

      {/* ── Language ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Language</h2>
        <p className="settings-sub">Notifications and emails will be sent in your preferred language.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
            Preferred language
          </span>
          <LanguageSwitcher
            onChange={async (code) => {
              const map = { EN: "en", SI: "si", TA: "ta" } as const;
              await P.updateProfile({ preferredLanguage: map[code] });
            }}
          />
        </div>
      </div>

      {/* ── Password ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Password</h2>
        <p className="settings-sub">Use a strong password you don&apos;t reuse elsewhere.</p>

        {P.passwordError && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--color-error-bg)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "#DC2626" }}>
            <Icon name="alert-circle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            {P.passwordError}
          </div>
        )}

        <div className="form-grid one" style={{ marginBottom: 12 }}>
          <Input label="Current password" type={showCurrent ? "text" : "password"} placeholder="Enter your current password"
            value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); P.setPasswordError(""); }}
            rightSlot={<button type="button" onClick={() => setShowCurrent((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showCurrent ? "Hide" : "Show"}><Icon name={showCurrent ? "eye-off" : "eye"} size={16} /></button>} />
        </div>

        <div className="form-grid two">
          <Input label="New password" type={showNew ? "text" : "password"} placeholder="At least 10 characters"
            value={newPw} onChange={(e) => { setNewPw(e.target.value); P.setPasswordError(""); }}
            hint={!P.passwordError ? "Mix uppercase, lowercase, numbers and symbols." : undefined}
            rightSlot={<button type="button" onClick={() => setShowNew((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showNew ? "Hide" : "Show"}><Icon name={showNew ? "eye-off" : "eye"} size={16} /></button>} />
          <Input label="Confirm new password" type={showConfirm ? "text" : "password"} placeholder="Re-enter new password"
            value={confirmPw} error={confirmError} onChange={(e) => { setConfirmPw(e.target.value); if (confirmError) setConfirmError(""); }}
            rightSlot={<button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showConfirm ? "Hide" : "Show"}><Icon name={showConfirm ? "eye-off" : "eye"} size={16} /></button>} />
        </div>

        <div className="form-actions">
          <Button variant="ghost" disabled={P.savingPassword} onClick={() => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setConfirmError(""); P.setPasswordError(""); }}>Cancel</Button>
          <Button icon="check" disabled={P.savingPassword || !currentPw || !newPw || !confirmPw} onClick={onSubmitPassword}>
            {P.savingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── QualificationRow ─────────────────────────────────────────────── */

function QualificationRow({
  qualification,
  index,
  onTitleChange,
  onFileChange,
  onRemoveAttachment,
  onRemove,
}: {
  qualification: Qualification;
  index: number;
  onTitleChange: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      style={{
        border: "1px solid var(--color-stroke)",
        borderRadius: 12,
        padding: "14px 14px 12px",
        background: "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 9999,
            background: "var(--color-light-gray)",
            color: "var(--color-primary)",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <input
          className="input"
          placeholder='e.g. "Bachelor of Theology"'
          value={qualification.title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove qualification"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "var(--color-error)",
            padding: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          <Icon name="trash-2" size={16} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingLeft: 36 }}>
        <Button
          type="button"
          variant="secondary"
          icon="upload-cloud"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {qualification.attachmentName ? "Replace attachment" : "Attach PDF (optional)"}
        </Button>
        {qualification.attachmentName && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-body-green)",
            }}
          >
            <Icon name="file-text" size={14} />
            {qualification.attachmentName}
            <button
              type="button"
              onClick={onRemoveAttachment}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-muted)",
                display: "flex",
              }}
              aria-label="Remove attachment"
            >
              <Icon name="x" size={14} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
