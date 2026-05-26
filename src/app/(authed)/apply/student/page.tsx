"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRoleRequests, submitRoleRequest } from "@/application/hooks/useRoleRequests";
import { ApiRequestError } from "@/infrastructure/api/request";
import { ProfileIncompleteDialog } from "@/components/profile/ProfileIncompleteDialog";
import { isProfileCoreComplete } from "@/lib/profileExtras";

const FEATURES = [
  { ico: "book-open",       title: "Browse the catalogue",   body: "See every Bible School course, current intakes, and what each semester covers." },
  { ico: "graduation-cap",  title: "Request enrolment",      body: "Apply to specific course intakes once you're a Student. Admins approve each request." },
  { ico: "file-text",       title: "Lessons & materials",    body: "Stream lesson videos, read attachments, and download study guides for offline use." },
  { ico: "bar-chart-3",     title: "Track your progress",    body: "See completion per subject, resume from your last lesson, and earn course completion." },
];

export default function ApplyStudentPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);
  const { hasPendingStudent, latestStudent, loading } = useRoleRequests();
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // If already approved (roles just not refreshed in Redux yet), send to
  // pending page — it handles token refresh + setUser + redirect to student UI.
  useEffect(() => {
    if (!loading && latestStudent?.status === "approved") {
      router.replace(`/apply/student/pending?req=${latestStudent.id}`);
    }
  }, [loading, latestStudent, router]);

  const submitApplication = async () => {
    if (!user) return;
    setSubmitting(true);
    setInlineError("");
    try {
      const created = await submitRoleRequest("student");
      dispatch(pushToast({ tone: "success", title: "Application submitted", message: "An admin will review your request shortly." }));
      router.push(`/apply/student/pending?req=${created.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ROLE_REQUEST_PENDING") {
        setInlineError("You already have a pending Student application.");
      } else {
        dispatch(pushToast({ tone: "warning", title: "Submission failed", message: "Please try again." }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Show the profile-incomplete WARNING dialog the first time only.
    // The four spec'd fields (dateOfBirth, gender, address, qualificationTitle)
    // now live on the backend SessionUser — read them from there, not local
    // storage. Skip submits anyway, Complete navigates to /profile; nothing
    // here blocks the application.
    if (!profileChecked && !isProfileCoreComplete(user)) {
      setProfileDialogOpen(true);
      return;
    }
    void submitApplication();
  };

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 24 }}>
        <Link href="/home" className="btn btn--ghost btn--sm" style={{ marginBottom: 8 }}>
          <Icon name="arrow-left" size={14} /> Back to home
        </Link>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
          Apply to become a Student
        </h1>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          Students get access to the Bible School catalogue and can request enrolment in courses.
        </p>
      </header>

      <FlowStrip activeIndex={0} />

      {!loading && (hasPendingStudent || latestStudent?.status === "rejected") && (
        <div style={{
          background: hasPendingStudent ? "var(--color-warning-bg)" : "var(--color-error-bg)",
          border: `1px solid ${hasPendingStudent ? "rgba(217,119,6,0.25)" : "rgba(220,38,38,0.25)"}`,
          borderRadius: 14, padding: "18px 22px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <Icon name={hasPendingStudent ? "clock" : "x-circle"} size={20}
            style={{ color: hasPendingStudent ? "var(--color-warning)" : "var(--color-error)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-primary-2)" }}>
            {hasPendingStudent
              ? <>You already have a pending Student application. Visit{" "}
                  <Link href="/my-requests" style={{ color: "var(--color-warning)", fontWeight: 600 }}>My Requests</Link>{" "}
                  to track its status.</>
              : <>Your previous application was rejected
                  {latestStudent?.decisionNote ? `: "${latestStudent.decisionNote}"` : "."}{" "}
                  You can submit a new application below.</>}
          </div>
        </div>
      )}

      {inlineError && (
        <div style={{ background: "var(--color-error-bg)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 13, color: "#DC2626", display: "flex", gap: 10 }}>
          <Icon name="alert-circle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {inlineError}{" "}
          <Link href="/my-requests" style={{ fontWeight: 600, color: "#DC2626" }}>View request →</Link>
        </div>
      )}

      <ProfileIncompleteDialog
        open={profileDialogOpen}
        onSkip={() => {
          setProfileDialogOpen(false);
          setProfileChecked(true);
          void submitApplication();
        }}
        onClose={() => setProfileDialogOpen(false)}
      />

      {!hasPendingStudent && (
        <>
          <FeatureGrid />
          <form
            onSubmit={onSubmit}
            style={{
              background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18,
              padding: 24, marginTop: 24, display: "flex", gap: 16, alignItems: "center",
              flexWrap: "wrap", justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--color-primary)" }}>
                Ready to apply?
              </h2>
              <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                We&apos;ll send your request to an admin and email you when it&apos;s decided — usually within 24 hours.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/home" className="btn btn--ghost">Cancel</Link>
              <Button type="submit" size="lg" disabled={submitting} iconAfter="arrow-right">
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function FlowStrip({ activeIndex }: { activeIndex: number }) {
  const steps = [
    { label: "Request access",      icon: "file-text" },
    { label: "Admin review",        icon: "user-check" },
    { label: "Student workspace",   icon: "graduation-cap" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, marginBottom: 20, overflowX: "auto" }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 9999,
            background: i === activeIndex ? "rgba(188,233,85,0.18)" : "var(--color-stroke-2)",
            color: i === activeIndex ? "var(--color-primary)" : "var(--color-body-green)",
            fontFamily: "var(--font-body)", fontWeight: i === activeIndex ? 600 : 500, fontSize: 13,
          }}>
            <Icon name={s.icon} size={14} />{s.label}
          </div>
          {i < steps.length - 1 && <Icon name="chevron-right" size={14} style={{ color: "var(--color-muted)" }} />}
        </div>
      ))}
    </div>
  );
}

function FeatureGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 4 }}>
      {FEATURES.map((f) => (
        <div key={f.title} style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, padding: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(188,233,85,0.18)", color: "var(--color-primary-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Icon name={f.ico} size={18} />
          </div>
          <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-primary)" }}>{f.title}</h3>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", lineHeight: 1.5 }}>{f.body}</p>
        </div>
      ))}
    </div>
  );
}
