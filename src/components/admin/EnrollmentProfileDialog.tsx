"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
  EMPTY_PROFILE_EXTRAS,
  loadProfileExtras,
  type ProfileExtras,
} from "@/lib/profileExtras";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { EnrollmentItem } from "@/application/hooks/useAdminEnrollmentQueue";
import { isApproved, isRejected } from "@/application/hooks/useAdminEnrollmentQueue";

/** Live profile shape returned by GET /users/:uid (spec §3.1 / 4.x). */
interface LiveUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  qualifications?: { id: string; title: string; fileUrl: string | null }[];
  qualificationTitle?: string | null;
}

interface Props {
  enrollment: EnrollmentItem | null;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, label: string) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Not provided" placeholder, styled muted. */
function NotProvided() {
  return (
    <span style={{ color: "var(--color-muted)", fontStyle: "italic" }}>
      Not provided
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "20px 0 10px",
        fontFamily: "var(--font-heading)",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--color-body-green)",
      }}
    >
      {children}
    </h3>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid var(--color-stroke-2)",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        alignItems: "baseline",
      }}
    >
      <div style={{ color: "var(--color-body-green)", fontWeight: 500 }}>{label}</div>
      <div style={{ color: "var(--color-primary)", wordBreak: "break-word" }}>
        {children}
      </div>
    </div>
  );
}

export function EnrollmentProfileDialog({ enrollment, onClose, onApprove, onReject }: Props) {
  const open = !!enrollment;
  const [live, setLive] = useState<LiveUser | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);

  // Fetch the live user profile via GET /users/:uid when the dialog opens —
  // gives us phoneNumber / DOB / gender / address / qualifications etc. that
  // the lightweight `enrollment.student` payload from /admin/enrollments
  // doesn't include.
  useEffect(() => {
    if (!enrollment) {
      setLive(null);
      setLiveLoading(false);
      return;
    }
    let cancelled = false;
    setLive(null);
    setLiveLoading(true);
    apiRequest<LiveUser>(`/users/${enrollment.studentUid}`)
      .then((u) => { if (!cancelled) setLive(u); })
      .catch((err) => {
        // 401 means session is dead — handled globally. For others, fall back
        // to the lightweight student data already on the enrollment row.
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) return;
      })
      .finally(() => { if (!cancelled) setLiveLoading(false); });
    // Local storage fallback for qualifications stays in case the backend
    // returns no array yet (admin demoing on the same browser as the student).
    setExtras(loadProfileExtras(enrollment.studentUid));
    return () => { cancelled = true; };
  }, [enrollment]);

  if (!open || !enrollment) return null;

  // Prefer live (fresh GET /users/:uid) over enrollment.student (lightweight
  // row data). Each field falls back to whatever's available.
  const student = enrollment.student;
  const fullName = `${live?.firstName ?? student?.firstName ?? ""} ${live?.lastName ?? student?.lastName ?? ""}`.trim()
    || live?.uid
    || enrollment.studentUid;
  const email          = live?.email          ?? student?.email          ?? null;
  const photo          = live?.profilePhotoUrl ?? student?.profilePhotoUrl ?? undefined;
  const phoneNumber    = live?.phoneNumber    ?? (student as { phoneNumber?: string | null } | undefined)?.phoneNumber  ?? null;
  const address        = live?.address        ?? (student as { address?: string | null }     | undefined)?.address      ?? null;
  const dateOfBirth    = live?.dateOfBirth    ?? (student as { dateOfBirth?: string | null } | undefined)?.dateOfBirth   ?? null;
  const gender         = live?.gender         ?? (student as { gender?: string | null }      | undefined)?.gender        ?? null;
  const qualificationTitleFallback = live?.qualificationTitle ?? (student as { qualificationTitle?: string | null } | undefined)?.qualificationTitle ?? null;

  const pending = !isApproved(enrollment.state) && !isRejected(enrollment.state);

  // Prefer the backend's qualifications array (post-V2 PATCH /me §3.2). Fall
  // back to localStorage extras only if backend didn't return any — keeps the
  // demo path working when the admin and student share a browser.
  const filledQuals = (live?.qualifications && live.qualifications.length > 0)
    ? live.qualifications.filter((q) => q.title?.trim())
    : extras.qualifications.filter((q) => q.title.trim());

  return (
    <Modal open={open} onClose={onClose}>
      <div
        style={{
          textAlign: "left",
          // Override the centered `.modal` defaults from globals.css — this is
          // a wide info dialog, not a yes/no confirmation.
          maxWidth: 680,
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar size="lg" name={fullName} src={photo ?? undefined} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, textAlign: "left" }}>{fullName}</h2>
            {email && (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--color-body-green)",
                  marginTop: 2,
                }}
              >
                {email}
              </div>
            )}
            {liveLoading && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="loader" size={11} />
                Loading live profile…
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: 0,
              color: "var(--color-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Enrollment context */}
        <div
          style={{
            background: "var(--color-stroke-2)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 8,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
              Requesting enrolment in
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--color-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {enrollment.courseTitle ?? enrollment.courseId}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", marginTop: 4 }}>
              Requested {formatDate(enrollment.createdAt)}
            </div>
          </div>
          <div>
            {isApproved(enrollment.state) ? (
              <Badge tone="success">Approved</Badge>
            ) : isRejected(enrollment.state) ? (
              <Badge tone="error">Rejected</Badge>
            ) : (
              <Badge tone="warning">Pending</Badge>
            )}
          </div>
        </div>

        {/* Contact details */}
        <SectionTitle>Contact details</SectionTitle>
        <FieldRow label="Full name">{fullName}</FieldRow>
        <FieldRow label="Email">{email ?? <NotProvided />}</FieldRow>
        <FieldRow label="Phone number">{phoneNumber ?? <NotProvided />}</FieldRow>
        <FieldRow label="Address">{address?.trim() ? address : <NotProvided />}</FieldRow>

        {/* Personal */}
        <SectionTitle>Personal</SectionTitle>
        <FieldRow label="Date of birth">{dateOfBirth ?? <NotProvided />}</FieldRow>
        <FieldRow label="Gender">
          {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : <NotProvided />}
        </FieldRow>
        <FieldRow label="Qualification">{qualificationTitleFallback ?? <NotProvided />}</FieldRow>

        {/* Qualifications — clickable PDF badges when fileUrl is set. */}
        <SectionTitle>Qualifications</SectionTitle>
        {filledQuals.length === 0 ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)", fontStyle: "italic", paddingBottom: 8 }}>
            No qualifications recorded.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
            {filledQuals.map((q, i) => {
              const hasFile = !!q.fileUrl;
              const displayName = hasFile
                ? (() => {
                    try {
                      const last = q.fileUrl!.split("/").pop() ?? "";
                      const decoded = decodeURIComponent(last.split("?")[0]);
                      return decoded.replace(/^q-[a-z0-9]+-[a-z0-9]+-?/i, "") || decoded;
                    } catch {
                      return "View PDF";
                    }
                  })()
                : "no attachment";
              return (
                <div
                  key={q.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    borderBottom: i < filledQuals.length - 1 ? "1px solid var(--color-stroke-2)" : 0,
                  }}
                >
                  <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {i + 1}.
                  </span>
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{q.title}</span>
                  {hasFile ? (
                    <a
                      href={q.fileUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open PDF in new tab"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 9999,
                        background: "rgba(188,233,85,0.18)",
                        border: "1px solid rgba(188,233,85,0.5)",
                        fontFamily: "var(--font-body)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-primary)",
                        textDecoration: "none",
                      }}
                    >
                      <Icon name="file-text" size={12} />
                      {displayName}
                      <Icon name="external-link" size={10} style={{ opacity: 0.7 }} />
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
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--color-muted)",
                      }}
                    >
                      <Icon name="file-text" size={12} />
                      {displayName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer actions */}
        <div
          className="form-actions"
          style={{ justifyContent: "space-between", borderTop: "1px solid var(--color-stroke)", marginTop: 20, paddingTop: 16, flexWrap: "wrap" }}
        >
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {pending && (onApprove || onReject) && (
            <div style={{ display: "flex", gap: 10 }}>
              {onReject && (
                <Button
                  variant="destructive"
                  icon="x-circle"
                  onClick={() => onReject(enrollment.id, enrollment.courseTitle ?? enrollment.courseId)}
                >
                  Reject
                </Button>
              )}
              {onApprove && (
                <Button icon="check-circle" onClick={() => onApprove(enrollment.id)}>
                  Approve
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
