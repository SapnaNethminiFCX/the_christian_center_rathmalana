"use client";

/**
 * Student course-detail / enrolment page.
 *
 * APIs used (preserved from V1):
 *  • GET  /courses/:id                  → course title, state, semesters[]
 *  • GET  /subjects/:id/lessons         → lesson titles (preview, no content)
 *  • POST /courses/:id/enroll           → student requests enrolment
 *  • GET  /me/enrollments               → check existing enrolment status
 *
 * Layout: same .viewer two-column shell as the enrolled-course viewer so
 * the student can preview the full course structure before committing.
 *   Left  → sidebar: intake badge + 0% progress bar + semester tree
 *   Right → main: course hero + enrolment CTA + description
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useCourse } from "@/application/hooks/useCourses";
import { useEnrollments } from "@/application/hooks/useEnrollments";
import { useBatches } from "@/application/hooks/useBatches";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { apiRequest } from "@/infrastructure/api/request";
import { ProfileIncompleteDialog } from "@/components/profile/ProfileIncompleteDialog";
import { isProfileCoreComplete } from "@/lib/profileExtras";

interface LessonTitle { id: string; title: string }

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Generates dummy semester date windows based on position.
 *   idx 0 → past   (3–5 months ago)
 *   idx 1 → current (started last month, ends next month)
 *   idx 2 → future  (3–5 months from now)
 * Returns { start, end, state }.
 */

export default function BrowseCourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const { getStatus, getEnrollmentForCourse, enroll } = useEnrollments();
  const [enrolling, setEnrolling] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const sessionUser = useAppSelector((s) => s.session.user);

  const { course, loading, error } = useCourse(sessionUser ? params.courseId : undefined);
  const { batches: realBatches } = useBatches(sessionUser ? params.courseId : undefined);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [lessonsBySubject, setLessonsBySubject] = useState<Record<string, LessonTitle[]>>({});

  useEffect(() => {
    if (error?.status === 404) router.replace("/browse-courses");
  }, [error, router]);

  // Fetch lesson titles for every subject (preview — no video/content).
  useEffect(() => {
    const subjects = course?.semesters?.flatMap((s) => s.subjects ?? []) ?? [];
    if (subjects.length === 0) { setLessonsBySubject({}); return; }
    let cancelled = false;
    Promise.allSettled(
      subjects.map(async (sub) => {
        const list = await apiRequest<LessonTitle[]>(`/subjects/${sub.id}/lessons`);
        return { subjectId: sub.id, list: (list ?? []).map((l) => ({ id: l.id, title: l.title })) };
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, LessonTitle[]> = {};
      for (const r of results) {
        if (r.status === "fulfilled") map[r.value.subjectId] = r.value.list;
      }
      setLessonsBySubject(map);
    });
    return () => { cancelled = true; };
  }, [course?.semesters]);

  // Auto-select first open batch when batches load (before any early returns).
  useEffect(() => {
    if (realBatches.length > 0 && !selectedBatchId) {
      const firstOpen = realBatches.find((b) => b.state === "open");
      if (firstOpen) setSelectedBatchId(firstOpen.id);
    }
  }, [realBatches, selectedBatchId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-body-green)" }}>
        <Icon name="loader" size={24} style={{ opacity: 0.4 }} />
        <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading course…</p>
      </div>
    );
  }

  if (!course) return null;

  const status = getStatus(course.id);
  const existingEnrollment = getEnrollmentForCourse(course.id);

  const sortedSemesters = (course.semesters ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const semesterMeta = sortedSemesters.map((sem) => {
    const now = new Date();
    const start = sem.openDate ? new Date(sem.openDate) : null;
    const end   = sem.endDate  ? new Date(sem.endDate)  : null;
    if (end && end < now)   return { start: sem.openDate ?? null, end: sem.endDate ?? null, state: "past"    as const };
    if (start && start > now) return { start: sem.openDate ?? null, end: sem.endDate ?? null, state: "future"  as const };
    if (start || end)         return { start: sem.openDate ?? null, end: sem.endDate ?? null, state: "current" as const };
    return { start: null, end: null, state: null };
  });

  const selectedBatch = realBatches.find((b) => b.id === selectedBatchId) ?? null;

  // Count lessons — fall back to 3 per subject when API hasn't loaded yet.
  const totalLessons = sortedSemesters.reduce((sum, sem) => {
    return sum + (sem.subjects ?? []).reduce((s2, sub) => {
      const apiCount = lessonsBySubject[sub.id]?.length ?? 0;
      return s2 + (apiCount > 0 ? apiCount : 3);
    }, 0);
  }, 0);

  const performEnroll = async () => {
    setEnrolling(true);
    // V2: POST /enrollments requires { courseId, batchId }
    await enroll(course.id, selectedBatch?.id);
    setEnrolling(false);
  };

  const handleRequest = async () => {
    if (!profileChecked && sessionUser && !isProfileCoreComplete(sessionUser)) {
      setProfileDialogOpen(true);
      return;
    }
    await performEnroll();
  };

  return (
    <div className="viewer">
      {/* ── Sidebar — course structure preview ────────────────────── */}
      <aside className="viewer-side">
        <div className="head">
          <h2>{course.title}</h2>

          {/* Intake badge */}
          {selectedBatch && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "rgba(188,233,85,0.18)",
                borderRadius: 9999,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 12,
                color: "var(--color-primary)",
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <Icon name="calendar-clock" size={13} />
              {selectedBatch.name} · {fmtDate(selectedBatch.intakeStart)} → {fmtDate(selectedBatch.intakeEnd)}
            </div>
          )}

        </div>

        {/* Semester tree */}
        {sortedSemesters.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            <Icon name="layers" size={22} style={{ opacity: 0.35, marginBottom: 8 }} />
            <p style={{ margin: 0 }}>No content yet.</p>
          </div>
        ) : (
          sortedSemesters.map((sem, semIdx) => {
            const { start, end, state } = semesterMeta[semIdx];
            // Only show state labels/lock if we have real dates from the API.
            const hasRealDates = !!(start || end);
            const isPast    = hasRealDates && state === "past";
            const isFuture  = hasRealDates && state === "future";
            const isCurrent = hasRealDates && state === "current";
            const isLocked  = isPast || isFuture;

            const stateLabel  = isPast ? "Past" : isFuture ? "Future" : isCurrent ? "Current" : null;
            const dateColor   = isPast ? "var(--color-error-deep)" : isFuture ? "var(--color-muted)" : "var(--color-success-deep)";
            const closedSuffix = isPast ? " · closed" : "";

            return (
              <div className="semester" key={sem.id} style={{ opacity: isLocked ? 0.7 : 1 }}>
                {/* Semester header */}
                <div
                  className="semester-head"
                  style={{ fontWeight: isCurrent ? 700 : 600, color: isLocked ? "var(--color-muted)" : "var(--color-primary)" }}
                >
                  <span>
                    {sem.title ?? sem.name}
                    {stateLabel && (
                      <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 6, color: "var(--color-muted)" }}>
                        · {stateLabel}
                      </span>
                    )}
                  </span>
                  {isLocked
                    ? <Icon name="lock" size={13} style={{ color: "var(--color-muted)" }} />
                    : <Icon name="chevron-down" size={14} />}
                </div>

                {/* Date range row — only shown when real dates exist */}
                {hasRealDates && (start || end) && (
                  <div style={{ padding: "0 24px 8px", fontFamily: "var(--font-mono)", fontSize: 11, color: dateColor }}>
                    {fmtDate(start ?? "")} → {fmtDate(end ?? "")}{closedSuffix}
                  </div>
                )}

                {/* Locked semesters: hint + one placeholder lesson */}
                {isLocked && (
                  <div style={{ padding: "4px 24px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)", marginBottom: 6 }}>
                      <Icon name="lock" size={13} />
                      {isPast ? "Closed: past content" : "Locked: future content"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)", paddingLeft: 8 }}>
                      <Icon name="lock" size={11} />
                      {isPast ? "Past lesson" : "Locked lesson"}
                    </div>
                  </div>
                )}

                {/* Current semester: show all subjects + lessons */}
                {isCurrent && (
                  <>
                    {(sem.subjects ?? []).map((sub) => {
                      const lessons = lessonsBySubject[sub.id] ?? [];
                      return (
                        <div key={sub.id}>
                          <div className="subject notstarted" style={{ cursor: "default" }}>
                            <span className="dot">
                              <Icon name="play-circle" size={14} style={{ color: "var(--color-accent)" }} />
                            </span>
                            {sub.title}
                          </div>
                          <div>
                            {lessons.map((l, li) => (
                              <div
                                key={l.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 18px 7px 52px",
                                  fontFamily: "var(--font-body)",
                                  fontSize: 13,
                                  color: li === 0 ? "var(--color-primary)" : "var(--color-body-green)",
                                  background: li === 0 ? "rgba(188,233,85,0.15)" : "transparent",
                                  fontWeight: li === 0 ? 700 : 400,
                                  borderRadius: li === 0 ? 6 : 0,
                                  margin: li === 0 ? "0 8px" : 0,
                                  width: li === 0 ? "calc(100% - 16px)" : "100%",
                                }}
                              >
                                <Icon
                                  name={li === 0 ? "play-circle" : "circle"}
                                  size={12}
                                  style={{ color: li === 0 ? "var(--color-accent)" : "var(--color-muted)", flexShrink: 0 }}
                                />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {l.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {(!sem.subjects || sem.subjects.length === 0) && (
                      <div style={{ padding: "6px 18px 8px 36px", fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                        No subjects yet
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {/* Sidebar footer note */}
        <div style={{ padding: "20px 24px 12px", borderTop: "1px solid var(--color-stroke-2)", marginTop: 8 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", lineHeight: 1.5 }}>
            Lessons unlock after your enrolment is approved. Future semesters unlock as the schedule opens.
          </p>
        </div>
      </aside>

      {/* ── Main panel — enrolment CTA ────────────────────────────── */}
      <div className="viewer-main">
        <div className="crumbs">
          <button
            type="button"
            onClick={() => router.push("/browse-courses")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="arrow-left" size={14} /> Browse Courses
          </button>
        </div>

        <h1 style={{ marginBottom: 8 }}>{course.title}</h1>

        {/* Enrolment status + action card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-stroke)",
            borderRadius: 18,
            padding: 28,
            marginBottom: 24,
          }}
        >
          {status === "available" && (
            <>
              <h2 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading)", fontSize: 20, color: "var(--color-primary)" }}>
                Ready to enrol?
              </h2>
              <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)", lineHeight: 1.6 }}>
                Submit a request — an admin will approve it within 24 hours. Once approved you&apos;ll get
                instant access to the first semester&apos;s content.
              </p>
              {/* All batches — open ones selectable, closed/draft dimmed.
                  When the backend hasn't published any intake yet, show a
                  notice and still allow the student to submit a request;
                  admins will assign them to the next intake when it opens. */}
              {realBatches.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {realBatches.map((b) => {
                    const isOpen = b.state === "open";
                    const isSelected = selectedBatchId === b.id;
                    return (
                      <div
                        key={b.id}
                        className="batch-row"
                        onClick={() => isOpen && setSelectedBatchId(b.id)}
                        style={{
                          opacity: isOpen ? 1 : 0.4,
                          cursor: isOpen ? "pointer" : "not-allowed",
                          border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-stroke)",
                          background: isSelected ? "rgba(188,233,85,0.08)" : undefined,
                          transition: "border 150ms, background 150ms",
                        }}
                      >
                        <div className="ico"><Icon name="calendar-clock" size={18} /></div>
                        <div className="b-body">
                          <div className="name">{b.name}</div>
                          <div className="window">
                            <span><Icon name="calendar" size={12} /> {fmtDate(b.intakeStart)} → {fmtDate(b.intakeEnd)}</span>
                            {b.capacity && <><span className="sep">·</span><span><Icon name="users" size={12} /> Cap: {b.capacity}</span></>}
                          </div>
                        </div>
                        <Badge tone={isOpen ? "success" : b.state === "closed" ? "archive" : "warning"}>
                          {b.state}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="pending-callout" style={{ marginBottom: 20 }}>
                  <div className="ico"><Icon name="info" size={18} /></div>
                  <div className="b-body">
                    <b>No intakes available right now.</b> You can still submit your
                    request — we&apos;ll assign you to the next intake when it opens.
                  </div>
                </div>
              )}
              <Button
                size="lg"
                icon="clipboard-list"
                onClick={handleRequest}
                disabled={
                  enrolling ||
                  (realBatches.length > 0 && (!selectedBatch || selectedBatch.state !== "open"))
                }
              >
                {enrolling
                  ? "Requesting…"
                  : realBatches.length === 0 || selectedBatch
                    ? "Request Enrolment"
                    : "Select an intake above"}
              </Button>
            </>
          )}

          {status === "pending" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--color-warning-bg)", color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="clock" size={22} />
                </div>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-primary)" }}>
                    Application in review
                  </h2>
                  <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                    Your enrolment request is awaiting admin approval. Usually within 24 hours.
                  </p>
                </div>
              </div>
              <Badge tone="warning">Pending Admin Approval</Badge>
            </>
          )}

          {status === "approved" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--color-success-bg)", color: "var(--color-success-deep)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="check-circle" size={22} />
                </div>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-primary)" }}>
                    You&apos;re enrolled!
                  </h2>
                  <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                    Access your lessons, track progress, and download materials.
                  </p>
                </div>
              </div>
              <Button size="lg" icon="play" onClick={() => router.push(`/my-courses/${course.id}`)}>
                Continue learning
              </Button>
            </>
          )}

          {existingEnrollment?.state === "rejected" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--color-error-bg)", color: "var(--color-error)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="x-circle" size={22} />
                </div>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-primary)" }}>
                    Request rejected
                  </h2>
                  {existingEnrollment.reason && (
                    <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                      {existingEnrollment.reason}
                    </p>
                  )}
                </div>
              </div>
              <Button size="lg" icon="clipboard-list" onClick={handleRequest} disabled={enrolling}>
                {enrolling ? "Requesting…" : "Request Again"}
              </Button>
            </>
          )}
        </div>

        {/* Course meta */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)", marginBottom: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="layers" size={14} /> {course.semesterCount} {course.semesterCount === 1 ? "semester" : "semesters"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="play-circle" size={14} /> {totalLessons} lessons
          </span>
          {course.state === "published" && course.publishedAt && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="calendar" size={14} />
              Published {new Date(course.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <Button variant="ghost" icon="arrow-left" onClick={() => router.push("/browse-courses")}>
            Back to catalog
          </Button>
        </div>
      </div>

      <ProfileIncompleteDialog
        open={profileDialogOpen}
        onSkip={() => {
          setProfileDialogOpen(false);
          setProfileChecked(true);
          void performEnroll();
        }}
        onClose={() => setProfileDialogOpen(false)}
      />
    </div>
  );
}
