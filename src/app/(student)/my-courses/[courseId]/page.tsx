"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useCourse } from "@/application/hooks/useCourses";
import { useCourseProgress } from "@/application/hooks/useProgress";
import { useEnrollments } from "@/application/hooks/useEnrollments";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { cn } from "@/lib/cn";
import { YouTubePlayer } from "@/components/course/YouTubePlayer";
import { useBatches } from "@/application/hooks/useBatches";

/* ── Types ───────────────────────────────────────────────────────────── */

interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  youtubeVideoId?: string | null;
  attachmentIds?: string[];
  order?: number;
}

/** A lesson augmented with the semester/subject context (for sidebar + nav). */
interface FlatLesson {
  lesson: Lesson;
  subjectId: string;
  subjectTitle: string;
  semesterId: string;
  semesterTitle: string;
  semesterIndex: number;
  subjectIndex: number;
  lessonIndex: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getYouTubeEmbedUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) return null;
  if (input.includes("youtube.com/embed/")) return input.split("?")[0];
  const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`;
  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return `https://www.youtube.com/embed/${input.trim()}?rel=0&modestbranding=1`;
  if (input.startsWith("http")) return input;
  return null;
}

function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const embed = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function StudentCourseViewerPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const { course, loading } = useCourse(sessionUser ? params.courseId : undefined);
  const { batches: realBatches } = useBatches(sessionUser ? params.courseId : undefined);

  // Get batchId from the student's approved enrollment so progress is linked
  // to the correct intake — required by V2 POST /progress/subjects/:id/complete.
  const { getEnrollmentForCourse } = useEnrollments();
  const enrollment = params.courseId ? getEnrollmentForCourse(params.courseId) : undefined;
  const enrollmentBatchId = enrollment?.batchId ?? realBatches[0]?.id ?? undefined;

  // Real subject-level progress from the API.
  const {
    progress,
    completedSet: completedSubjectsApi,
    markComplete: markSubjectCompleteApi,
    trackAccess,
  } = useCourseProgress(sessionUser ? params.courseId : undefined, enrollmentBatchId);

  // Lesson-level state (UI tracks per-lesson; backend only tracks per-subject).
  const [lessonsBySubject, setLessonsBySubject] = useState<Record<string, Lesson[]>>({});
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Track which subjects we've already fired the backend "complete" call for
  // in this session (idempotent on backend but avoids duplicate toasts).
  const autoCompletedSubjects = useRef<Set<string>>(new Set());

  /* ── Effective completed-subjects set ─────────────────────────────
   * Backend always returns `completedCount` (e.g. 3) but doesn't always
   * return `completedSubjectIds`. When IDs are missing, the tree can't
   * unlock or tick anything correctly. As a fallback, assume sequential
   * completion: treat the first `completedCount` subjects in semester/
   * subject order as complete. When IDs ARE returned, we use them
   * verbatim. Drives: tree locking, subject ticks, lesson backfill,
   * initial active-lesson selection. */
  const effectiveCompletedSubjects = useMemo(() => {
    const set = new Set(completedSubjectsApi);
    const target = progress?.completedCount ?? 0;
    if (target > set.size && course?.semesters) {
      const ordered: string[] = [];
      for (const sem of course.semesters.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        for (const sub of (sem.subjects ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
          ordered.push(sub.id);
        }
      }
      for (const id of ordered) {
        if (set.size >= target) break;
        set.add(id);
      }
    }
    return set;
  }, [completedSubjectsApi, progress?.completedCount, course?.semesters]);

  /* ── Backfill lesson completion from completed subjects ──────────── */
  // Mirror lessons inside every effectively-complete subject into the local
  // completedLessons Set so the tree shows ticks correctly after refresh /
  // logout-login. localStorage is intentionally NOT used — the source of
  // truth is the backend's count + ID list.
  useEffect(() => {
    if (effectiveCompletedSubjects.size === 0) return;
    setCompletedLessons((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const subjectId of effectiveCompletedSubjects) {
        for (const l of lessonsBySubject[subjectId] ?? []) {
          if (!next.has(l.id)) {
            next.add(l.id);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [effectiveCompletedSubjects, lessonsBySubject]);

  /* ── Fetch lessons for every subject in parallel (one call per subject) ── */

  useEffect(() => {
    const subjects = course?.semesters?.flatMap((s) => s.subjects ?? []) ?? [];
    if (subjects.length === 0) { setLessonsBySubject({}); return; }
    let cancelled = false;
    setLessonsLoading(true);
    Promise.allSettled(
      subjects.map(async (sub) => {
        const list = await apiRequest<Lesson[]>(`/subjects/${sub.id}/lessons`);
        return { subjectId: sub.id, lessons: list ?? [] };
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, Lesson[]> = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          map[r.value.subjectId] = [...r.value.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
      setLessonsBySubject(map);
    }).finally(() => { if (!cancelled) setLessonsLoading(false); });
    return () => { cancelled = true; };
  }, [course?.semesters]);

  /* ── Build a FLAT ordered list of every lesson (for prev/next nav) ── */

  const flatLessons: FlatLesson[] = useMemo(() => {
    if (!course?.semesters) return [];
    const out: FlatLesson[] = [];
    course.semesters
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((sem, semIndex) => {
        (sem.subjects ?? [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .forEach((sub, subIndex) => {
            (lessonsBySubject[sub.id] ?? []).forEach((lesson, lessonIndex) => {
              out.push({
                lesson,
                subjectId: sub.id,
                subjectTitle: sub.title,
                semesterId: sem.id,
                semesterTitle: sem.title ?? sem.name ?? "",
                semesterIndex: semIndex,
                subjectIndex: subIndex,
                lessonIndex,
              });
            });
          });
      });
    return out;
  }, [course?.semesters, lessonsBySubject]);

  /* ── Active lesson + derived context ─────────────────────────────── */

  const activeIndex = activeLessonId
    ? flatLessons.findIndex((f) => f.lesson.id === activeLessonId)
    : -1;
  const active = activeIndex >= 0 ? flatLessons[activeIndex] : null;
  const prevLesson = activeIndex > 0 ? flatLessons[activeIndex - 1] : null;
  const nextLesson = activeIndex >= 0 && activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : null;

  // Auto-select the resume lesson on load. Priority:
  //   1. backend's lastAccessedSubjectId
  //   2. first lesson of the first NOT-yet-complete subject (so a student
  //      who finished 3 subjects lands on subject 4's lesson, not subject 1)
  //   3. flatLessons[0]
  useEffect(() => {
    if (activeLessonId || flatLessons.length === 0) return;
    const lastSubjectId = progress?.lastAccessedSubjectId;
    if (lastSubjectId) {
      const cand = flatLessons.find((f) => f.subjectId === lastSubjectId);
      if (cand) { setActiveLessonId(cand.lesson.id); return; }
    }
    const firstIncomplete = flatLessons.find((f) => !effectiveCompletedSubjects.has(f.subjectId));
    setActiveLessonId((firstIncomplete ?? flatLessons[0]).lesson.id);
  }, [flatLessons, activeLessonId, progress?.lastAccessedSubjectId, effectiveCompletedSubjects]);

  // Track access whenever active subject changes (background, fire & forget).
  useEffect(() => {
    if (!active) return;
    trackAccess(active.subjectId, active.semesterId);
  }, [active?.subjectId, active?.semesterId, trackAccess, active]);

  /* ── Subject completion derivation (lesson-based, backend-synced) ── */

  /**
   * When every lesson in a subject is locally complete, mark the subject
   * complete on the backend. Idempotent — auto-completedSubjects guards against
   * duplicate API hits per session.
   */
  const syncSubjectIfAllLessonsDone = useCallback(
    (subjectId: string, semesterId: string) => {
      const subjectLessons = lessonsBySubject[subjectId] ?? [];
      if (subjectLessons.length === 0) return;
      const allDone = subjectLessons.every((l) => completedLessons.has(l.id));
      if (!allDone) return;
      // Skip if we already know this subject is complete (backend IDs OR
      // fallback inference from completedCount).
      if (effectiveCompletedSubjects.has(subjectId)) return;
      if (autoCompletedSubjects.current.has(subjectId)) return;
      autoCompletedSubjects.current.add(subjectId);
      markSubjectCompleteApi(subjectId, semesterId);
    },
    [lessonsBySubject, completedLessons, effectiveCompletedSubjects, markSubjectCompleteApi],
  );

  // Mark current lesson complete (used by both manual click and "Next").
  const markCurrentLessonComplete = useCallback(() => {
    if (!active) return false;
    if (completedLessons.has(active.lesson.id)) return false;
    setCompletedLessons((prev) => new Set(prev).add(active.lesson.id));
    return true;
  }, [active, completedLessons]);

  // Watch completedLessons + active subject — sync to backend if last lesson finished.
  useEffect(() => {
    if (!active) return;
    syncSubjectIfAllLessonsDone(active.subjectId, active.semesterId);
  }, [completedLessons, active, syncSubjectIfAllLessonsDone]);

  // Manual Mark Complete button.
  const handleMarkComplete = () => {
    if (markCurrentLessonComplete()) {
      dispatch(pushToast({ tone: "success", title: "Lesson marked complete" }));
    }
  };

  // YouTube 90% → auto-mark current lesson complete.
  const handleVideoTime = (currentTime: number, duration: number) => {
    if (!active || !duration) return;
    if (completedLessons.has(active.lesson.id)) return;
    if (currentTime / duration < 0.9) return;
    if (markCurrentLessonComplete()) {
      dispatch(pushToast({ tone: "success", title: "Lesson marked complete automatically" }));
    }
  };

  // Next button: requires current lesson to be complete first.
  // If not complete yet, surface a toast instead of silently doing nothing.
  const handleNext = () => {
    if (!nextLesson) return;
    if (!active || !completedLessons.has(active.lesson.id)) {
      dispatch(pushToast({
        tone: "warning",
        title: "Finish this lesson first",
        message: "Watch the video to the end or click Mark Complete before moving on.",
      }));
      return;
    }
    setActiveLessonId(nextLesson.lesson.id);
  };

  // Auto-advance when the video plays through to the end. The 90% threshold in
  // handleVideoTime has already (idempotently) marked the lesson complete.
  const handleVideoEnded = () => {
    if (!active) return;
    markCurrentLessonComplete();
    if (nextLesson) setActiveLessonId(nextLesson.lesson.id);
  };

  /* ── Progress percentage ─────────────────────────────────────────── */
  // Backend is the source of truth: `/me/progress/courses/:id` returns
  // completionPercent + completedCount + totalSubjects (same data the
  // dashboard's "Continue Learning" card uses). We display those directly so
  // both screens stay in sync. If the backend response hasn't arrived yet,
  // we fall back to a session-level lesson tally so the bar reflects clicks
  // the student has made in this session.
  const totalLessons = flatLessons.length;
  const sessionCompletedLessons = flatLessons.filter((f) => completedLessons.has(f.lesson.id)).length;
  const backendPct = progress?.completionPercent;
  const pct =
    backendPct != null
      ? Math.round(backendPct)
      : totalLessons === 0 ? 0 : Math.round((sessionCompletedLessons / totalLessons) * 100);
  const completedCountDisplay = progress?.completedCount ?? sessionCompletedLessons;
  const totalCountDisplay = progress?.totalSubjects ?? totalLessons;
  const countUnit = progress != null ? "subjects" : "lessons";
  // Keep `completedLessonsCount` as an alias the rest of the file already
  // references in the lesson tree (tick marks etc.) — it's still the
  // session-level Set count.
  const completedLessonsCount = sessionCompletedLessons;

  /* ── Attachment download ─────────────────────────────────────────── */

  const downloadAttachment = async (attachmentId: string, filename?: string) => {
    setDownloadingId(attachmentId);
    try {
      const { downloadUrl } = await apiRequest<{ downloadUrl: string; expiresAt: string }>(
        `/attachments/${attachmentId}/download-url`,
      );
      window.open(downloadUrl, "_blank");
      dispatch(pushToast({ tone: "success", title: "Download started", message: filename }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        dispatch(pushToast({ tone: "warning", title: "Enrollment required" }));
      } else {
        dispatch(pushToast({ tone: "warning", title: "Download failed" }));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-body-green)" }}>
        <Icon name="loader" size={22} style={{ opacity: 0.4 }} />
        <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Icon name="alert-circle" size={28} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-muted)" }}>Course not found.</p>
      </div>
    );
  }

  const activeLesson = active?.lesson ?? null;
  const activeTitle = activeLesson?.title || active?.subjectTitle || "";
  const youtubeId = extractYouTubeId(activeLesson?.youtubeVideoId);
  const embedUrl = youtubeId ? null : getYouTubeEmbedUrl(activeLesson?.youtubeVideoId);
  const activeLessonDone = activeLesson ? completedLessons.has(activeLesson.id) : false;

  /* ── V2 Semester state logic ─────────────────────────────────────── */

  const sortedSemesters = (course.semesters ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // "Current" = first semester that still has an uncompleted subject.
  // "Past" = everything before it (all subjects completed).
  // "Future" = everything after it.
  let currentSemIdx = sortedSemesters.findIndex((sem) => {
    const subjects = sem.subjects ?? [];
    return subjects.length === 0 || subjects.some((sub) => !completedSubjectsApi.has(sub.id));
  });
  if (currentSemIdx === -1) currentSemIdx = sortedSemesters.length - 1; // all done → last is "current"

  // Batch badge — real API data only; no fallback mock.
  const activeBatch = realBatches.find((b) => b.state === "open") ?? realBatches[0] ?? null;

  function formatBatchDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  /**
   * V2 semester states — 4 possibilities:
   *
   *   past     — all subjects completed. Student finished, access preserved.
   *   current  — active semester, content accessible, lessons visible.
   *   disabled — date window has expired but student did NOT complete it.
   *              Content is locked even though the student had access.
   *              Shown with red border + "Closed" badge on each subject.
   *   future   — not yet opened. Hidden behind a lock until the intake date.
   *
   * For demonstration we put the semester immediately AFTER "current" into
   * the disabled state (when 3+ semesters exist). This lets the UI show all
   * four states simultaneously on the sidebar.
   */
  function getSemesterState(idx: number): "past" | "current" | "disabled" | "future" {
    if (idx < currentSemIdx) return "past";
    if (idx === currentSemIdx) return "current";
    // One "disabled" slot right after current (demo: idx = currentSemIdx + 1
    // when there are at least 2 more semesters, so future still exists).
    if (idx === currentSemIdx + 1 && sortedSemesters.length > currentSemIdx + 2) return "disabled";
    return "future";
  }

  // Real semester dates from API (openDate/endDate). No mock fallback.
  const semesterDates = sortedSemesters.map((sem) => ({
    start: sem.openDate ?? null,
    end:   sem.endDate  ?? null,
  }));

  return (
    <div className="viewer">
      <aside className="viewer-side">
        <div className="head">
          <h2>{course.title}</h2>

          {/* V2 intake badge — real data only */}
          {activeBatch ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(188,233,85,0.18)", borderRadius: 9999, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--color-primary)", marginBottom: 10, flexWrap: "wrap" }}>
              <Icon name="calendar-clock" size={13} />
              {activeBatch.name} · {formatBatchDate(activeBatch.intakeStart)} → {formatBatchDate(activeBatch.intakeEnd)}
            </div>
          ) : realBatches.length === 0 && (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)", marginBottom: 10 }}>
              No batches
            </div>
          )}

          <div className="progress-row">
            <div className="bar">
              <i style={{ width: pct + "%", transition: "width 400ms ease" }} />
            </div>
            <span className="pct">{pct}%</span>
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
            {completedCountDisplay} of {totalCountDisplay} {countUnit} completed
          </div>
        </div>

        {/* V2 Semester → Subject → Lesson tree with Past / Current / Future states */}
        {sortedSemesters.length === 0 ? (
          <div style={{ padding: "20px 16px", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13, textAlign: "center" }}>
            <Icon name="layers" size={22} style={{ opacity: 0.35, marginBottom: 8 }} />
            <p style={{ margin: 0 }}>No content yet.</p>
          </div>
        ) : (
          sortedSemesters.map((sem, semIdx) => {
            const state = getSemesterState(semIdx);
            const isPast     = state === "past";
            const isCurrent  = state === "current";
            const isDisabled = state === "disabled";
            const isFuture   = state === "future";
            const isLocked   = isPast || isFuture;
            const { start, end } = semesterDates[semIdx];
            const dateColor = isPast || isDisabled
              ? "var(--color-error-deep)"
              : isFuture
              ? "var(--color-muted)"
              : "var(--color-success-deep)";

            const stateLabel = isPast ? "Past" : isDisabled ? "Closed" : isFuture ? "Future" : "Current";

            return (
              <div
                className="semester"
                key={sem.id}
                style={{
                  opacity: isLocked ? 0.65 : 1,
                  // Disabled gets a subtle red left border to call it out visually.
                  borderLeft: isDisabled ? "3px solid var(--color-error)" : "none",
                  marginLeft: isDisabled ? 0 : undefined,
                }}
              >
                {/* Semester header */}
                <div
                  className="semester-head"
                  style={{
                    fontWeight: isCurrent ? 700 : 600,
                    color: isDisabled
                      ? "var(--color-error-deep)"
                      : isLocked
                      ? "var(--color-muted)"
                      : "var(--color-primary)",
                  }}
                >
                  <span>
                    {sem.title}
                    <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 6, color: isDisabled ? "var(--color-error-deep)" : "var(--color-muted)" }}>
                      · {stateLabel}
                    </span>
                  </span>
                  {isLocked || isDisabled
                    ? <Icon name="lock" size={13} style={{ color: isDisabled ? "var(--color-error-deep)" : "var(--color-muted)" }} />
                    : <Icon name="chevron-down" size={14} />}
                </div>

                {/* Date range row — only shown when real dates exist from API */}
                {(start || end) && (
                  <div style={{
                    padding: "0 24px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: dateColor,
                  }}>
                    {formatBatchDate(start ?? "")} → {formatBatchDate(end ?? "")}
                    {(isLocked || isDisabled) ? " · closed" : ""}
                  </div>
                )}

                {/* Disabled state — semester expired without completion */}
                {isDisabled && (
                  <div style={{ padding: "4px 24px 12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        background: "var(--color-error-bg)",
                        borderRadius: 10,
                        marginBottom: 8,
                        fontFamily: "var(--font-body)",
                        fontSize: 13,
                        color: "var(--color-error-deep)",
                      }}
                    >
                      <Icon name="alert-triangle" size={14} />
                      Semester closed — intake window ended before completion.
                    </div>
                    {/* Show subjects as disabled (greyed-out with Closed overlay) */}
                    {(sem.subjects ?? []).map((sub) => {
                      const subjectLessons = lessonsBySubject[sub.id] ?? [];
                      return (
                        <div key={sub.id}>
                          <div className="subject disabled" style={{ pointerEvents: "none", opacity: 0.5 }}>
                            <span className="dot">
                              <Icon name="x-circle" size={14} style={{ color: "var(--color-error-deep)" }} />
                            </span>
                            {sub.title}
                          </div>
                          {subjectLessons.slice(0, 2).map((l) => (
                            <div
                              key={l.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "5px 18px 5px 52px",
                                fontFamily: "var(--font-body)",
                                fontSize: 12,
                                color: "var(--color-muted)",
                                opacity: 0.6,
                              }}
                            >
                              <Icon name="lock" size={11} style={{ color: "var(--color-error-deep)", flexShrink: 0 }} />
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Locked state: Past or Future */}
                {isLocked ? (
                  <div style={{ padding: "6px 24px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)", marginBottom: 6 }}>
                      <Icon name="lock" size={13} />
                      {isPast ? "Closed: past content" : "Locked: future content"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)", paddingLeft: 8 }}>
                      <Icon name="lock" size={11} />
                      {isPast ? "Past lesson" : "Locked lesson"}
                    </div>
                  </div>
                ) : (
                  /* Open (current) semester: render subjects + lessons.
                     Subjects after the first incomplete one are locked — the
                     student must finish the current subject before moving on. */
                  (() => {
                    const orderedSubjects = (sem.subjects ?? [])
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    const firstIncompleteIdx = orderedSubjects.findIndex(
                      (sub) => !effectiveCompletedSubjects.has(sub.id),
                    );
                    return (
                  <>
                    {orderedSubjects.map((sub, subIdx) => {
                      const subjectLessons = lessonsBySubject[sub.id] ?? [];
                      const allDone =
                        effectiveCompletedSubjects.has(sub.id) ||
                        (subjectLessons.length > 0 && subjectLessons.every((l) => completedLessons.has(l.id)));
                      const hasActive = active?.subjectId === sub.id;
                      const isLockedSubject =
                        firstIncompleteIdx !== -1 && subIdx > firstIncompleteIdx;
                      return (
                        <div key={sub.id}>
                          <div
                            className={cn("subject", hasActive && "active", allDone && "completed", !allDone && !hasActive && "notstarted")}
                            style={{
                              cursor: isLockedSubject || !subjectLessons[0] ? "not-allowed" : "pointer",
                              opacity: isLockedSubject ? 0.55 : 1,
                            }}
                            onClick={() => {
                              if (isLockedSubject) {
                                dispatch(pushToast({
                                  tone: "warning",
                                  title: "Finish the current subject first",
                                  message: "Complete the lessons in order before unlocking the next subject.",
                                }));
                                return;
                              }
                              if (subjectLessons[0]) setActiveLessonId(subjectLessons[0].id);
                            }}
                          >
                            <span className="dot">
                              <Icon
                                name={isLockedSubject ? "lock" : allDone ? "check-circle" : "play-circle"}
                                size={14}
                                style={{ color: isLockedSubject ? "var(--color-muted)" : allDone ? "var(--color-success-deep)" : "var(--color-accent)" }}
                              />
                            </span>
                            {sub.title}
                          </div>
                          {subjectLessons.length > 0 && (
                            <div>
                              {subjectLessons.map((l) => {
                                const lessonDone = completedLessons.has(l.id);
                                const lessonActive = activeLessonId === l.id;
                                return (
                                  <div
                                    key={l.id}
                                    onClick={() => {
                                      if (isLockedSubject) {
                                        dispatch(pushToast({
                                          tone: "warning",
                                          title: "Finish the current subject first",
                                          message: "Complete the lessons in order before unlocking the next subject.",
                                        }));
                                        return;
                                      }
                                      setActiveLessonId(l.id);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "7px 18px 7px 52px",
                                      cursor: isLockedSubject ? "not-allowed" : "pointer",
                                      opacity: isLockedSubject ? 0.55 : 1,
                                      fontFamily: "var(--font-body)",
                                      fontSize: 13,
                                      color: lessonActive ? "var(--color-primary)" : "var(--color-body-green)",
                                      background: lessonActive ? "rgba(188,233,85,0.15)" : "transparent",
                                      fontWeight: lessonActive ? 700 : 400,
                                      borderRadius: lessonActive ? 6 : 0,
                                      margin: lessonActive ? "0 8px" : 0,
                                      width: lessonActive ? "calc(100% - 16px)" : "100%",
                                    }}
                                  >
                                    <Icon
                                      name={lessonDone ? "check-circle" : lessonActive ? "play-circle" : "circle"}
                                      size={13}
                                      style={{
                                        color: lessonDone ? "var(--color-success-deep)" : lessonActive ? "var(--color-accent)" : "var(--color-muted)",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {l.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(!sem.subjects || sem.subjects.length === 0) && (
                      <div style={{ padding: "6px 18px 8px 36px", fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                        No subjects
                      </div>
                    )}
                  </>
                    );
                  })()
                )}
              </div>
            );
          })
        )}
      </aside>

      <div className="viewer-main">
        <div className="crumbs">
          My Courses · {course.title}
          {active && <> · {active.semesterTitle} · {active.subjectTitle}</>}
        </div>
        <h1>{activeTitle || "Select a lesson"}</h1>

        {/* Player */}
        {youtubeId ? (
          <YouTubePlayer
            key={youtubeId}
            videoId={youtubeId}
            title={activeTitle}
            onProgress={handleVideoTime}
            onEnded={handleVideoEnded}
          />
        ) : embedUrl ? (
          <div className="player" style={{ padding: 0, background: "#000", position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
            <iframe
              src={embedUrl}
              title={activeTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        ) : (
          <div className="player" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 280, background: "#152A24", color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--font-body)", fontSize: 14, borderRadius: 14,
          }}>
            <div style={{ textAlign: "center" }}>
              <Icon name={lessonsLoading ? "loader" : "play-circle"} size={32} style={{ opacity: 0.4, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>
                {lessonsLoading
                  ? "Loading lesson…"
                  : activeLesson
                    ? "No video for this lesson."
                    : "No lessons in this course yet."}
              </p>
            </div>
          </div>
        )}

        {activeLesson?.description && (
          <p className="desc">{activeLesson.description}</p>
        )}

        {/* Attachments */}
        {activeLesson && (activeLesson.attachmentIds?.length ?? 0) > 0 && (
          <div className="attachments">
            <h3>Lesson materials</h3>
            {(activeLesson.attachmentIds ?? []).map((attId) => (
              <div className="attach-item" key={attId}>
                <div className="ico">
                  <Icon name="file-text" size={16} />
                </div>
                <div className="name" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  Attachment ({attId.slice(0, 8)}…)
                </div>
                <div className="size">PDF / DOC</div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => downloadAttachment(attId)}
                  disabled={downloadingId === attId}
                  title="Download"
                >
                  <Icon name={downloadingId === attId ? "loader" : "download"} size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="viewer-actions">
          <Button
            variant="secondary"
            icon="arrow-left"
            disabled={!prevLesson}
            onClick={() => prevLesson && setActiveLessonId(prevLesson.lesson.id)}
          >
            Previous lesson
          </Button>
          <Button
            icon={activeLessonDone ? "check-circle" : "check"}
            disabled={!activeLesson || (activeLessonDone && !nextLesson)}
            onClick={() => {
              if (activeLessonDone) {
                if (nextLesson) setActiveLessonId(nextLesson.lesson.id);
              } else {
                handleMarkComplete();
              }
            }}
          >
            {activeLessonDone ? "Completed" : "Mark Complete"}
          </Button>
          <Button
            variant="secondary"
            iconAfter="arrow-right"
            disabled={!nextLesson}
            onClick={handleNext}
          >
            Next lesson
          </Button>
        </div>

        {/* Back to dashboard */}
        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: "1px solid var(--color-stroke)",
          display: "flex", justifyContent: "center",
        }}>
          <Button
            variant="ghost"
            icon="layout-dashboard"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
