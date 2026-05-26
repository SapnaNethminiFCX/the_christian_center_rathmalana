"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CourseCover } from "@/components/ui/CourseCover";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { TccrWordmark } from "@/components/ui/TccrWordmark";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { useCourse } from "@/application/hooks/useCourses";
import { listBatchesForCourse, type Batch } from "@/lib/mock/batches";

function formatBatchDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function batchBadge(state: Batch["state"]) {
  if (state === "open") return <Badge tone="success">Open</Badge>;
  if (state === "closed") return <Badge tone="archive">Closed</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}

export default function PublicCourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const { course, loading, error } = useCourse(params.courseId, false);

  useEffect(() => {
    if (error?.status === 404) {
      router.replace("/courses");
    }
  }, [error, router]);

  if (loading) {
    return (
      <div className="public">
        <FloatingNav initialActive="courses" onSignUp={() => router.push("/register")} />
        <section className="section section--dark" style={{ paddingTop: 120, paddingBottom: 64 }}>
          <div className="container-x" style={{ textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
            <Icon name="loader" size={28} />
            <p style={{ marginTop: 16, fontFamily: "var(--font-body)" }}>Loading course…</p>
          </div>
        </section>
      </div>
    );
  }

  if (!course) {
    return null; // 404 redirect handled in useEffect
  }

  const totalSubjects =
    course.semesters?.reduce((sum, s) => sum + (s.subjectCount ?? s.subjects?.length ?? 0), 0) ?? 0;

  // V2 Batches — from the mock store. Backend endpoint pending.
  const batches = listBatchesForCourse(course.id);
  const openBatches = batches.filter((b) => b.state === "open");

  return (
    <div className="public">
      <FloatingNav initialActive="courses" onSignUp={() => router.push("/register")} />

      <section className="section section--dark" style={{ paddingTop: 120, paddingBottom: 64 }}>
        <div
          className="container-x"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <Eyebrow dark>Course</Eyebrow>
            <h1
              style={{
                color: "#fff",
                fontSize: 48,
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: "18px 0 12px",
              }}
            >
              {course.title}
            </h1>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
              <Link href="/login" className="btn btn--primary btn--lg">
                Sign in to enroll <Icon name="arrow-right" size={18} style={{ marginLeft: 4 }} />
              </Link>
              <Link href="/courses" className="btn btn--secondary-light btn--lg">
                Back to catalog
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 28,
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="layers" size={14} /> {course.semesterCount} {course.semesterCount === 1 ? "semester" : "semesters"}
              </span>
              {totalSubjects > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="play-circle" size={14} /> {totalSubjects} {totalSubjects === 1 ? "subject" : "subjects"}
                </span>
              )}
              {course.state === "published" && course.publishedAt && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="calendar" size={14} /> Published {new Date(course.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              aspectRatio: "4 / 5",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
            }}
          >
            <CourseCover imageUrl={course.coverImageUrl} title={course.title} alt={course.title} />
          </div>
        </div>
      </section>

      {/* V2 Batches block — open intakes a member can apply to */}
      {batches.length > 0 && (
        <section className="section section--light">
          <div className="container-x">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
              <div>
                <Eyebrow>Intakes</Eyebrow>
                <h2 className="section-title" style={{ fontSize: 32, marginTop: 8 }}>
                  Pick an <span className="accent">intake</span> that fits your schedule.
                </h2>
                <p className="section-sub" style={{ marginTop: 12 }}>
                  Each batch runs as a cohort. Past intakes auto-close, so you only see batches
                  open for applications below. Apply once you sign in.
                </p>
              </div>
              {openBatches.length > 0 && (
                <Badge tone="success">
                  {openBatches.length} open {openBatches.length === 1 ? "intake" : "intakes"}
                </Badge>
              )}
            </div>

            <div className="batches">
              {batches.map((b) => (
                <div key={b.id} className={`batch-row${b.state === "closed" ? " closed" : ""}`}>
                  <div className="ico">
                    <Icon name={b.state === "closed" ? "x-circle" : "calendar-clock"} size={18} />
                  </div>
                  <div className="b-body">
                    <div className="name">{b.name}</div>
                    <div className="window">
                      <span>
                        <Icon name="calendar" size={12} /> {formatBatchDate(b.intakeStart)} →{" "}
                        {formatBatchDate(b.intakeEnd)}
                      </span>
                      <span className="sep">·</span>
                      <span>
                        <Icon name="users" size={12} /> {b.enrolled} / {b.capacity || "—"} enrolled
                      </span>
                    </div>
                  </div>
                  {batchBadge(b.state)}
                  {b.state === "open" && (
                    <Button size="sm" iconAfter="arrow-right" onClick={() => router.push("/login")}>
                      Apply
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section--white">
        <div className="container-x">
          <Eyebrow>Syllabus</Eyebrow>
          <h2 className="section-title">
            What you&apos;ll <span className="accent">learn</span>.
          </h2>
          {course.semesters && course.semesters.length > 0 ? (
            <div style={{ marginTop: 32, display: "grid", gap: 16 }}>
              {course.semesters.map((sem) => (
                <div
                  key={sem.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #E5E5E5",
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: "0 1px 3px 0 rgba(21,42,36,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-heading)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--color-primary)",
                      }}
                    >
                      {sem.title}
                    </h3>
                    <Badge tone="archive">
                      {sem.subjects?.length ?? sem.subjectCount ?? 0} subjects
                    </Badge>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {sem.subjects?.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "#FAFAFA",
                          fontFamily: "var(--font-body)",
                          fontSize: 14,
                          color: "#41574A",
                        }}
                      >
                        <Icon name="play-circle" size={14} />
                        {s.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 24, color: "var(--color-body-green)", fontFamily: "var(--font-body)" }}>
              The course curriculum is being prepared. Check back soon.
            </p>
          )}
        </div>
      </section>

      <footer className="footer footer--minimal">
        <div className="footer-bottom footer-bottom--solo">
          <TccrWordmark variant="reversed" />
          <span>© 2026 The Christian Center Rathmalana. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
