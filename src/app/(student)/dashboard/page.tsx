"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { CourseCover } from "@/components/ui/CourseCover";
import { Icon } from "@/components/ui/Icon";
import { coverGradient } from "@/lib/kit";
import { useEnrollments } from "@/application/hooks/useEnrollments";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { CourseSummary as ApiCourseSummary } from "@/application/hooks/useCourses";
import type { CourseProgress } from "@/application/hooks/useProgress";

interface ApprovedCourse {
  courseId: string;
  courseTitle: string;
  coverImageUrl?: string | null;
  progress: CourseProgress | null;
  enrollmentApprovedAt: string | null;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const sessionUser = useAppSelector((s) => s.session.user);
  const { items: enrollments, loading: enrollmentsLoading } = useEnrollments();

  const approvedEnrollments = useMemo(
    () => enrollments.filter((e) => e.state === "approved"),
    [enrollments],
  );
  const pendingEnrollmentsCount = useMemo(
    () => enrollments.filter((e) => e.state === "pending").length,
    [enrollments],
  );

  const [approvedCourses, setApprovedCourses] = useState<ApprovedCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Fetch progress + course title for every approved enrollment in PARALLEL.
  useEffect(() => {
    if (!sessionUser || approvedEnrollments.length === 0) {
      setApprovedCourses([]);
      return;
    }
    let cancelled = false;
    setCoursesLoading(true);

    Promise.allSettled(
      approvedEnrollments.map(async (enr) => {
        // Course title + progress fetched in parallel.
        const [courseResult, progressResult] = await Promise.allSettled([
          apiRequest<ApiCourseSummary>(`/courses/${enr.courseId}`),
          apiRequest<CourseProgress>(`/me/progress/courses/${enr.courseId}`),
        ]);
        const courseData = courseResult.status === "fulfilled" ? courseResult.value : null;
        const courseTitle = courseData?.title ?? enr.courseId;
        const coverImageUrl = courseData?.coverImageUrl ?? null;
        const progress =
          progressResult.status === "fulfilled" ? progressResult.value : null;
        return {
          courseId: enr.courseId,
          courseTitle,
          coverImageUrl,
          progress,
          enrollmentApprovedAt: enr.approvedAt ?? null,
        } as ApprovedCourse;
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const list: ApprovedCourse[] = [];
        for (const r of results) if (r.status === "fulfilled") list.push(r.value);
        setApprovedCourses(list);
      })
      .finally(() => { if (!cancelled) setCoursesLoading(false); });

    return () => { cancelled = true; };
  }, [approvedEnrollments, sessionUser]);

  // Categorise approved courses by completion %.
  const { inProgress, notStarted, done, resumeCandidate, totalCompletedLessons } = useMemo(() => {
    const inProgress: ApprovedCourse[] = [];
    const notStarted: ApprovedCourse[] = [];
    const done: ApprovedCourse[] = [];
    let totalCompletedLessons = 0;

    for (const c of approvedCourses) {
      const pct = c.progress?.completionPercent ?? 0;
      totalCompletedLessons += c.progress?.completedCount ?? 0;
      if (pct >= 100) done.push(c);
      else if (pct > 0) inProgress.push(c);
      else notStarted.push(c);
    }

    // Pick the resume candidate: most-recently-accessed in-progress course
    // (falls back to most-recently-approved not-started course).
    const sortByLastAccessed = (a: ApprovedCourse, b: ApprovedCourse) => {
      const av = a.progress?.lastAccessedAt ?? "";
      const bv = b.progress?.lastAccessedAt ?? "";
      return bv.localeCompare(av);
    };
    inProgress.sort(sortByLastAccessed);
    const resumeCandidate = inProgress[0] ?? notStarted[0] ?? null;

    return { inProgress, notStarted, done, resumeCandidate, totalCompletedLessons };
  }, [approvedCourses]);

  const firstName = sessionUser?.firstName ?? "there";
  const resumeHref = resumeCandidate
    ? resumeCandidate.progress?.lastAccessedSubjectId
      ? `/my-courses/${resumeCandidate.courseId}/${resumeCandidate.progress.lastAccessedSubjectId}`
      : `/my-courses/${resumeCandidate.courseId}`
    : null;

  const loading = enrollmentsLoading || coursesLoading;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}.</h1>
          <div className="greeting">
            {totalCompletedLessons > 0 ? (
              <>
                You&apos;ve completed{" "}
                <b style={{ color: "var(--color-primary)" }}>
                  {totalCompletedLessons} {totalCompletedLessons === 1 ? "lesson" : "lessons"}
                </b>{" "}
                so far. Keep it up.
              </>
            ) : (
              <>Pick up where you left off, or explore new courses to get started.</>
            )}
            {pendingEnrollmentsCount > 0 && (
              <span
                style={{ marginLeft: 12, color: "var(--color-warning)", fontWeight: 500, cursor: "pointer" }}
                onClick={() => router.push("/my-courses")}
              >
                · {pendingEnrollmentsCount} enrollment{pendingEnrollmentsCount > 1 ? "s" : ""} pending approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTINUE LEARNING — only shown when there is an active in-progress course */}
      <div className="continue">
        <div>
          <div className="label">Continue learning</div>
          {loading && approvedCourses.length === 0 ? (
            <>
              <h2>Loading…</h2>
              <p className="sub">Fetching your courses.</p>
            </>
          ) : resumeCandidate ? (
            <>
              <h2>{resumeCandidate.courseTitle}</h2>
              <p className="sub">
                {resumeCandidate.progress
                  ? `${resumeCandidate.progress.completedCount} of ${resumeCandidate.progress.totalSubjects} subjects completed`
                  : "Ready to start"}
              </p>
              <div className="progress-row">
                <div className="bar">
                  <i style={{ width: (resumeCandidate.progress?.completionPercent ?? 0) + "%" }} />
                </div>
                <span className="pct">{resumeCandidate.progress?.completionPercent ?? 0}%</span>
              </div>
              <Button
                icon="play"
                disabled={!resumeHref}
                onClick={() => resumeHref && router.push(resumeHref)}
              >
                {resumeCandidate.progress?.lastAccessedSubjectId ? "Resume Lesson" : "Start Course"}
              </Button>
            </>
          ) : (
            <>
              <h2>No active courses</h2>
              <p className="sub">
                {done.length > 0
                  ? "You've completed all your enrolled courses! Browse to find more."
                  : "Browse the catalog and request enrollment to get started."}
              </p>
              <Button icon="search" onClick={() => router.push("/browse-courses")}>
                Browse Courses
              </Button>
            </>
          )}
        </div>
        <div
          className="cover"
          style={{
            background: coverGradient("gen"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(188,233,85,0.4)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <Icon name={resumeCandidate ? "play-circle" : "compass"} size={120} strokeWidth={1.25} />
        </div>
      </div>

      {/* IN PROGRESS */}
      <div className="section-h">
        <h3>In progress</h3>
        <ArrowLink href="/my-courses">View all</ArrowLink>
      </div>
      {loading && inProgress.length === 0 ? (
        <EmptyRow label="Loading…" icon="loader" />
      ) : inProgress.length === 0 ? (
        <EmptyRow label="No courses in progress yet." icon="play-circle" />
      ) : (
        <div className="my-grid">
          {inProgress.map((c) => (
            <CourseCard
              key={c.courseId}
              title={c.courseTitle}
              coverImageUrl={c.coverImageUrl}
              progress={c.progress?.completionPercent ?? 0}
              completedCount={c.progress?.completedCount ?? 0}
              totalSubjects={c.progress?.totalSubjects ?? 0}
              onClick={() => router.push(`/my-courses/${c.courseId}`)}
            />
          ))}
        </div>
      )}

      {/* ENROLLED · NOT STARTED */}
      <div className="section-h">
        <h3>Enrolled · not started</h3>
        <Button
          variant="ghost"
          size="sm"
          iconAfter="arrow-right"
          onClick={() => router.push("/browse-courses")}
        >
          Browse courses
        </Button>
      </div>
      {loading && notStarted.length === 0 ? (
        <EmptyRow label="Loading…" icon="loader" />
      ) : notStarted.length === 0 ? (
        <EmptyRow label="Nothing waiting to start." icon="book-open" />
      ) : (
        <div className="my-grid">
          {notStarted.map((c) => (
            <article
              key={c.courseId}
              className="course-card my-card"
              onClick={() => router.push(`/my-courses/${c.courseId}`)}
            >
              <CourseCover imageUrl={c.coverImageUrl} title={c.courseTitle} />
              <div className="body">
                <h3>{c.courseTitle}</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  iconAfter="arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/my-courses/${c.courseId}`);
                  }}
                >
                  Start course
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* DONE */}
      <div className="section-h">
        <h3>Done</h3>
        <ArrowLink href="/my-courses?filter=done">View all</ArrowLink>
      </div>
      {loading && done.length === 0 ? (
        <EmptyRow label="Loading…" icon="loader" />
      ) : done.length === 0 ? (
        <EmptyRow label="No courses completed yet — keep going!" icon="check-circle" />
      ) : (
        <div className="my-grid">
          {done.map((c) => (
            <article
              key={c.courseId}
              className="course-card my-card"
              onClick={() => router.push(`/my-courses/${c.courseId}`)}
            >
              <CourseCover imageUrl={c.coverImageUrl} title={c.courseTitle} tag="100% complete" />
              <div className="body">
                <h3>{c.courseTitle}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4ade80", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>
                  <Icon name="check-circle" size={14} /> Completed
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────── */

function EmptyRow({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{
      padding: "24px 16px",
      textAlign: "center",
      color: "var(--color-muted)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      background: "var(--color-light-gray)",
      borderRadius: 12,
      border: "1px dashed var(--color-stroke)",
    }}>
      <Icon name={icon} size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
      <div>{label}</div>
    </div>
  );
}

function CourseCard({
  title,
  coverImageUrl,
  progress,
  completedCount,
  totalSubjects,
  onClick,
}: {
  title: string;
  coverImageUrl?: string | null;
  progress: number;
  completedCount: number;
  totalSubjects: number;
  onClick: () => void;
}) {
  return (
    <article className="course-card my-card" onClick={onClick}>
      <CourseCover imageUrl={coverImageUrl} title={title} />
      <div className="body">
        <h3>{title}</h3>
        <div style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
          {completedCount} of {totalSubjects} subjects
        </div>
      </div>
      <div className="progress-cap">
        <div className="bar">
          <i style={{ width: progress + "%" }} />
        </div>
        <span className="pct">{progress}%</span>
      </div>
    </article>
  );
}
