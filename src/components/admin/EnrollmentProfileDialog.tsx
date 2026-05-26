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
import type { EnrollmentItem } from "@/application/hooks/useAdminEnrollmentQueue";
import { isApproved, isRejected } from "@/application/hooks/useAdminEnrollmentQueue";

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
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);

  // Hydrate the local-storage profile extras keyed by the student's uid. In the
  // current demo this only works when the admin and the student share a
  // browser (manual role-switching) — once the API exposes these fields the
  // load call swaps for an apiRequest to /admin/users/:uid/profile-extras.
  useEffect(() => {
    if (!enrollment) return;
    setExtras(loadProfileExtras(enrollment.studentUid));
  }, [enrollment]);

  if (!open || !enrollment) return null;

  const student = enrollment.student;
  const fullName = student
    ? `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || student.uid
    : enrollment.studentUid;

  const pending = !isApproved(enrollment.state) && !isRejected(enrollment.state);
  // Show qualifications the student saved in their own browser. Cross-device
  // limitation persists until the backend exposes a stored qualifications
  // array — see profileExtras.ts comments.
  const filledQuals = extras.qualifications.filter((q) => q.title.trim());

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
          <Avatar
            size="lg"
            name={fullName}
            src={student?.profilePhotoUrl ?? undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, textAlign: "left" }}>{fullName}</h2>
            {student?.email && (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--color-body-green)",
                  marginTop: 2,
                }}
              >
                {student.email}
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
        <FieldRow label="Email">{student?.email ?? <NotProvided />}</FieldRow>
        <FieldRow label="Phone number">
          {(enrollment.student as { phoneNumber?: string } | undefined)?.phoneNumber ?? <NotProvided />}
        </FieldRow>
        <FieldRow label="Address">
          {(enrollment.student as { address?: string | null } | undefined)?.address?.trim() ?? <NotProvided />}
        </FieldRow>

        {/* Personal */}
        <SectionTitle>Personal</SectionTitle>
        <FieldRow label="Date of birth">
          {(enrollment.student as { dateOfBirth?: string | null } | undefined)?.dateOfBirth ?? <NotProvided />}
        </FieldRow>
        <FieldRow label="Gender">
          {(enrollment.student as { gender?: string | null } | undefined)?.gender ?? <NotProvided />}
        </FieldRow>
        <FieldRow label="Qualification">
          {(enrollment.student as { qualificationTitle?: string | null } | undefined)?.qualificationTitle ?? <NotProvided />}
        </FieldRow>

        {/* Qualifications — list of student's qualifications with attachments. */}
        <SectionTitle>Qualifications</SectionTitle>
        {filledQuals.length === 0 ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)", fontStyle: "italic", paddingBottom: 8 }}>
            No qualifications recorded.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
            {filledQuals.map((q, i) => (
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
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: q.attachmentName ? "rgba(188,233,85,0.12)" : "var(--color-stroke-2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: q.attachmentName ? "var(--color-primary)" : "var(--color-muted)",
                  }}
                >
                  <Icon name="file-text" size={12} />
                  {q.attachmentName ?? "no attachment"}
                </span>
              </div>
            ))}
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
