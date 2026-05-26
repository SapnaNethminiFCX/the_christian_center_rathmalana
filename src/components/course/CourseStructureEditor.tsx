"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useSavedBadge, SavedBadge } from "@/components/ui/SavedBadge";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { API_PREFIX, apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import { getIdToken } from "@/infrastructure/firebase/getToken";
import type { Semester, Subject } from "@/application/hooks/useCourses";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface Lesson {
  id: string;
  subjectId: string;
  courseId?: string;
  semesterId?: string;
  title: string;
  description?: string | null;
  youtubeVideoId?: string | null;   // raw 11-char YouTube video ID (per API doc)
  attachmentIds?: string[];
  order?: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  subjectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface Props {
  courseId: string;
  initialSemesters: Semester[];
  onStructureChange?: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Extract the raw 11-character YouTube video ID from any input shape:
 * watch URL, short URL, embed URL, or the raw ID itself.
 * Returns null if no valid ID can be extracted.
 */
function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Already a raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Watch URL: ?v=ID or &v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // Short URL: youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // Embed URL: youtube.com/embed/ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

/**
 * Convert any YouTube URL format or raw video ID to an embed URL.
 * Accepts: watch URL, short URL, embed URL, or raw 11-char ID.
 * Returns null if the input is not recognisable as YouTube.
 */
function getYouTubeEmbedUrl(input: string): string | null {
  if (!input.trim()) return null;
  // Already an embed URL
  if (input.includes("youtube.com/embed/")) return input.split("?")[0];
  // Standard watch URL: ?v=ID or &v=ID
  const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  // Short URL: youtu.be/ID
  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  // Raw 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return `https://www.youtube.com/embed/${input.trim()}`;
  // Non-YouTube URL — embed as-is
  if (input.startsWith("http")) return input;
  return null;
}

async function uploadAttachment(subjectId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const token = await getIdToken();
  const res = await fetch(`${API_PREFIX}/subjects/${subjectId}/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    throw new ApiRequestError({ code: json.error?.code ?? "UPLOAD_ERROR", message: json.error?.message ?? `Upload failed (${res.status})`, status: res.status });
  }
  return res.json() as Promise<Attachment>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── InlineEdit ─────────────────────────────────────────────────────────── */

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    if (!draft.trim() || draft.trim() === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  if (!editing) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <button type="button" onClick={() => { setDraft(value); setEditing(true); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
        <Icon name="edit-3" size={13} />
      </button>
    </span>
  );

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid var(--color-accent)", fontFamily: "var(--font-body)", fontSize: 14, background: "var(--color-surface-2)", color: "var(--color-primary)", outline: "none", minWidth: 200 }} />
      <button type="button" onClick={commit} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", padding: 2 }}>
        <Icon name="check" size={15} />
      </button>
      <button type="button" onClick={() => { setEditing(false); setDraft(value); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
        <Icon name="x" size={15} />
      </button>
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export function CourseStructureEditor({ courseId, initialSemesters, onStructureChange }: Props) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);

  // Sync when parent loads course from API (useState only uses initial value once).
  useEffect(() => {
    setSemesters(initialSemesters);
  }, [initialSemesters]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Semester form (inline — shown when "Add semester" is clicked)
  const [showSemForm, setShowSemForm] = useState(false);
  const [semTitle, setSemTitle] = useState("");
  const [semOpenDate, setSemOpenDate] = useState("");
  const [semEndDate, setSemEndDate] = useState("");
  const [semSaving, setSemSaving] = useState(false);

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonErrors, setLessonErrors] = useState<Record<string, string>>({});

  const { saved: semSaved,     triggerSaved: triggerSemSaved }     = useSavedBadge();
  const { saved: lessonSaved,  triggerSaved: triggerLessonSaved }  = useSavedBadge();

  // Subject image upload
  const subjectImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSubjectImage, setUploadingSubjectImage] = useState(false);

  // Attachments — tracked per open lesson form
  const [formAttachments, setFormAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<{ kind: "semester" | "subject" | "lesson" | "attachment"; id: string; label: string } | null>(null);

  const loadLessons = useCallback(async (subjectId: string) => {
    setLessonsLoading(true);
    try {
      const data = await apiRequest<Lesson[]>(`/subjects/${subjectId}/lessons`);
      setLessons(data ?? []);
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Failed to load lessons" }));
    } finally {
      setLessonsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    // Always reset form state when switching subjects.
    setShowLessonForm(false);
    setEditingLesson(null);
    setLessonTitle(""); setLessonUrl(""); setLessonDescription("");
    setFormAttachments([]); setLessonErrors({});

    if (selectedSubjectId) loadLessons(selectedSubjectId);
    else setLessons([]);
  }, [selectedSubjectId, loadLessons]);

  /* ── Semesters ─────────────────────────────────────────── */

  const submitAddSemester = async () => {
    if (!semTitle.trim() || !semOpenDate) return;
    setSemSaving(true);
    try {
      // V2 POST /courses/:id/semesters requires: name, number, openDate.
      // Also send title for V1 backend compat.
      const body: Record<string, unknown> = {
        name:     semTitle.trim(),
        title:    semTitle.trim(),
        number:   semesters.length + 1,
        openDate: semOpenDate,
      };
      if (semEndDate) body.endDate = semEndDate;
      const sem = await apiRequest<Semester>(`/courses/${courseId}/semesters`, {
        method: "POST",
        body,
      });
      const newSem = { ...sem, name: sem.name ?? semTitle.trim(), title: sem.title ?? semTitle.trim(), openDate: sem.openDate ?? semOpenDate, endDate: (sem.endDate ?? (semEndDate || null)), subjects: [] as typeof sem.subjects };
      setSemesters((p) => [...p, newSem]);
      setSemTitle(""); setSemOpenDate(""); setSemEndDate(""); setShowSemForm(false);
      triggerSemSaved();
      onStructureChange?.();
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Failed to add semester" }));
    } finally {
      setSemSaving(false);
    }
  };

  const editSemesterTitle = async (semId: string, title: string) => {
    try {
      await apiRequest(`/semesters/${semId}`, { method: "PATCH", body: { title } });
      setSemesters((p) => p.map((s) => s.id === semId ? { ...s, title } : s));
    } catch (err) {
      dispatch(pushToast({ tone: "warning", title: err instanceof ApiRequestError && err.status === 404 ? "Semester no longer exists" : "Failed to save" }));
    }
  };

  const deleteSemester = async (semId: string) => {
    try {
      await apiRequest(`/semesters/${semId}`, { method: "DELETE" });
      const sem = semesters.find((s) => s.id === semId);
      if (sem?.subjects?.some((sub) => sub.id === selectedSubjectId)) setSelectedSubjectId(null);
      setSemesters((p) => p.filter((s) => s.id !== semId));
      onStructureChange?.();
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to delete semester" })); }
  };

  /* ── Subject image upload (V2 new) ─────────────────────── */

  const uploadSubjectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubjectId) return;
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Only JPG and PNG are accepted." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      dispatch(pushToast({ tone: "warning", title: "File too large", message: "Max 10 MB per image." }));
      return;
    }
    setUploadingSubjectImage(true);
    try {
      const { tokenService } = await import("@/infrastructure/firebase/tokenService");
      const token = await tokenService.get();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_PREFIX}/subjects/${selectedSubjectId}/images`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Accept-Language": localStorage.getItem("edupath.locale") ?? "en",
        },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setSemesters((prev) =>
        prev.map((sem) => ({
          ...sem,
          subjects: sem.subjects?.map((sub) =>
            sub.id === selectedSubjectId
              ? { ...sub, imageUrls: [...(sub.imageUrls ?? []), url] }
              : sub,
          ),
        })),
      );
      dispatch(pushToast({ tone: "success", title: "Image uploaded" }));
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Image upload failed" }));
    } finally {
      setUploadingSubjectImage(false);
      if (subjectImageInputRef.current) subjectImageInputRef.current.value = "";
    }
  };

  /* ── Subjects ──────────────────────────────────────────── */

  const addSubject = async (semId: string) => {
    const count = semesters.find((s) => s.id === semId)?.subjects?.length ?? 0;
    try {
      const sub = await apiRequest<Subject>(`/semesters/${semId}/subjects`, {
        method: "POST", body: { title: `Subject ${count + 1}` },
      });
      setSemesters((p) => p.map((s) => s.id !== semId ? s : { ...s, subjects: [...(s.subjects ?? []), sub] }));
      setSelectedSubjectId(sub.id);
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to add subject" })); }
  };

  const editSubjectTitle = async (semId: string, subId: string, title: string) => {
    try {
      await apiRequest(`/subjects/${subId}`, { method: "PATCH", body: { title } });
      setSemesters((p) => p.map((s) => s.id !== semId ? s : {
        ...s, subjects: s.subjects?.map((sub) => sub.id === subId ? { ...sub, title } : sub),
      }));
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to save" })); }
  };

  const deleteSubject = async (semId: string, subId: string) => {
    try {
      await apiRequest(`/subjects/${subId}`, { method: "DELETE" });
      if (selectedSubjectId === subId) setSelectedSubjectId(null);
      setSemesters((p) => p.map((s) => s.id !== semId ? s : {
        ...s, subjects: s.subjects?.filter((sub) => sub.id !== subId),
      }));
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to delete subject" })); }
  };

  /* ── Lessons ───────────────────────────────────────────── */

  const openAddLesson = () => {
    setEditingLesson(null);
    setLessonTitle(""); setLessonUrl(""); setLessonDescription("");
    setFormAttachments([]);
    setLessonErrors({});
    setShowLessonForm(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    // Convert stored video ID back to a full URL for the user-visible input.
    setLessonUrl(l.youtubeVideoId ? `https://www.youtube.com/watch?v=${l.youtubeVideoId}` : "");
    setLessonDescription(l.description ?? "");
    setFormAttachments([]); // existing attachmentIds shown separately
    setLessonErrors({});
    setShowLessonForm(true);
  };

  const cancelLessonForm = () => {
    setShowLessonForm(false);
    setFormAttachments([]);
    setLessonErrors({});
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim()) { setLessonErrors({ title: "Title is required." }); return; }
    setLessonSaving(true);

    const newAttachmentIds = formAttachments.map((a) => a.id);
    const existingIds = editingLesson?.attachmentIds ?? [] as string[];
    const allAttachmentIds = [...existingIds, ...newAttachmentIds];

    // Always send the full current state of the lesson — existing values pre-filled
    // in the form + any updates. Backend PATCH replaces what we send.
    // youtubeVideoId must be the raw 11-char ID (per API doc), not a URL.
    const trimmedUrl = lessonUrl.trim();
    const videoId = trimmedUrl ? extractYouTubeId(trimmedUrl) : null;
    if (trimmedUrl && !videoId) {
      setLessonErrors({ url: "Please paste a valid YouTube URL or 11-character video ID." });
      setLessonSaving(false);
      return;
    }
    const body: Record<string, unknown> = {
      title: lessonTitle.trim(),
      youtubeVideoId: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      description: lessonDescription.trim(),
      attachmentIds: allAttachmentIds,
    };

    try {
      if (editingLesson) {
        // eslint-disable-next-line no-console
        console.log(`[lesson PATCH] /lessons/${editingLesson.id}`, body);
        const updated = await apiRequest<Lesson>(`/lessons/${editingLesson.id}`, { method: "PATCH", body });
        setLessons((p) => p.map((l) => l.id === editingLesson.id ? updated : l));
        triggerLessonSaved();
      } else {
        // eslint-disable-next-line no-console
        console.log(`[lesson POST] /subjects/${selectedSubjectId}/lessons`, body);
        const created = await apiRequest<Lesson>(`/subjects/${selectedSubjectId}/lessons`, { method: "POST", body });
        setLessons((p) => [...p, created]);
        triggerLessonSaved();
      }
      setShowLessonForm(false);
      setFormAttachments([]);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 500) {
        dispatch(pushToast({
          tone: "warning",
          title: "Server error — please retry",
          message: "If this keeps happening, please contact support.",
        }));
      } else {
        dispatch(pushToast({
          tone: "warning",
          title: "Failed to save lesson",
          message: err instanceof ApiRequestError ? err.message : undefined,
        }));
      }
    } finally {
      setLessonSaving(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      await apiRequest(`/lessons/${lessonId}`, { method: "DELETE" });
      setLessons((p) => p.filter((l) => l.id !== lessonId));
      // Close the form and clear fields if the deleted lesson was being edited.
      if (editingLesson?.id === lessonId) {
        setShowLessonForm(false);
        setEditingLesson(null);
        setLessonTitle(""); setLessonUrl(""); setLessonDescription("");
        setFormAttachments([]); setLessonErrors({});
      }
      dispatch(pushToast({ tone: "success", title: "Lesson deleted" }));
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to delete lesson" })); }
  };

  /* ── Attachments (inside lesson form) ─────────────────── */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedSubjectId) return;
    if (file.size > 25 * 1024 * 1024) {
      dispatch(pushToast({ tone: "warning", title: "File too large", message: "Maximum file size is 25 MB." }));
      return;
    }
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      dispatch(pushToast({ tone: "warning", title: "Invalid file type", message: "Only PDF, DOC and DOCX are allowed." }));
      return;
    }
    setUploading(true);
    try {
      const att = await uploadAttachment(selectedSubjectId, file);
      setFormAttachments((p) => [...p, att]);
      dispatch(pushToast({ tone: "success", title: "File uploaded", message: att.filename }));
    } catch (err) {
      dispatch(pushToast({ tone: "warning", title: "Upload failed", message: err instanceof ApiRequestError ? err.message : undefined }));
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      const { downloadUrl } = await apiRequest<{ downloadUrl: string; expiresAt: string }>(`/attachments/${attachmentId}/download-url`);
      window.open(downloadUrl, "_blank");
    } catch (err) {
      dispatch(pushToast({
        tone: "warning",
        title: err instanceof ApiRequestError && err.status === 403 ? "Enrollment required" : "Download failed",
        message: err instanceof ApiRequestError && err.status === 403 ? "You must be enrolled to download." : undefined,
      }));
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      await apiRequest(`/attachments/${attachmentId}`, { method: "DELETE" });
      // Remove from new uploads list
      setFormAttachments((p) => p.filter((a) => a.id !== attachmentId));
      // Remove from lessons list (all lessons that referenced this ID)
      setLessons((p) => p.map((l) => ({ ...l, attachmentIds: (l.attachmentIds ?? []).filter((id) => id !== attachmentId) })));
      // Remove from editingLesson so it disappears from the existing IDs list
      if (editingLesson) {
        setEditingLesson((prev) => prev ? { ...prev, attachmentIds: (prev.attachmentIds ?? []).filter((id) => id !== attachmentId) } : null);
      }
      dispatch(pushToast({ tone: "success", title: "Attachment deleted" }));
    } catch { dispatch(pushToast({ tone: "warning", title: "Failed to delete attachment" })); }
  };

  /* ── Confirm delete ────────────────────────────────────── */

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    if (toDelete.kind === "semester") await deleteSemester(toDelete.id);
    else if (toDelete.kind === "subject") {
      const sem = semesters.find((s) => s.subjects?.some((sub) => sub.id === toDelete.id));
      if (sem) await deleteSubject(sem.id, toDelete.id);
    } else if (toDelete.kind === "lesson") await deleteLesson(toDelete.id);
    else await deleteAttachment(toDelete.id);
    setToDelete(null);
  };

  const selectedSubject = semesters.flatMap((s) => s.subjects ?? []).find((sub) => sub.id === selectedSubjectId);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <>
      <div className="settings-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Course structure</h2>
            <p className="settings-sub" style={{ marginTop: 4 }}>
              Semesters → Subjects → Lessons. Click a subject to manage its lessons.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SavedBadge visible={semSaved} />
            <Button size="sm" icon={showSemForm ? "x" : "plus"} onClick={() => setShowSemForm((v) => !v)}>
              {showSemForm ? "Cancel" : "Add semester"}
            </Button>
          </div>
        </div>

        {/* Inline add-semester form */}
        {showSemForm && (
          <div style={{ background: "var(--color-stroke-2)", border: "1px solid var(--color-stroke)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Input label="Semester title" placeholder={`Semester ${semesters.length + 1}`}
                value={semTitle} onChange={(e) => setSemTitle(e.target.value)} />
              <Input label="Start date (required)" type="date"
                value={semOpenDate} onChange={(e) => setSemOpenDate(e.target.value)} />
              <Input label="End date" type="date"
                value={semEndDate} onChange={(e) => setSemEndDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Button type="button" size="sm" icon="check" disabled={!semTitle.trim() || !semOpenDate || semSaving} onClick={submitAddSemester}>
                {semSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {semesters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
            <Icon name="layers" size={28} style={{ marginBottom: 10, opacity: 0.35 }} />
            <p style={{ margin: 0 }}>No semesters yet. Click <b>Add semester</b> to start.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "flex-start" }}>

            {/* Left: semester/subject tree */}
            <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 12, overflow: "hidden" }}>
              {semesters.map((sem, si) => (
                <div key={sem.id} style={{ borderBottom: si < semesters.length - 1 ? "1px solid var(--color-stroke)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--color-light-gray)" }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(188,233,85,0.15)", border: "1px solid rgba(188,233,85,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#BCE955", flexShrink: 0 }}>{si + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <InlineEdit value={sem.name ?? sem.title ?? ""} onSave={(v) => editSemesterTitle(sem.id, v)} />
                      {(sem.openDate || sem.endDate) && (
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                          {sem.openDate ?? "—"} → {sem.endDate ?? "—"}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => addSubject(sem.id)} title="Add subject"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
                      <Icon name="plus" size={14} />
                    </button>
                    <button type="button" onClick={() => setToDelete({ kind: "semester", id: sem.id, label: sem.title ?? sem.name ?? "" })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
                      <Icon name="trash-2" size={13} />
                    </button>
                  </div>
                  {sem.subjects?.map((sub) => (
                    <div key={sub.id} onClick={() => setSelectedSubjectId(sub.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 28px", cursor: "pointer", background: selectedSubjectId === sub.id ? "rgba(188,233,85,0.10)" : "transparent", borderLeft: selectedSubjectId === sub.id ? "3px solid #BCE955" : "3px solid transparent" }}>
                      <Icon name="bookmark" size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                        <InlineEdit value={sub.title} onSave={(v) => editSubjectTitle(sem.id, sub.id, v)} />
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setToDelete({ kind: "subject", id: sub.id, label: sub.title }); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2, flexShrink: 0 }}>
                        <Icon name="trash-2" size={12} />
                      </button>
                    </div>
                  ))}
                  {(sem.subjects?.length ?? 0) === 0 && (
                    <div style={{ padding: "6px 14px 8px 28px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>No subjects yet</div>
                  )}
                </div>
              ))}
            </div>

            {/* Right: lessons panel */}
            {!selectedSubjectId ? (
              <div style={{ border: "1px dashed var(--color-stroke)", borderRadius: 12, padding: "32px 24px", textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                <Icon name="mouse-pointer-click" size={24} style={{ marginBottom: 10, opacity: 0.35 }} />
                <p style={{ margin: 0 }}>Select a subject to manage its lessons.</p>
              </div>
            ) : (
              <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 12, overflow: "hidden" }}>
                {/* Panel header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--color-light-gray)", borderBottom: "1px solid var(--color-stroke)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: "var(--font-body)" }}>{selectedSubject?.title}</div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <SavedBadge visible={lessonSaved} />
                    {!showLessonForm && <Button size="sm" icon="plus" onClick={openAddLesson}>Add lesson</Button>}
                  </div>
                </div>

                {/* Add / Edit lesson form */}
                {showLessonForm && (
                  <div style={{ padding: 16, borderBottom: "1px solid var(--color-stroke)", background: "var(--color-surface-2)" }}>
                    <div style={{ fontWeight: 600, fontFamily: "var(--font-body)", marginBottom: 12 }}>{editingLesson ? "Edit lesson" : "New lesson"}</div>
                    <div className="form-grid one">
                      <Input label="Title" value={lessonTitle} error={lessonErrors.title}
                        onChange={(e) => { setLessonTitle(e.target.value); setLessonErrors((p) => { const n = { ...p }; delete n.title; return n; }); }}
                        placeholder="e.g. Introduction to TypeScript" autoFocus />
                      <Input label="Video URL" value={lessonUrl}
                        onChange={(e) => setLessonUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        hint="YouTube, Vimeo or any video URL. Leave blank if no video." />
                      {/* Live embed preview */}
                      {lessonUrl.trim() && getYouTubeEmbedUrl(lessonUrl) && (
                        <div style={{ borderRadius: 10, overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                          <iframe
                            src={getYouTubeEmbedUrl(lessonUrl) as string}
                            title="Video preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0, borderRadius: 10 }}
                          />
                        </div>
                      )}
                      <div className="field">
                        <label className="label">Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                        <textarea className="input" style={{ height: 72, paddingTop: 10, resize: "vertical" }}
                          value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)}
                          placeholder="What this lesson covers." />
                      </div>

                      {/* Attachments section inside form */}
                      <div className="field">
                        <label className="label">Attachments</label>
                        <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 10, overflow: "hidden" }}>
                          {/* Existing attachment IDs from lesson being edited */}
                          {editingLesson && (editingLesson.attachmentIds?.length ?? 0) > 0 && (editingLesson.attachmentIds ?? []).map((attId) => (
                            <div key={attId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--color-stroke)" }}>
                              <Icon name="paperclip" size={14} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {attId.slice(0, 20)}…
                              </div>
                              <button type="button" onClick={() => downloadAttachment(attId)} disabled={downloadingId === attId}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-body-green)", padding: 2 }}>
                                <Icon name={downloadingId === attId ? "loader" : "download"} size={14} />
                              </button>
                              <button type="button" onClick={() => setToDelete({ kind: "attachment", id: attId, label: `attachment (${attId.slice(0, 8)}…)` })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
                                <Icon name="trash-2" size={13} />
                              </button>
                            </div>
                          ))}
                          {/* Newly uploaded in this form session */}
                          {formAttachments.map((a) => (
                            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--color-stroke)" }}>
                              <Icon name="file-text" size={14} style={{ color: "var(--color-body-green)", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</div>
                                <div style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>{formatBytes(a.sizeBytes)}</div>
                              </div>
                              <button type="button" onClick={() => downloadAttachment(a.id)} disabled={downloadingId === a.id}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-body-green)", padding: 2 }}>
                                <Icon name={downloadingId === a.id ? "loader" : "download"} size={14} />
                              </button>
                              <button type="button" onClick={() => setToDelete({ kind: "attachment", id: a.id, label: a.filename })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
                                <Icon name="trash-2" size={13} />
                              </button>
                            </div>
                          ))}
                          {/* Upload button */}
                          <div style={{ padding: "8px 12px" }}>
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px dashed var(--color-stroke)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", width: "100%", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                              <Icon name="upload" size={14} />
                              {uploading ? "Uploading…" : "Upload PDF, DOC or DOCX (max 25 MB)"}
                            </button>
                          </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFileSelect} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Button size="sm" variant="ghost" onClick={cancelLessonForm} disabled={lessonSaving}>Cancel</Button>
                      <Button size="sm" icon="check" onClick={saveLesson} disabled={lessonSaving}>
                        {lessonSaving ? "Saving…" : editingLesson ? "Save changes" : "Add lesson"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lesson list */}
                {lessonsLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--color-muted)" }}><Icon name="loader" size={18} /></div>
                ) : lessons.length === 0 && !showLessonForm ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                    No lessons yet. Click <b>Add lesson</b>.
                  </div>
                ) : (
                  lessons.map((l, li) => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: li < lessons.length - 1 ? "1px solid var(--color-stroke)" : "none" }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--color-light-gray)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--color-body-green)", flexShrink: 0 }}>{li + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontFamily: "var(--font-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
                          {l.youtubeVideoId && <span style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}><Icon name="play-circle" size={11} /> Video</span>}
                          {(l.attachmentIds?.length ?? 0) > 0 && <span style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}><Icon name="paperclip" size={11} /> {l.attachmentIds!.length} file{l.attachmentIds!.length > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button type="button" onClick={() => openEditLesson(l)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4 }}>
                          <Icon name="edit-3" size={14} />
                        </button>
                        <button type="button" onClick={() => setToDelete({ kind: "lesson", id: l.id, label: l.title })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4 }}>
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete ? `Delete "${toDelete.label}"?` : ""}
        message={
          toDelete?.kind === "semester" ? "This permanently deletes the semester and all its subjects." :
          toDelete?.kind === "subject" ? "This permanently deletes the subject and all its lessons." :
          toDelete?.kind === "lesson" ? "This permanently deletes the lesson." :
          "This permanently removes the file."
        }
        confirmLabel="Delete" destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
