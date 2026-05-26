"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useRoleRequests } from "@/application/hooks/useRoleRequests";
import { setUser, type SessionUser } from "@/application/slices/sessionSlice";
import { apiRequest } from "@/infrastructure/api/request";
import { auth } from "@/infrastructure/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function ApplyStudentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);
  const requestId = searchParams?.get("req") ?? null;

  const { latestStudent, refetch } = useRoleRequests();

  // Poll every 30s while the request is still pending.
  useEffect(() => {
    if (latestStudent?.status !== "pending") return;
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [latestStudent?.status, refetch]);

  // Refetch on tab focus — user may have been notified via email.
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  // If approved → force-refresh Firebase token so new student claim is picked
  // up, re-fetch /me to update Redux roles, then navigate to student dashboard.
  useEffect(() => {
    if (latestStudent?.status !== "approved") return;
    (async () => {
      try {
        // Force token refresh so Firebase custom claims include `student`.
        await auth.currentUser?.getIdToken(/* forceRefresh */ true);
        // Re-fetch user profile with updated roles.
        const me = await apiRequest<SessionUser>("/me");
        dispatch(setUser(me));
      } catch {
        // Best-effort — proceed to redirect even if refresh fails.
      }
      // Route to student dashboard (/dashboard) — the student's home.
      // Use replace so back-button doesn't loop to the pending page.
      router.replace("/dashboard");
    })();
  }, [latestStudent?.status, dispatch, router]);

  const firstName = user?.firstName ?? "there";
  const email = user?.email ?? "";
  const status = latestStudent?.status ?? "pending";

  return (
    <div className="page" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        maxWidth: 560, width: "100%", background: "#fff",
        border: "1px solid var(--color-stroke)", borderRadius: 18,
        padding: "40px 32px 32px", textAlign: "center",
      }}>
        {status === "rejected" ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-error-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "var(--color-error)" }}>
              <Icon name="x-circle" size={28} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--color-primary)" }}>
              Application not approved
            </h3>
            <p className="sub" style={{ margin: "0 auto 8px", maxWidth: 440, fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.55, color: "var(--color-body-green)" }}>
              {latestStudent?.decisionNote
                ? <>An admin left a note: <b>&ldquo;{latestStudent.decisionNote}&rdquo;</b></>
                : "Your application was not approved. You can submit a new one."}
            </p>
          </>
        ) : (
          <>
            <div className="pending-orbit" aria-hidden="true">
              <span className="ring" />
              <span className="ring r2" />
              <span className="ring r3" />
              <div className="orbit-center"><Icon name="clock" size={28} /></div>
            </div>
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--color-primary)" }}>
              Waiting for approval
            </h3>
            <p className="sub" style={{ margin: "0 auto", maxWidth: 440, fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.55, color: "var(--color-body-green)" }}>
              Thanks{firstName !== "there" ? `, ${firstName}` : ""}. An administrator is reviewing your
              Student application. We&apos;ll email <b>{email}</b> the moment it&apos;s approved —
              usually within <b>24 hours</b>.
            </p>
          </>
        )}

        <ol className="pending-steps" style={{ marginTop: 24 }}>
          <li className="done">
            <span className="step-ico"><Icon name="check" size={14} /></span>
            <div><b>Application submitted</b><span>Request sent to admin queue</span></div>
          </li>
          <li className={status === "pending" ? "active" : status === "approved" ? "done" : ""}>
            <span className={`step-ico${status === "pending" ? " spin" : ""}`}>
              <Icon name={status === "approved" ? "check" : status === "rejected" ? "x" : "clock"} size={14} />
            </span>
            <div>
              <b>In review by admin</b>
              <span>{status === "pending" ? "We're reviewing your details" : status === "approved" ? "Approved" : "Not approved"}</span>
            </div>
          </li>
          <li className={status === "approved" ? "done" : ""}>
            <span className="step-ico"><Icon name="user-check" size={14} /></span>
            <div><b>Student workspace</b><span>Browse and apply to course intakes</span></div>
          </li>
        </ol>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          {status === "rejected" ? (
            <Button full size="lg" icon="refresh-cw" onClick={() => router.push("/apply/student")}>
              Submit a new application
            </Button>
          ) : (
            <Button full size="lg" icon="home" onClick={() => router.push("/home")}>
              Back to Member dashboard
            </Button>
          )}
          <Link href="/my-requests" className="btn btn--secondary btn--full">
            <Icon name="file-text" size={16} /> Track this request
          </Link>
          {requestId && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", marginTop: 6 }}>
              Request ID: <code>{requestId}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
