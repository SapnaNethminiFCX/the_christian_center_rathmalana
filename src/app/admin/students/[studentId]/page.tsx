"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { CourseSummary } from "@/application/hooks/useCourses";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";

interface StudentUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // V2: optional. Backend may not yet return; default to ["member","student"]
  // since this page lists students.
  roles?: string[];
}

interface AdminEnrollment {
  id: string;
  studentUid: string;
  courseId: string;
  state: string;
  reason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
}

interface EnrollmentWithCourse {
  enrollment: AdminEnrollment;
  courseTitle: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function statusBadge(status: string | undefined) {
  if (status === "suspended") return <Badge tone="error">Suspended</Badge>;
  if (status === "pending_approval") return <Badge tone="warning">Pending</Badge>;
  return <Badge tone="success">Active</Badge>;
}

function enrollmentBadge(state: string) {
  if (state === "approved") return <Badge tone="success">Approved</Badge>;
  if (state === "rejected") return <Badge tone="error">Rejected</Badge>;
  if (state === "withdrawn") return <Badge tone="archive">Withdrawn</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname?.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const params = useParams<{ studentId: string }>();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "reactivate" | "delete" | null>(null);
  // Demote target — which role to strip. UI only; backend endpoint pending.
  const [demoteTarget, setDemoteTarget] = useState<"leader" | "g12" | null>(null);

  // 1. Fetch the student profile.
  useEffect(() => {
    if (!sessionUser || !params.studentId) return;
    let cancelled = false;
    setLoading(true);
    apiRequest<StudentUser>(`/users/${params.studentId}`)
      .then((data) => { if (!cancelled) setStudent(data); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          dispatch(pushToast({ tone: "warning", title: "Student not found" }));
          router.replace(`${base}/students`);
        } else if (err instanceof ApiRequestError && err.status !== 401) {
          dispatch(pushToast({ tone: "warning", title: "Failed to load student" }));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionUser, params.studentId, base, router, dispatch]);

  // 2. Fetch the student's enrollments + course titles in parallel.
  useEffect(() => {
    if (!sessionUser || !params.studentId) return;
    let cancelled = false;
    setEnrollmentsLoading(true);

    (async () => {
      try {
        const enrParams = new URLSearchParams({ studentUid: params.studentId, limit: "100" });
        const data = await apiRequest<{ items: AdminEnrollment[] }>(`/admin/enrollments?${enrParams}`);
        const items = data.items ?? [];
        // Resolve course titles in parallel.
        const courseTitleByCourseId = new Map<string, string>();
        await Promise.allSettled(
          [...new Set(items.map((e) => e.courseId))].map(async (courseId) => {
            try {
              const c = await apiRequest<CourseSummary>(`/courses/${courseId}`);
              courseTitleByCourseId.set(courseId, c.title);
            } catch { /* fall back to id */ }
          }),
        );
        if (cancelled) return;
        // Sort newest first.
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEnrollments(items.map((e) => ({
          enrollment: e,
          courseTitle: courseTitleByCourseId.get(e.courseId) ?? `Course (${e.courseId.slice(0, 8)}…)`,
        })));
      } catch {
        if (!cancelled) setEnrollments([]);
      } finally {
        if (!cancelled) setEnrollmentsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionUser, params.studentId]);

  const handleSuspend = async () => {
    if (!student) return;
    setActionBusy(true);
    try {
      await apiRequest(`/users/${student.uid}/suspend`, { method: "POST" });
      setStudent({ ...student, status: "suspended" });
      dispatch(pushToast({ tone: "success", title: "Student suspended", message: "They can no longer log in." }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) {
          dispatch(pushToast({ tone: "warning", title: "Already suspended" }));
          setStudent({ ...student, status: "suspended" });
        } else {
          dispatch(pushToast({ tone: "warning", title: "Failed to suspend", message: err.message }));
        }
      }
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  // DELETE /users/:uid (V2 spec §4.9) — soft-deletes the Firestore record
  // and disables the Firebase Auth account. Backend rejects with 403 when
  // the caller is the target, or when the target is admin/super_admin
  // (those go through DELETE /super-admin/admins/:uid instead).
  const handleDelete = async () => {
    if (!student) return;
    setActionBusy(true);
    try {
      await apiRequest(`/users/${student.uid}`, { method: "DELETE" });
      dispatch(
        pushToast({
          tone: "success",
          title: "User deleted",
          message: `${student.firstName} ${student.lastName} can no longer sign in.`,
        }),
      );
      router.replace(`${base}/students`);
    } catch (err) {
      let title = "Couldn't delete user";
      let message: string | undefined;
      if (err instanceof ApiRequestError) {
        if (err.status === 403) {
          title = "Not permitted";
          message = err.message; // backend message already explains why
        } else if (err.status === 404) {
          title = "User not found";
          message = "They may have already been deleted.";
        } else {
          message = err.message;
        }
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  // Demote — strip leader or g12 from the user. UI only; the role mutation
  // endpoint (PATCH /users/:uid/roles with action="remove") isn't wired here
  // yet so we simulate the update locally + toast. The user keeps Member
  // (and Student, if they had it) and stays as a regular member of any
  // cells they were leading — only the edit / create privileges go away.
  const handleDemote = async () => {
    if (!student || !demoteTarget) return;
    setActionBusy(true);
    await new Promise((r) => setTimeout(r, 200));
    const nextRoles = (student.roles ?? ["member", "student"]).filter((r) => r !== demoteTarget);
    setStudent({ ...student, roles: nextRoles });
    const remaining = nextRoles.includes("student") ? "Member + Student" : "Member";
    dispatch(
      pushToast({
        tone: "success",
        title: `Demoted from ${demoteTarget === "g12" ? "G12 Leader" : "Cell Leader"}`,
        message: `Now ${remaining}. Stays in their cells as a regular member. (UI only — role mutation backend pending.)`,
      }),
    );
    setActionBusy(false);
    setDemoteTarget(null);
  };

  const handleReactivate = async () => {
    if (!student) return;
    setActionBusy(true);
    try {
      await apiRequest(`/users/${student.uid}/reactivate`, { method: "POST" });
      setStudent({ ...student, status: "approved" });
      dispatch(pushToast({ tone: "success", title: "Student reactivated", message: "They can log in again." }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) {
          dispatch(pushToast({ tone: "warning", title: "Already active" }));
          setStudent({ ...student, status: "approved" });
        } else {
          dispatch(pushToast({ tone: "warning", title: "Failed to reactivate", message: err.message }));
        }
      }
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  if (loading && !student) {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-body-green)" }}>
          <Icon name="loader" size={22} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading student…</p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const fullName = `${student.firstName} ${student.lastName}`.trim();
  const approvedCount = enrollments.filter((e) => e.enrollment.state === "approved").length;
  const pendingCount = enrollments.filter((e) => e.enrollment.state === "pending").length;

  const studentRoles = student.roles ?? ["member", "student"];
  const hasLeader = studentRoles.includes("leader");
  const hasG12 = studentRoles.includes("g12");
  const canDemote = hasLeader || hasG12;
  // Spec §4.9: backend rejects DELETE /users/:uid when caller === target,
  // or when target holds admin / super_admin. Hide the button in those
  // cases rather than letting the click fail.
  const isSelf = student.uid === sessionUser?.uid;
  const targetIsAdmin = studentRoles.includes("admin") || studentRoles.includes("super_admin");
  const canDelete = !isSelf && !targetIsAdmin;
  // Demote target priority — if the user holds both, default to stripping G12
  // first (the higher privilege). Admins can re-open the page to demote
  // further.
  const defaultDemoteRole: "leader" | "g12" = hasG12 ? "g12" : "leader";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{fullName || student.uid}</h1>
          <div className="greeting">{student.email}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" icon="arrow-left" onClick={() => router.push(`${base}/students`)}>
            Back
          </Button>
          {canDemote && (
            <Button
              variant="secondary"
              icon="chevron-down"
              onClick={() => setDemoteTarget(defaultDemoteRole)}
              disabled={actionBusy}
              title={`Demote from ${defaultDemoteRole === "g12" ? "G12 Leader" : "Cell Leader"}`}
            >
              Demote
            </Button>
          )}
          {student.status === "suspended" ? (
            <Button
              icon="check-circle"
              onClick={() => setConfirmAction("reactivate")}
              disabled={actionBusy}
            >
              {actionBusy ? "Reactivating…" : "Reactivate"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon="user-x"
              onClick={() => setConfirmAction("suspend")}
              disabled={actionBusy}
              style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
            >
              {actionBusy ? "Suspending…" : "Suspend"}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="secondary"
              icon="trash-2"
              onClick={() => setConfirmAction("delete")}
              disabled={actionBusy}
              style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
            >
              {actionBusy && confirmAction === "delete" ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </div>

      {/* Profile content — the Roles and Audit tabs were UI-only mocks and
          have been removed. Re-introduce them once
            PATCH /users/:uid/roles  and  GET /users/:uid/audit-log
          are wired on the backend. */}
      <>
      <div className="settings-card">
        <div className="avatar-row">
          <Avatar src={student.profilePhotoUrl ?? undefined} size="xl" name={fullName || student.uid} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{fullName || student.uid}</h2>
            <p className="settings-sub" style={{ margin: "4px 0 0" }}>
              Joined {formatDate(student.createdAt)}
            </p>
            <div style={{ marginTop: 8 }}>
              <RoleBadgeStack
                roles={
                  student.roles && student.roles.length > 0 ? student.roles : ["member", "student"]
                }
              />
            </div>
          </div>
          <div>{statusBadge(student.status)}</div>
        </div>

        <div className="form-grid two" style={{ marginTop: 16 }}>
          <div>
            <div className="kpi-label" style={{ marginBottom: 4 }}>Approved enrollments</div>
            <div className="kpi-num" style={{ marginTop: 0 }}>{approvedCount}</div>
          </div>
          <div>
            <div className="kpi-label" style={{ marginBottom: 4 }}>Pending requests</div>
            <div className="kpi-num" style={{ marginTop: 0 }}>{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Contact / identifiers */}
      <div className="settings-card">
        <h2>Account</h2>
        <div style={{ display: "grid", gap: 12, marginTop: 12, fontFamily: "var(--font-body)", fontSize: 14 }}>
          <Row label="Email" value={student.email} />
          <Row label="User ID" value={student.uid} mono />
          <Row label="Created" value={formatDate(student.createdAt)} />
          {student.updatedAt && <Row label="Last updated" value={formatDate(student.updatedAt)} />}
        </div>
      </div>

      {/* Enrollments */}
      <div className="settings-card">
        <h2>Enrollments</h2>
        <p className="settings-sub">All course requests this student has submitted.</p>

        {enrollmentsLoading && enrollments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--color-muted)" }}>
            <Icon name="loader" size={18} />
          </div>
        ) : enrollments.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            <Icon name="book-open" size={22} style={{ opacity: 0.35, marginBottom: 8 }} />
            <div>No enrollment requests yet.</div>
          </div>
        ) : (
          <div className="activity" style={{ marginTop: 12 }}>
            {enrollments.map(({ enrollment, courseTitle }) => (
              <div className="row" key={enrollment.id}>
                <div className="ico">
                  <Icon name="book-open" size={16} />
                </div>
                <div className="body" style={{ flex: 1, minWidth: 0 }}>
                  <div className="title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {courseTitle}
                  </div>
                  <div className="meta">
                    Requested {formatDate(enrollment.createdAt)}
                    {enrollment.reason && enrollment.state === "rejected" && (
                      <> · <i>Reason: {enrollment.reason}</i></>
                    )}
                  </div>
                </div>
                {enrollmentBadge(enrollment.state)}
              </div>
            ))}
          </div>
        )}
      </div>

      </>

      {/* Suspend / Reactivate / Delete confirm */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === "suspend"
            ? `Suspend ${fullName || "this student"}?`
            : confirmAction === "delete"
              ? `Delete ${fullName || "this student"}?`
              : `Reactivate ${fullName || "this student"}?`
        }
        message={
          confirmAction === "suspend"
            ? "They will be signed out immediately and won't be able to log in until reactivated. Their enrollments and progress are preserved."
            : confirmAction === "delete"
              ? "This soft-deletes the account and disables their Firebase sign-in. They can no longer log in. The record is preserved for audit purposes."
              : "They will be able to sign in again and resume their courses."
        }
        confirmLabel={
          confirmAction === "suspend" ? "Suspend"
          : confirmAction === "delete" ? "Yes, delete"
          : "Reactivate"
        }
        destructive={confirmAction === "suspend" || confirmAction === "delete"}
        onConfirm={
          confirmAction === "suspend" ? handleSuspend
          : confirmAction === "delete" ? handleDelete
          : handleReactivate
        }
        onCancel={() => setConfirmAction(null)}
      />

      {/* Demote confirm — strips the named role. The user keeps every other
          role they hold (Member always, plus Student if applicable) and
          stays as a regular member of any cells they belong to — only the
          edit / create / file-report privileges that came with the demoted
          role are removed. */}
      <ConfirmDialog
        open={demoteTarget !== null}
        title={
          demoteTarget === "g12"
            ? `Demote ${fullName || "this user"} from G12 Leader?`
            : `Demote ${fullName || "this user"} from Cell Leader?`
        }
        message={
          demoteTarget === "g12"
            ? "Removes the G12 role only. The user keeps their Cell Leader role (or just Member / Member + Student if they don't lead a cell) and remains a member of any cells they belong to. They lose oversight of the leaders in their network."
            : "Removes the Cell Leader role only. The user stays as a Member (or Member + Student if applicable) and remains a member of any cells they were leading. They can no longer create or edit cells, manage members, or file cell reports."
        }
        confirmLabel="Yes, demote"
        destructive
        onConfirm={handleDemote}
        onCancel={() => setDemoteTarget(null)}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--color-stroke)" }}>
      <span style={{ color: "var(--color-muted)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-body)", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
