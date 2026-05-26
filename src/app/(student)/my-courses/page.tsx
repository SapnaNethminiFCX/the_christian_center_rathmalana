"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CourseCover } from "@/components/ui/CourseCover";
import { Icon } from "@/components/ui/Icon";
import { useEnrollments, type Enrollment } from "@/application/hooks/useEnrollments";
import { useCourses, type CourseSummary } from "@/application/hooks/useCourses";
import { apiRequest } from "@/infrastructure/api/request";
import type { CourseProgress } from "@/application/hooks/useProgress";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function stateBadge(state: Enrollment["state"]) {
  if (state === "approved") return <Badge tone="success">Approved</Badge>;
  if (state === "pending") return <Badge tone="warning">Pending Approval</Badge>;
  if (state === "rejected") return <Badge tone="error">Rejected</Badge>;
  return <Badge tone="archive">Withdrawn</Badge>;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const E = useEnrollments();
  const C = useCourses({ limit: 100 });
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [toWithdraw, setToWithdraw] = useState<Enrollment | null>(null);

  // Index courses by id for quick title lookup.
  const courseById = useMemo(() => {
    const map = new Map<string, CourseSummary>();
    for (const c of C.items) map.set(c.id, c);
    return map;
  }, [C.items]);

  // Filter + group.
  // normalise V1 `state` and V2 `status` to one field
  const eState = (e: Enrollment) => e.status ?? e.state ?? "pending";

  const visible = useMemo(() => {
    return E.items.filter((e) => showWithdrawn || eState(e) !== "withdrawn");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [E.items, showWithdrawn]);

  const approved  = visible.filter((e) => eState(e) === "approved");
  const pending   = visible.filter((e) => eState(e) === "pending");
  const rejected  = visible.filter((e) => eState(e) === "rejected");
  const withdrawn = visible.filter((e) => eState(e) === "withdrawn");

  // Fetch progress for every approved enrollment in PARALLEL.
  const [progressById, setProgressById] = useState<Record<string, CourseProgress | null>>({});
  useEffect(() => {
    if (approved.length === 0) { setProgressById({}); return; }
    let cancelled = false;
    Promise.allSettled(
      approved.map(async (enr) => {
        const p = await apiRequest<CourseProgress>(`/me/progress/courses/${enr.courseId}`);
        return { courseId: enr.courseId, progress: p };
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, CourseProgress | null> = {};
      for (const r of results) if (r.status === "fulfilled") map[r.value.courseId] = r.value.progress;
      setProgressById(map);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved.length, approved.map((e) => e.courseId).join(",")]);

  // Split approved into "active" (< 100%) and "done" (= 100%).
  const approvedActive = approved.filter((e) => (progressById[e.courseId]?.completionPercent ?? 0) < 100);
  const approvedDone = approved.filter((e) => (progressById[e.courseId]?.completionPercent ?? 0) >= 100);

  const loading = E.loading || C.loading;

  const onConfirmWithdraw = async () => {
    if (!toWithdraw) return;
    await E.withdraw(toWithdraw.id);
    setToWithdraw(null);
  };

  const renderCard = (e: Enrollment) => {
    const course = courseById.get(e.courseId);
    const title = course?.title ?? "Course no longer available";
    const semCount = course?.semesterCount ?? 0;

    return (
      <article
        key={e.id}
        className="course-card my-card"
        style={{
          cursor: e.state === "approved" ? "pointer" : "default",
          opacity: e.state === "withdrawn" || e.state === "rejected" ? 0.7 : 1,
        }}
        onClick={() => {
          if (e.state === "approved") router.push(`/my-courses/${e.courseId}`);
        }}
      >
        <div style={{ position: "relative" }}>
          <CourseCover imageUrl={course?.coverImageUrl} title={title} alt={title} />
          {e.state !== "approved" && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(21,42,36,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              {stateBadge(e.state)}
            </div>
          )}
        </div>
        <div className="body">
          <div className="meta">
            <span><Icon name="layers" size={12} />{semCount} {semCount === 1 ? "semester" : "semesters"}</span>
            <span><Icon name="calendar" size={12} />Requested {formatDate(e.createdAt)}</span>
          </div>
          <h3>{title}</h3>

          {e.state === "approved" && (
            <div style={{ marginTop: 8 }}>
              <Badge tone="success">Approved</Badge>
            </div>
          )}

          {e.state === "pending" && (
            <>
              <p style={{ fontSize: 12, color: "var(--color-body-green)", fontFamily: "var(--font-body)", margin: "4px 0 12px" }}>
                Awaiting admin approval. You will be notified once approved.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={(ev) => { ev.stopPropagation(); setToWithdraw(e); }}
              >
                Withdraw request
              </Button>
            </>
          )}

          {e.state === "rejected" && (
            <p style={{ fontSize: 12, color: "var(--color-body-green)", fontFamily: "var(--font-body)", margin: "8px 0 0" }}>
              {e.reason
                ? <><b>Reason:</b> {e.reason}</>
                : "Your request was not approved."}
            </p>
          )}

          {e.state === "approved" && (
            <div style={{ marginTop: 12 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={(ev) => { ev.stopPropagation(); setToWithdraw(e); }}
              >
                Withdraw
              </Button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Courses</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{approved.length}</b> enrolled ·{" "}
            <b style={{ color: "var(--color-primary)" }}>{pending.length}</b> pending
            {rejected.length > 0 && <> · {rejected.length} rejected</>}
          </div>
        </div>
        <Button
          variant="secondary"
          icon="search"
          onClick={() => router.push("/browse-courses")}
        >
          Browse Courses
        </Button>
      </div>

      {loading && E.items.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-body-green)" }}>
          <Icon name="loader" size={22} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 10, fontFamily: "var(--font-body)" }}>Loading your enrollments…</p>
        </div>
      )}

      {!loading && E.items.length === 0 && (
        <div className="empty" style={{ padding: "48px 16px" }}>
          <h3>No enrollments yet</h3>
          <p>Browse the catalog and request enrollment in your first course.</p>
          <div style={{ marginTop: 16 }}>
            <Button icon="search" onClick={() => router.push("/browse-courses")}>
              Browse Courses
            </Button>
          </div>
        </div>
      )}

      {approvedActive.length > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 12 }}>
            <h3>Enrolled</h3>
            <Badge tone="success">{approvedActive.length}</Badge>
          </div>
          <div className="my-grid">{approvedActive.map(renderCard)}</div>
        </>
      )}

      {approvedDone.length > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 32 }}>
            <h3>Done</h3>
            <Badge tone="success">{approvedDone.length} completed</Badge>
          </div>
          <div className="my-grid">
            {approvedDone.map((e) => {
              const course = courseById.get(e.courseId);
              const title = course?.title ?? "Course";
              return (
                <article
                  key={e.id}
                  className="course-card my-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/my-courses/${e.courseId}`)}
                >
                  <CourseCover imageUrl={course?.coverImageUrl} title={title} tag="100% complete" />
                  <div className="body">
                    <h3>{title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4ade80", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>
                      <Icon name="check-circle" size={14} /> Completed
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {pending.length > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 32 }}>
            <h3>Pending Approval</h3>
            <Badge tone="warning">{pending.length} awaiting</Badge>
          </div>
          <div className="my-grid">{pending.map(renderCard)}</div>
        </>
      )}

      {rejected.length > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 32 }}>
            <h3>Rejected</h3>
            <Badge tone="error">{rejected.length}</Badge>
          </div>
          <div className="my-grid">{rejected.map(renderCard)}</div>
        </>
      )}

      {E.items.some((e) => e.state === "withdrawn") && (
        <div style={{ marginTop: 32 }}>
          <button
            onClick={() => setShowWithdrawn((v) => !v)}
            style={{
              background: "none",
              border: "1px solid var(--color-stroke)",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
            }}
          >
            {showWithdrawn ? "Hide" : "Show"} withdrawn enrollments
          </button>
          {showWithdrawn && withdrawn.length > 0 && (
            <div className="my-grid" style={{ marginTop: 16 }}>{withdrawn.map(renderCard)}</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toWithdraw}
        title={toWithdraw ? `Withdraw enrollment?` : ""}
        message={
          toWithdraw?.state === "approved"
            ? "You will lose access to this course immediately. You can request enrollment again later."
            : "Cancel your pending enrollment request? You can re-request later."
        }
        confirmLabel="Withdraw"
        destructive
        onConfirm={onConfirmWithdraw}
        onCancel={() => setToWithdraw(null)}
      />
    </div>
  );
}
