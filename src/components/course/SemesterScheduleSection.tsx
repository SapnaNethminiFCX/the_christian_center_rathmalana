"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest } from "@/infrastructure/api/request";

/**
 * UI-only overlay for editing each semester's open/close date.
 *
 * V2 introduces time-bound semesters — each semester has an explicit
 * `openDate` and `endDate`, and content auto-locks for the cohort once
 * the end date passes. The backend doesn't yet accept these fields, so
 * the dates here live in component-local state and `dirty` is just a
 * visual cue. When the API catches up, wire `onSave` to `PATCH /semesters/:id`.
 */

interface SemesterRow {
  id: string;
  title: string;
  order: number;
}

interface Props {
  semesters: SemesterRow[];
}

interface DateState {
  openDate: string;
  endDate: string;
}

function isPast(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function SemesterScheduleSection({ semesters }: Props) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState<Record<string, DateState>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // Reset when semester list changes (e.g. after add/remove). Initially
  // every semester gets blank dates — admins fill them in via the inputs.
  useEffect(() => {
    const next: Record<string, DateState> = {};
    for (const s of semesters) {
      next[s.id] = draft[s.id] ?? { openDate: "", endDate: "" };
    }
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.length]);

  const update = (id: string, key: keyof DateState, value: string) => {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
    setDirty((prev) => new Set(prev).add(id));
  };

  const save = async (id: string, title: string) => {
    const d = draft[id];
    if (!d) return;
    try {
      await apiRequest(`/semesters/${id}`, {
        method: "PATCH",
        body: {
          ...(d.openDate ? { openDate: d.openDate } : {}),
          ...(d.endDate  ? { endDate:  d.endDate  } : {}),
        },
      });
      setDirty((prev) => { const next = new Set(prev); next.delete(id); return next; });
      dispatch(pushToast({ tone: "success", title: "Schedule saved", message: `${title} dates updated.` }));
    } catch {
      dispatch(pushToast({ tone: "warning", title: "Couldn't save dates", message: "Please try again." }));
    }
  };

  if (semesters.length === 0) {
    return null; // The CourseStructureEditor itself shows the empty-semester state.
  }

  return (
    <section className="settings-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Semester schedule</h2>
          <p className="settings-sub">
            Each semester runs for a fixed window. Once <b>End date</b> passes,
            content locks for the cohort — students see a &ldquo;Closed&rdquo; badge and
            cannot mark lessons complete.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {semesters
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            const d = draft[s.id] ?? { openDate: "", endDate: "" };
            const isClosed = isPast(d.endDate);
            const isOpen = d.openDate && !isClosed && isPast(d.openDate);
            const isFuture = d.openDate && !isPast(d.openDate);
            const isDirty = dirty.has(s.id);

            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 18px",
                  background: isClosed ? "var(--color-error-bg)" : "#fff",
                  border: `1px solid ${isClosed ? "rgba(220,38,38,0.18)" : "var(--color-stroke)"}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ minWidth: 0, fontFamily: "var(--font-body)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
                    Semester {s.order}: {s.title}
                  </div>
                  {(isClosed || isOpen || isFuture) && (
                    <div style={{ marginTop: 4 }}>
                      {isClosed && <Badge tone="error">Closed</Badge>}
                      {isOpen && <Badge tone="success">Open</Badge>}
                      {isFuture && <Badge tone="warning">Upcoming</Badge>}
                    </div>
                  )}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label" style={{ fontSize: 11 }}>
                    Open
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={d.openDate}
                    onChange={(e) => update(s.id, "openDate", e.target.value)}
                    style={dateInputStyle()}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label" style={{ fontSize: 11 }}>
                    End
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={d.endDate}
                    onChange={(e) => update(s.id, "endDate", e.target.value)}
                    style={dateInputStyle()}
                  />
                </div>
                <Button
                  size="sm"
                  icon="check"
                  disabled={!isDirty}
                  onClick={() => save(s.id, s.title)}
                >
                  Save
                </Button>
                {isClosed && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-error-deep)" }}>
                    <Icon name="lock" size={12} /> Locked
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}

function dateInputStyle(): React.CSSProperties {
  return {
    padding: "8px 10px",
    border: "1px solid var(--color-stroke)",
    borderRadius: 8,
    fontFamily: "var(--font-body)",
    fontSize: 13,
    color: "var(--color-primary)",
    background: "#fff",
  };
}
