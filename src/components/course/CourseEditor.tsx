"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface Attachment {
  name: string;
  size: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  attachments: Attachment[];
}

export interface Subject {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Semester {
  id: string;
  title: string;
  subjects: Subject[];
}

export interface CoursePayload {
  title: string;
  subject: string;
  semesters: number;
  lessons: number;
  tree: Semester[];
}

const INITIAL_TREE: Semester[] = [
  {
    id: "S1",
    title: "Semester 1",
    subjects: [
      {
        id: "S1-1",
        title: "Number Sense & Operations",
        lessons: [
          {
            id: "L1",
            title: "Whole numbers",
            description: "Place value, ordering and rounding.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            attachments: [{ name: "Worksheet.pdf", size: "312 KB" }],
          },
        ],
      },
      {
        id: "S1-2",
        title: "Fractions, Decimals, Percents",
        lessons: [
          { id: "L2", title: "Equivalent fractions", description: "", videoUrl: "", attachments: [] },
        ],
      },
    ],
  },
  { id: "S2", title: "Semester 2", subjects: [] },
];

interface Props {
  initial?: { title: string; subject: string };
  onCancel: () => void;
  onSave: (p: CoursePayload) => void;
  onPublish: (p: CoursePayload) => void;
}

export function CourseEditor({ initial, onCancel, onSave, onPublish }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "Engineering");
  const [tree, setTree] = useState<Semester[]>(INITIAL_TREE);
  const [activeLessonRef, setActiveLessonRef] = useState({
    semId: "S1",
    subId: "S1-1",
    lessonId: "L1",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findLesson = (): Lesson | null => {
    const sem = tree.find((s) => s.id === activeLessonRef.semId);
    if (!sem) return null;
    const sub = sem.subjects.find((x) => x.id === activeLessonRef.subId);
    if (!sub) return null;
    return sub.lessons.find((l) => l.id === activeLessonRef.lessonId) ?? null;
  };
  const lesson = findLesson();

  const updateLesson = (patch: Partial<Lesson>) => {
    setTree(
      tree.map((sem) =>
        sem.id !== activeLessonRef.semId
          ? sem
          : {
              ...sem,
              subjects: sem.subjects.map((sub) =>
                sub.id !== activeLessonRef.subId
                  ? sub
                  : {
                      ...sub,
                      lessons: sub.lessons.map((l) =>
                        l.id !== activeLessonRef.lessonId ? l : { ...l, ...patch },
                      ),
                    },
              ),
            },
      ),
    );
  };

  const addSemester = () => {
    const id = "S" + (tree.length + 1);
    setTree([...tree, { id, title: "Semester " + (tree.length + 1), subjects: [] }]);
  };
  const addSubject = (semId: string) => {
    const sem = tree.find((s) => s.id === semId);
    if (!sem) return;
    const id = semId + "-" + (sem.subjects.length + 1);
    setTree(
      tree.map((s) =>
        s.id !== semId
          ? s
          : { ...s, subjects: [...s.subjects, { id, title: "New subject", lessons: [] }] },
      ),
    );
  };
  const addLesson = (semId: string, subId: string) => {
    const id = "L" + Date.now();
    setTree(
      tree.map((s) =>
        s.id !== semId
          ? s
          : {
              ...s,
              subjects: s.subjects.map((sub) =>
                sub.id !== subId
                  ? sub
                  : {
                      ...sub,
                      lessons: [
                        ...sub.lessons,
                        { id, title: "New lesson", description: "", videoUrl: "", attachments: [] },
                      ],
                    },
              ),
            },
      ),
    );
    setActiveLessonRef({ semId, subId, lessonId: id });
  };

  const totalLessons = tree.reduce(
    (n, s) => n + s.subjects.reduce((m, su) => m + su.lessons.length, 0),
    0,
  );

  const buildPayload = (): CoursePayload => ({
    title,
    subject,
    semesters: tree.length,
    lessons: totalLessons,
    tree,
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{initial ? "Edit course" : "New course"}</h1>
          <div className="greeting">
            Build the structure: semesters → subjects → lessons. Add a video and attachments to
            each lesson.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" icon="save" onClick={() => onSave(buildPayload())}>
            Save draft
          </Button>
          <Button icon="upload-cloud" onClick={() => onPublish(buildPayload())}>
            Publish
          </Button>
        </div>
      </div>

      <div className="course-meta-card">
        <div className="form-grid two">
          <Input
            label="Course title"
            placeholder="e.g. Modern Backend Engineering"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="field">
            <label className="label">Subject</label>
            <select
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option>Engineering</option>
              <option>Machine Learning</option>
              <option>Data Analytics</option>
              <option>Data Viz</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="course-editor">
        <aside className="course-tree">
          <div className="tree-head">
            <h3>Structure</h3>
            <Button size="sm" variant="ghost" icon="plus" onClick={addSemester}>
              Semester
            </Button>
          </div>
          {tree.map((sem) => (
            <div key={sem.id} className="tree-sem">
              <div className="tree-sem-row">
                <Icon name="folder" size={14} /> <b>{sem.title}</b>
                <button
                  className="tree-add"
                  onClick={() => addSubject(sem.id)}
                  title="Add subject"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
              {sem.subjects.map((sub) => (
                <div key={sub.id} className="tree-sub">
                  <div className="tree-sub-row">
                    <Icon name="bookmark" size={13} /> {sub.title}
                    <button
                      className="tree-add"
                      onClick={() => addLesson(sem.id, sub.id)}
                      title="Add lesson"
                    >
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                  {sub.lessons.map((l) => (
                    <div
                      key={l.id}
                      className={cn("tree-lesson", activeLessonRef.lessonId === l.id && "active")}
                      onClick={() =>
                        setActiveLessonRef({ semId: sem.id, subId: sub.id, lessonId: l.id })
                      }
                    >
                      <Icon name="play-circle" size={12} /> {l.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <div className="course-form">
          {!lesson ? (
            <div className="settings-card">
              <h2>Pick or add a lesson</h2>
              <p className="settings-sub">
                Use the tree on the left to add a semester, subject, then lesson.
              </p>
            </div>
          ) : (
            <div className="settings-card">
              <h2>Lesson</h2>
              <div className="form-grid one">
                <Input
                  label="Title"
                  value={lesson.title}
                  onChange={(e) => updateLesson({ title: e.target.value })}
                />
                <div className="field">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={lesson.description}
                    onChange={(e) => updateLesson({ description: e.target.value })}
                    placeholder="What this lesson covers and what learners will be able to do."
                  />
                </div>
                <Input
                  label="Embedded video URL"
                  placeholder="YouTube / Vimeo embed URL"
                  value={lesson.videoUrl}
                  onChange={(e) => updateLesson({ videoUrl: e.target.value })}
                  hint="Paste a YouTube or Vimeo embed link."
                />
                {lesson.videoUrl && (
                  <div className="video-preview">
                    <iframe
                      src={lesson.videoUrl}
                      title="Lesson video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <div className="field">
                  <label className="label">Attachments</label>
                  <div
                    className="dropzone"
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <Icon name="upload-cloud" size={22} />
                    <div>
                      <b>Drop files here</b>{" "}
                      <span className="muted">or click to browse</span>
                    </div>
                    <div className="hint">PDFs, slides, worksheets · up to 25 MB each.</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) return;
                      updateLesson({
                        attachments: [
                          ...lesson.attachments,
                          ...files.map((f) => ({ name: f.name, size: formatBytes(f.size) })),
                        ],
                      });
                      e.target.value = "";
                    }}
                  />
                  {lesson.attachments.length > 0 && (
                    <div className="attach-list">
                      {lesson.attachments.map((a, i) => (
                        <div key={i} className="attach-item">
                          <div className="ico">
                            <Icon name="file-text" size={16} />
                          </div>
                          <div className="name">{a.name}</div>
                          <div className="size">{a.size}</div>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              updateLesson({
                                attachments: lesson.attachments.filter((_, j) => j !== i),
                              })
                            }
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
