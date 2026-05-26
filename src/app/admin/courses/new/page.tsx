"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { uploadCourseCover } from "@/infrastructure/api/uploadCourseCover";
import type { CourseSummary } from "@/application/hooks/useCourses";
import { useCourse } from "@/application/hooks/useCourses";
import { BatchesSection } from "@/components/course/BatchesSection";
import { CourseStructureEditor } from "@/components/course/CourseStructureEditor";

/**
 * Create-new-course flow.
 *
 * Step 1 — enter title + description → POST /courses → course saved as Draft.
 * Step 2 — same Batches, Course Structure, and Semester Schedule panels as the
 *           edit page appear and save to real API (no mock data).
 */

export default function NewCoursePage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname?.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descError, setDescError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const { course } = useCourse(createdCourseId ?? undefined);

  // Cover image
  const coverImageRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (course?.coverImageUrl) setCoverImageUrl(course.coverImageUrl);
  }, [course?.coverImageUrl]);

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdCourseId) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Use JPG, PNG or WebP." }));
      return;
    }
    setUploadingCover(true);
    const previewUrl = URL.createObjectURL(file);
    setCoverImageUrl(previewUrl);
    try {
      const permanentUrl = await uploadCourseCover(createdCourseId, file);
      setCoverImageUrl(permanentUrl);
      dispatch(pushToast({ tone: "success", title: "Cover image updated" }));
    } catch (err) {
      setCoverImageUrl(course?.coverImageUrl ?? null);
      dispatch(pushToast({
        tone: "warning",
        title: "Couldn't update cover image",
        message: err instanceof Error ? err.message : undefined,
      }));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingCover(false);
      if (coverImageRef.current) coverImageRef.current.value = "";
    }
  };

  // ── Course creation ────────────────────────────────────────────────
  const handleCreate = async () => {
    setTitleError("");
    setDescError("");
    let valid = true;
    if (!title.trim()) {
      setTitleError("Course title is required.");
      valid = false;
    }
    if (!desc.trim()) {
      setDescError("Description is required.");
      valid = false;
    }
    if (!valid) return;
    setCreating(true);
    try {
      const created = await apiRequest<CourseSummary>("/courses", {
        method: "POST",
        body: { title: title.trim(), description: desc.trim() },
      });
      setCreatedCourseId(created.id);
      dispatch(pushToast({
        tone: "success",
        title: "Course created as draft",
        message: "Now configure batches, semesters, and lessons below.",
      }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "COURSE_TITLE_EXISTS" || err.status === 409) {
          setTitleError("A course with this title already exists.");
        } else if (err.status === 400 && err.details) {
          if (err.details.title) setTitleError(Array.isArray(err.details.title) ? err.details.title[0] : String(err.details.title));
          if (err.details.description) setDescError(Array.isArray(err.details.description) ? err.details.description[0] : String(err.details.description));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Failed to create course", message: err.message }));
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDraft = () => {
    if (createdCourseId) {
      router.push(`${base}/courses/${createdCourseId}`);
    } else {
      dispatch(pushToast({ tone: "warning", title: "Create the course first", message: "Use the 'Create course' button above." }));
    }
  };

  const handlePublish = async () => {
    if (!createdCourseId) {
      dispatch(pushToast({ tone: "warning", title: "Create the course first" }));
      return;
    }
    setPublishing(true);
    try {
      await apiRequest(`/courses/${createdCourseId}/publish`, { method: "POST" });
      dispatch(pushToast({ tone: "success", title: "Course published" }));
      router.push(`${base}/courses`);
    } catch (err) {
      const msg = err instanceof ApiRequestError
        ? (err.code === "EMPTY_SEMESTER" || err.code === "NO_SEMESTERS"
            ? "Add at least one semester with subjects before publishing."
            : err.message)
        : "Publish failed.";
      dispatch(pushToast({ tone: "warning", title: "Cannot publish", message: msg }));
    } finally {
      setPublishing(false);
    }
  };

  // Placeholder shown before the course is created
  const LockedPlaceholder = ({ title: sectionTitle }: { title: string }) => (
    <section className="settings-card" style={{ opacity: 0.5, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="lock" size={16} style={{ color: "var(--color-muted)" }} />
        <h2 style={{ margin: 0 }}>{sectionTitle}</h2>
      </div>
      <p className="settings-sub">Create the course above first to unlock this section.</p>
    </section>
  );

  return (
    <div className="page">
      {/* ── Page header — UNCHANGED ───────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Create a course</h1>
          <div className="greeting">
            Title → batches → semesters → subjects. Semester dates auto-clamp to the batch window so
            students never see content outside an intake.
          </div>
        </div>
        <Button variant="secondary" icon="arrow-left" onClick={() => router.push(`${base}/courses`)}>
          Back to courses
        </Button>
      </div>

      {/* ── Course title + description — UNCHANGED ──────────────────── */}
      <section className="settings-card">
        <h2>Course title</h2>
        <p className="settings-sub">Must be unique. Changes take effect immediately.</p>
        <Input
          label="Title"
          placeholder="e.g. Foundations of Faith"
          value={title}
          error={titleError}
          disabled={!!createdCourseId}
          onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(""); }}
          autoFocus
        />
        <div className="field" style={{ marginTop: 8 }}>
          <label className="label" htmlFor="course-desc">Description</label>
          <textarea
            id="course-desc"
            className={`input${descError ? " input--error" : ""}`}
            style={{ height: 100, paddingTop: 10, resize: "vertical" }}
            placeholder="One paragraph that appears in the catalog."
            value={desc}
            disabled={!!createdCourseId}
            onChange={(e) => { setDesc(e.target.value); if (descError) setDescError(""); }}
          />
          {descError && <span className="hint" style={{ color: "#DC2626" }}>{descError}</span>}
        </div>
        <div className="form-actions" style={{ borderTop: "none" }}>
          <Button
            icon="save"
            disabled={!title.trim() || !desc.trim() || creating || !!createdCourseId}
            onClick={handleCreate}
          >
            {creating ? "Creating…" : createdCourseId ? "Course created ✓" : "Create course"}
          </Button>
        </div>
        <p className="hint" style={{ marginTop: 8, color: "var(--color-body-green)" }}>
          Saves as a draft. Add batches, semesters and lessons below — or come back later from
          Courses → Edit.
        </p>
      </section>

      {/* ── Cover image — unlocks after course is created ─────────────── */}
      {createdCourseId ? (
        <section className="settings-card">
          <h2>Cover image</h2>
          <p className="settings-sub">Shown on the course card in the catalogue. JPG, PNG or WebP.</p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              width: 160, height: 100, borderRadius: 10, overflow: "hidden", flexShrink: 0,
              background: "var(--color-light-gray)", border: "1px solid var(--color-stroke)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {coverImageUrl
                ? <img src={coverImageUrl} alt="Course cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Icon name="image" size={28} style={{ opacity: 0.3 }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                ref={coverImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleCoverImageChange}
              />
              <Button
                size="sm"
                variant="secondary"
                icon="upload"
                disabled={uploadingCover}
                onClick={() => coverImageRef.current?.click()}
              >
                {uploadingCover ? "Uploading…" : coverImageUrl ? "Change image" : "Upload image"}
              </Button>
              {coverImageUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="x"
                  disabled={uploadingCover}
                  onClick={async () => {
                    try {
                      await apiRequest(`/courses/${createdCourseId}`, { method: "PATCH", body: { coverImageUrl: null } });
                      setCoverImageUrl(null);
                      dispatch(pushToast({ tone: "success", title: "Cover image removed" }));
                    } catch {
                      dispatch(pushToast({ tone: "warning", title: "Couldn't remove cover image" }));
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <LockedPlaceholder title="Cover image" />
      )}

      {/* ── Batches — same component as edit page, real API ──────────── */}
      {createdCourseId
        ? <BatchesSection courseId={createdCourseId} />
        : <LockedPlaceholder title="Batches & intakes" />}

      {/* ── Course structure — same component as edit page, real API ─── */}
      {createdCourseId
        ? <CourseStructureEditor courseId={createdCourseId} initialSemesters={course?.semesters ?? []} />
        : <LockedPlaceholder title="Semesters → Subjects → Lessons" />}


      {/* ── Footer action bar — UNCHANGED layout, real API ──────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 22px", background: "#fff", border: "1px solid var(--color-stroke)",
        borderRadius: 14, gap: 10, flexWrap: "wrap",
      }}>
        <Button variant="ghost" onClick={() => router.push(`${base}/courses`)}>
          Cancel
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" icon="save" onClick={handleSaveDraft}>
            Save draft
          </Button>
          <Button icon="upload-cloud" disabled={publishing} onClick={handlePublish}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
