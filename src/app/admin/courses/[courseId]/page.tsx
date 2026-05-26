"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { useCourse } from "@/application/hooks/useCourses";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { uploadCourseCover } from "@/infrastructure/api/uploadCourseCover";
import type { CourseSummary } from "@/application/hooks/useCourses";
import { CourseStructureEditor } from "@/components/course/CourseStructureEditor";
import { BatchesSection } from "@/components/course/BatchesSection";
import { useSavedBadge, SavedBadge } from "@/components/ui/SavedBadge";

function stateBadge(state: string) {
  if (state === "published") return <Badge tone="success">Published</Badge>;
  if (state === "archived") return <Badge tone="archive">Archived</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}

export default function EditCoursePage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname?.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const dispatch = useAppDispatch();
  const params = useParams<{ courseId: string }>();

  const sessionUser = useAppSelector((s) => s.session.user);
  const { course, loading: courseLoading } = useCourse(sessionUser ? params.courseId : undefined);

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { saved: titleSaved, triggerSaved: triggerTitleSaved } = useSavedBadge();
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  // Local state for course lifecycle — updated immediately after API calls so
  // buttons reflect the new state without waiting for a page re-fetch.
  const [courseState, setCourseState] = useState<string | null>(null);
  const effectiveState = courseState ?? course?.state ?? "draft";

  // Course cover image
  const coverImageRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Pre-fill form when course loads.
  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDirty(false);
      setCourseState(course.state);
      setCoverImageUrl(course.coverImageUrl ?? null);
    }
  }, [course]);

  if (courseLoading) {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-body-green)" }}>
          <Icon name="loader" size={22} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || !title.trim()) return;
    setTitleError("");
    setSaving(true);
    try {
      const updated = await apiRequest<CourseSummary>(`/courses/${course.id}`, {
        method: "PATCH",
        body: { title: title.trim() },
      });
      setTitle(updated.title);
      setDirty(false);
      triggerTitleSaved();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) {
          setTitleError("A course with this title already exists.");
        } else if (err.status === 400 && err.details?.title) {
          setTitleError(Array.isArray(err.details.title) ? err.details.title[0] : String(err.details.title));
        } else {
          dispatch(pushToast({ tone: "warning", title: "Failed to save", message: err.message }));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // Lifecycle action handlers
  const handlePublish = async () => {
    setLifecycleBusy(true);
    try {
      await apiRequest(`/courses/${course.id}/publish`, { method: "POST" });
      setCourseState("published");
      dispatch(pushToast({ tone: "success", title: "Course published" }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const msg = err.status === 409 ? "Course can't be published from its current state."
          : err.status === 422 ? "Add at least one semester with subjects before publishing."
          : err.message;
        dispatch(pushToast({ tone: "warning", title: "Cannot publish", message: msg }));
      }
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleUnpublish = async () => {
    setLifecycleBusy(true);
    try {
      await apiRequest(`/courses/${course.id}/unpublish`, { method: "POST" });
      setCourseState("draft");
      dispatch(pushToast({ tone: "success", title: "Course unpublished" }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const msg = err.status === 409 ? "Only a PUBLISHED course can be unpublished." : err.message;
        dispatch(pushToast({ tone: "warning", title: "Cannot unpublish", message: msg }));
      }
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleArchive = async () => {
    setLifecycleBusy(true);
    try {
      await apiRequest(`/courses/${course.id}/archive`, { method: "POST" });
      setCourseState("archived");
      dispatch(pushToast({ tone: "success", title: "Course archived" }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const msg = err.status === 409 ? "Only a PUBLISHED course can be archived." : err.message;
        dispatch(pushToast({ tone: "warning", title: "Cannot archive", message: msg }));
      }
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleRestore = async () => {
    setLifecycleBusy(true);
    try {
      await apiRequest(`/courses/${course.id}/restore`, { method: "POST" });
      setCourseState("draft");
      dispatch(pushToast({ tone: "success", title: "Course restored", message: "Back to Draft — re-publish to make it visible." }));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const msg = err.status === 409 ? "Only an archived course can be restored." : err.message;
        dispatch(pushToast({ tone: "warning", title: "Cannot restore", message: msg }));
      }
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !course) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Use JPG, PNG or WebP." }));
      return;
    }
    setUploadingCover(true);
    // Instant preview while the real upload is in flight.
    const previewUrl = URL.createObjectURL(file);
    setCoverImageUrl(previewUrl);
    try {
      // Multipart upload to permanent storage — mirrors /me/avatar pattern.
      const permanentUrl = await uploadCourseCover(course.id, file);
      setCoverImageUrl(permanentUrl);
      dispatch(pushToast({ tone: "success", title: "Cover image updated" }));
    } catch (err) {
      // Roll preview back to whatever was actually persisted on the course.
      setCoverImageUrl(course.coverImageUrl ?? null);
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

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1>{course.title}</h1>
          {stateBadge(effectiveState)}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" icon="arrow-left" onClick={() => router.push(`${base}/courses`)}>
            Back
          </Button>
          {effectiveState === "draft" && (
            <Button icon="upload-cloud" onClick={handlePublish} disabled={lifecycleBusy}>
              {lifecycleBusy ? "Publishing…" : "Publish"}
            </Button>
          )}
          {effectiveState === "published" && (
            <>
              <Button variant="secondary" icon="eye-off" onClick={handleUnpublish} disabled={lifecycleBusy}>
                {lifecycleBusy ? "Unpublishing…" : "Unpublish"}
              </Button>
              <Button variant="secondary" icon="archive" onClick={handleArchive} disabled={lifecycleBusy}>
                {lifecycleBusy ? "Archiving…" : "Archive"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info banner + Restore button — only for archived courses */}
      {effectiveState === "archived" && (
        <div style={{
          padding: "12px 16px",
          background: "var(--color-light-gray)",
          borderRadius: 12,
          border: "1px solid var(--color-stroke)",
          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
          fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)",
        }}>
          <Icon name="archive" size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            This course is <b>archived</b>. Restore it to Draft to re-publish.
          </span>
          <Button size="sm" variant="secondary" icon="refresh-cw" disabled={lifecycleBusy} onClick={handleRestore}>
            {lifecycleBusy ? "Restoring…" : "Restore to Draft"}
          </Button>
        </div>
      )}

      {/* Title edit card */}
      <div className="settings-card">
        <h2>Course title</h2>
        <p className="settings-sub">The title must be unique. Changes take effect immediately.</p>
        <form onSubmit={handleSaveTitle}>
          <Input
            label="Title"
            value={title}
            error={titleError}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(e.target.value.trim() !== course.title);
              if (titleError) setTitleError("");
            }}
          />
          <div className="form-actions" style={{ borderTop: "none", marginTop: 8 }}>
            <Button
              variant="ghost"
              type="button"
              disabled={!dirty || saving}
              onClick={() => { setTitle(course.title); setDirty(false); setTitleError(""); }}
            >
              Cancel
            </Button>
            <Button
              icon="check"
              type="submit"
              disabled={!dirty || saving || !title.trim()}
            >
              {saving ? "Saving…" : "Save title"}
            </Button>
            <SavedBadge visible={titleSaved} />
          </div>
        </form>
      </div>

      {/* Cover image card */}
      <div className="settings-card">
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
                    await apiRequest(`/courses/${course.id}`, { method: "PATCH", body: { coverImageUrl: null } });
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
      </div>

      {/* V2: Batches / Intakes — UI only, mock data */}
      <BatchesSection courseId={course.id} />

      <CourseStructureEditor
        courseId={course.id}
        initialSemesters={course.semesters ?? []}
      />


    </div>
  );
}
