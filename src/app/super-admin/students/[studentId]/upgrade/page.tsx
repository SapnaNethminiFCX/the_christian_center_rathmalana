"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface StudentUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  role?: string;
  profilePhotoUrl?: string | null;
  createdAt?: string;
}

export default function UpgradeStudentPage() {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load the student from the API.
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
          router.replace("/super-admin/students");
        } else if (err instanceof ApiRequestError && err.status !== 401) {
          dispatch(pushToast({ tone: "warning", title: "Failed to load student" }));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionUser, params.studentId, router, dispatch]);

  const handleUpgrade = async () => {
    if (!student) return;
    setConfirming(true);
    try {
      await apiRequest(`/super-admin/users/${student.uid}/make-admin`, { method: "POST" });
      dispatch(pushToast({
        tone: "success",
        title: "Role upgraded",
        message: `${student.firstName} ${student.lastName} is now an administrator.`,
      }));
      router.push("/super-admin/admins");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409 && err.code === "INVALID_ROLE") {
          dispatch(pushToast({
            tone: "warning",
            title: "Cannot upgrade",
            message: "Only students can be promoted to administrator.",
          }));
        } else if (err.status === 404) {
          dispatch(pushToast({ tone: "warning", title: "User not found" }));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Failed to upgrade", message: err.message }));
        }
      }
    } finally {
      setConfirming(false);
      setShowConfirm(false);
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
  const alreadyAdmin = student.role === "admin" || student.role === "super_admin";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Upgrade to Administrator</h1>
          <div className="greeting">Grant administrator privileges to this student.</div>
        </div>
        <Button variant="secondary" icon="arrow-left" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="settings-card">
        <div className="avatar-row">
          <Avatar src={student.profilePhotoUrl ?? undefined} size="xl" name={fullName || student.uid} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{fullName || student.uid}</h2>
            <p className="settings-sub" style={{ margin: "4px 0 0" }}>
              {student.email} · Current role: <b>{student.role ?? "student"}</b>
            </p>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2>What happens when you upgrade?</h2>
        <p className="settings-sub" style={{ marginTop: 4 }}>
          The student will be promoted to <b>administrator</b>. They can:
        </p>
        <ul style={{ marginTop: 12, paddingLeft: 20, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)", lineHeight: 1.8 }}>
          <li>Approve / reject student registrations and enrollment requests</li>
          <li>Create, edit, publish and archive courses</li>
          <li>Manage students (suspend / reactivate)</li>
          <li>View the admin dashboard and platform metrics</li>
        </ul>
        <p style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)" }}>
          They will no longer have student-side access (courses, enrollments). This action is
          reversible — a super-admin can delete the admin account or change their role later.
        </p>

        <div className="form-actions" style={{ marginTop: 24 }}>
          <Button variant="ghost" onClick={() => router.back()} disabled={confirming}>
            Cancel
          </Button>
          <Button
            icon="arrow-up-circle"
            onClick={() => setShowConfirm(true)}
            disabled={confirming || alreadyAdmin}
          >
            {alreadyAdmin ? "Already an administrator" : confirming ? "Upgrading…" : "Upgrade to Administrator"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title={`Upgrade ${fullName || "this user"} to administrator?`}
        message="This will grant administrator privileges and remove their student access. Continue?"
        confirmLabel="Upgrade"
        onConfirm={handleUpgrade}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
