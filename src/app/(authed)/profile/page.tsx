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

  // Preferred language (saved with the unified Save button — selection still
  // updates the UI locale live so the user sees the translations preview).
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "si" | "ta">("en");
  const [langDirty, setLangDirty] = useState(false);

  // ── Qualifications list. The `extras` array holds the persistable shape
  //    (id + title + fileUrl). Locally-picked PDFs (not yet uploaded) live
  //    in `pendingFiles` — keyed by qualification id, holding the actual
  //    File object so we can POST it on save. ──
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);
  const [extrasDirty, setExtrasDirty] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  // Kept for parity with previous structure — unified save uses P.saving.
  const extrasSaving = P.saving;

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
      setPreferredLanguage((P.user.preferredLanguage ?? "en") as "en" | "si" | "ta");
      setDirty(false);
      setDetailsDirty(false);
      setLangDirty(false);
    }
  }, [P.user]);

  // Hydrate the qualifications list. Priority:
  //   1. Backend `user.qualifications` array (V2 PATCH /me §3.2)
  //   2. localStorage fallback (pre-V2 behaviour, kept so users don't lose
  //      drafts when the backend hasn't echoed the array yet)
  //   3. Single legacy `qualificationTitle` field — seed one entry from it
  useEffect(() => {
    if (!P.user?.uid) return;
    const backendList = P.user.qualifications;
    if (Array.isArray(backendList) && backendList.length > 0) {
      setExtras({
        qualifications: backendList.map((q) => ({
          id: q.id,
          title: q.title,
          fileUrl: q.fileUrl ?? null,
          pendingFileName: null,
        })),
      });
    } else {
      const stored = loadProfileExtras(P.user.uid);
      if (stored.qualifications.length === 0 && P.user.qualificationTitle) {
        setExtras({
          qualifications: [{
            id: newQualificationId(),
            title: P.user.qualificationTitle,
            fileUrl: null,
            pendingFileName: null,
          }],
        });
      } else {
        setExtras(stored);
      }
    }
    setExtrasDirty(false);
  }, [P.user?.uid, P.user?.qualificationTitle, P.user?.qualifications]);

  /* ── Qualification list handlers ─────────────────────────────────── */

  const addQualification = () => {
    setExtras((prev) => ({
      qualifications: [
        ...prev.qualifications,
        { id: newQualificationId(), title: "", fileUrl: null, pendingFileName: null },
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
    // Stash the File object in pendingFiles + the name in the entry. On
    // save we POST /me/qualification to upload it and receive the real
    // fileUrl, which gets baked into the PATCH /me payload.
    setPendingFiles((prev) => ({ ...prev, [id]: file }));
    setExtras((prev) => ({
      qualifications: prev.qualifications.map((q) =>
        q.id === id ? { ...q, pendingFileName: file.name } : q,
      ),
    }));
    setExtrasDirty(true);
    e.target.value = "";
  };

  const removeQualificationAttachment = (id: string) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExtras((prev) => ({
      qualifications: prev.qualifications.map((q) =>
        q.id === id ? { ...q, fileUrl: null, pendingFileName: null } : q,
      ),
    }));
    setExtrasDirty(true);
  };

  /**
   * Unified save — Profile + Personal + Qualifications + Language all go in
   * a single PATCH /me request (V2 §3.2). Password change stays separate
   * because it uses a different endpoint.
   *
   * Sends ALL PATCH-able fields on every save (not just dirty ones). This
   * is more defensive: if the backend's field-allowlist or persistence
   * layer ever drops a missing field, sending the full state every time
   * ensures the user's complete profile state is always present in the
   * request — the backend cannot silently lose unchanged data.
   *
   * On success we dispatch `setUser(updated)` from the backend's response,
   * so Redux always reflects the canonical server state (no optimistic
   * overlays).
   */
  const onSaveAll = async () => {
    if (!P.user) return;

    // 1. Upload any locally-picked PDFs first so each entry has its real
    //    `fileUrl` baked in before the PATCH body is built.
    let nextExtras = extras;
    if (Object.keys(pendingFiles).length > 0) {
      const uploadedUrlByQid: Record<string, string> = {};
      for (const q of extras.qualifications) {
        const file = pendingFiles[q.id];
        if (!file) continue;
        const url = await P.uploadQualification(file);
        if (!url) return; // upload error toast already shown inside the hook
        uploadedUrlByQid[q.id] = url;
      }
      nextExtras = {
        qualifications: extras.qualifications.map((q) =>
          uploadedUrlByQid[q.id]
            ? { ...q, fileUrl: uploadedUrlByQid[q.id], pendingFileName: null }
            : q,
        ),
      };
    }

    // 2. Build the FULL PATCH /me payload — every PATCH-able field per
    //    spec §3.2 is included on every save. Empty strings normalise to
    //    `null` for nullable fields so the backend can clear them.
    const changes: Parameters<typeof P.updateProfile>[0] = {
      firstName:         firstName.trim(),
      lastName:          lastName.trim(),
      phoneNumber:       phoneNumber.trim() || null,
      address:           address.trim() || null,
      dateOfBirth:       dateOfBirth || null,
      gender:            gender || null,
      preferredLanguage: preferredLanguage,
      qualifications:    nextExtras.qualifications
        .filter((q) => q.title.trim())
        .map((q) => ({ id: q.id, title: q.title.trim(), fileUrl: q.fileUrl ?? null })),
    };

    const ok = await P.updateProfile(changes);
    if (ok) {
      // PATCH response was used by updateProfile to update Redux; mirror
      // the local extras + clear UI-only state.
      setExtras(nextExtras);
      if (P.user.uid) saveProfileExtras(P.user.uid, nextExtras);
      setPendingFiles({});
      setDirty(false);
      setDetailsDirty(false);
      setExtrasDirty(false);
      setLangDirty(false);
    }
  };

  /** Cancel ALL unsaved changes across the four sections. */
  const onCancelAll = () => {
    if (!P.user) return;
    setFirstName(P.user.firstName ?? "");
    setLastName(P.user.lastName  ?? "");
    setPhoneNumber(P.user.phoneNumber ?? "");
    setAddress(P.user.address ?? "");
    setDateOfBirth(P.user.dateOfBirth ?? "");
    setGender((P.user.gender ?? "") as "" | "male" | "female" | "other");
    setPreferredLanguage((P.user.preferredLanguage ?? "en") as "en" | "si" | "ta");
    setExtras(loadProfileExtras(P.user.uid));
    setPendingFiles({});
    setDirty(false);
    setDetailsDirty(false);
    setExtrasDirty(false);
    setLangDirty(false);
  };

  if (!P.user) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} />
      </div>
    );
  }

  const fullName = `${P.user.firstName} ${P.user.lastName}`.trim();

  // Single source of dirtiness across the four PATCH /me sections.
  const anyDirty = dirty || detailsDirty || extrasDirty || langDirty;

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
            current={preferredLanguage === "si" ? "SI" : preferredLanguage === "ta" ? "TA" : "EN"}
            onChange={(code) => {
              const map = { EN: "en", SI: "si", TA: "ta" } as const;
              const next = map[code];
              setPreferredLanguage(next);
              setLangDirty(next !== (P.user?.preferredLanguage ?? "en"));
            }}
          />
        </div>
      </div>

      {/* ── Unified Save bar — Profile + Personal + Qualifications + Language
            all submit in a single PATCH /me. Password keeps its own button
            below (different endpoint). ──────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 4,
          background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--color-surface) 40%)",
          paddingTop: 14,
          paddingBottom: 14,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "14px 18px",
            background: "#fff",
            border: "1px solid var(--color-stroke)",
            borderRadius: 14,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
            {anyDirty ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: "var(--color-warning)" }} />
                Unsaved changes
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-muted)" }}>
                <Icon name="check-circle" size={14} />
                All changes saved
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="ghost" onClick={onCancelAll} disabled={!anyDirty || P.saving}>
              Cancel
            </Button>
            <Button icon="check" onClick={onSaveAll} disabled={!anyDirty || P.saving}>
              {P.saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
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
          {(qualification.fileUrl || qualification.pendingFileName) ? "Replace attachment" : "Attach PDF (optional)"}
        </Button>
        {(qualification.fileUrl || qualification.pendingFileName) && (() => {
          // Derive a friendly filename:
          //   - Uploaded → take the last path segment of the URL, drop the
          //     storage hash if present (e.g. "abc123-OL_certificate.pdf"
          //     → "OL_certificate.pdf"), decode URI-encoding.
          //   - Pending → use the locally-picked filename as-is.
          const displayName = qualification.pendingFileName
            ?? (() => {
              const last = qualification.fileUrl?.split("/").pop() ?? "Attached";
              try {
                const decoded = decodeURIComponent(last.split("?")[0]);
                // Firebase storage keys often look like "q-xxx-FILENAME.pdf"
                // — strip the "q-...-" prefix if found.
                return decoded.replace(/^q-[a-z0-9]+-[a-z0-9]+-?/i, "") || decoded;
              } catch {
                return last;
              }
            })();
          const isUploaded = !!qualification.fileUrl;
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {isUploaded ? (
                <a
                  href={qualification.fileUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: "rgba(188,233,85,0.18)",
                    border: "1px solid rgba(188,233,85,0.5)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                  title="Open PDF in new tab"
                >
                  <Icon name="file-text" size={14} />
                  {displayName}
                  <Icon name="external-link" size={11} style={{ opacity: 0.7 }} />
                </a>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: "var(--color-stroke-2)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-body-green)",
                  }}
                  title="Will upload when you click Save changes"
                >
                  <Icon name="file-text" size={14} />
                  {displayName}
                  <span style={{ fontSize: 10, color: "var(--color-warning)", fontWeight: 700, marginLeft: 4 }}>
                    PENDING
                  </span>
                </span>
              )}
              <button
                type="button"
                onClick={onRemoveAttachment}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-muted)",
                  display: "flex",
                  padding: 2,
                }}
                aria-label="Remove attachment"
              >
                <Icon name="x" size={14} />
              </button>
            </span>
          );
        })()}
      </div>
    </div>
  );
}
