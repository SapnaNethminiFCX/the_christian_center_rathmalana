"use client";

/**
 * EditReportDialog — modal form for PATCH /cells/:id/reports/:rid (V2 §14.5).
 *
 * Only the spec-editable fields are exposed:
 *   - location           (text)
 *   - satisfactionRate   (1–5 star picker)
 *   - additionalInfo     (textarea)
 *   - attendance         (per-person Present / Absent toggle)
 *
 * Other fields (date, didMeet, language, subject, photos, etc.) are NOT
 * editable per the spec — locked once the report is filed.
 *
 * The 24-hour edit window is gated by the parent (caller passes a
 * pre-validated `report` only when within the window). This dialog still
 * shows a small live countdown so the user can see how much time is left.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import type {
  CellReport,
  AttendanceEntry,
  ReportEditPayload,
} from "@/application/hooks/useCellReports";
import { editWindowSecondsRemaining } from "@/application/hooks/useCellReports";

interface Props {
  open: boolean;
  report: CellReport;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (payload: ReportEditPayload) => void;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return `${seconds}s left`;
}

export function EditReportDialog({ open, report, busy, onCancel, onConfirm }: Props) {
  const [location, setLocation] = useState(report.location ?? "");
  const [satisfaction, setSatisfaction] = useState<number>(report.satisfactionRate ?? 0);
  const [additionalInfo, setAdditionalInfo] = useState(report.additionalInfo ?? "");
  const [attendance, setAttendance] = useState<AttendanceEntry[]>(report.attendance ?? []);
  const [remaining, setRemaining] = useState<number>(editWindowSecondsRemaining(report.createdAt));

  // Re-hydrate when a different report is passed in (parent might re-use the
  // dialog instance for different reports).
  useEffect(() => {
    setLocation(report.location ?? "");
    setSatisfaction(report.satisfactionRate ?? 0);
    setAdditionalInfo(report.additionalInfo ?? "");
    setAttendance(report.attendance ?? []);
  }, [report.id, report.location, report.satisfactionRate, report.additionalInfo, report.attendance]);

  // Live countdown of the edit window — refreshes every 30 s.
  useEffect(() => {
    if (!open) return;
    setRemaining(editWindowSecondsRemaining(report.createdAt));
    const t = setInterval(() => {
      setRemaining(editWindowSecondsRemaining(report.createdAt));
    }, 30_000);
    return () => clearInterval(t);
  }, [open, report.createdAt]);

  // Compute the diff to send — only include fields that actually changed,
  // matching PATCH semantics so the backend doesn't get an unintended update.
  const payload = useMemo<ReportEditPayload>(() => {
    const out: ReportEditPayload = {};
    if (location !== (report.location ?? "")) out.location = location.trim();
    if (satisfaction !== (report.satisfactionRate ?? 0) && satisfaction > 0) out.satisfactionRate = satisfaction;
    if ((additionalInfo ?? "") !== (report.additionalInfo ?? "")) {
      out.additionalInfo = additionalInfo.trim() || null;
    }
    // Attendance change detection is shallow — if any entry's status differs.
    const originalAtt = report.attendance ?? [];
    const attendanceChanged =
      attendance.length !== originalAtt.length ||
      attendance.some((a, i) => a.status !== originalAtt[i]?.status || a.name !== originalAtt[i]?.name);
    if (attendanceChanged) out.attendance = attendance;
    return out;
  }, [location, satisfaction, additionalInfo, attendance, report]);

  const hasChanges = Object.keys(payload).length > 0;
  const expired = remaining <= 0;

  const toggleAttendance = (idx: number, status: "present" | "absent") => {
    setAttendance((prev) => prev.map((a, i) => (i === idx ? { ...a, status } : a)));
  };

  return (
    <Modal open={open} onClose={busy ? () => null : onCancel}>
      <div style={{ textAlign: "left", maxWidth: 640, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, textAlign: "left" }}>Edit report</h2>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
              You can edit location, attendance, satisfaction, and notes.
            </p>
          </div>
          <button type="button" onClick={busy ? undefined : onCancel} aria-label="Close"
            style={{ background: "none", border: 0, color: "var(--color-muted)", cursor: busy ? "not-allowed" : "pointer", padding: 4, display: "flex" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* 24-hour window indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: expired ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)",
            border: `1px solid ${expired ? "rgba(220,38,38,0.32)" : "rgba(217,119,6,0.32)"}`,
            marginBottom: 14,
          }}
        >
          <Icon name={expired ? "alert-circle" : "clock"} size={16} style={{ color: expired ? "var(--color-error)" : "var(--color-warning)" }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: expired ? "var(--color-error)" : "var(--color-warning)" }}>
            {expired
              ? "Edit window closed — reports become read-only 24 hours after filing."
              : `Edit window: ${formatRemaining(remaining)} (reports become read-only 24 hours after filing)`}
          </span>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 14 }}>
          <label className="label" style={{ display: "block", marginBottom: 6 }}>Location</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={busy || expired}
            placeholder='e.g. "Church Hall"'
          />
        </div>

        {/* Satisfaction */}
        <div style={{ marginBottom: 14 }}>
          <label className="label" style={{ display: "block", marginBottom: 6 }}>Satisfaction rating</label>
          <div style={{ display: "inline-flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSatisfaction(i)}
                disabled={busy || expired}
                aria-label={`${i} star${i === 1 ? "" : "s"}`}
                style={{ background: "transparent", border: 0, cursor: busy || expired ? "not-allowed" : "pointer", padding: 2 }}
              >
                <Icon
                  name="star"
                  size={22}
                  style={{
                    color: i <= satisfaction ? "var(--color-accent-hover)" : "var(--color-stroke)",
                    fill: i <= satisfaction ? "var(--color-accent-hover)" : "none",
                  }}
                />
              </button>
            ))}
            {satisfaction > 0 && (
              <span style={{ marginLeft: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", alignSelf: "center" }}>
                {satisfaction}/5
              </span>
            )}
          </div>
        </div>

        {/* Additional info */}
        <div style={{ marginBottom: 14 }}>
          <label className="label" style={{ display: "block", marginBottom: 6 }}>Additional notes</label>
          <textarea
            className="input"
            rows={3}
            value={additionalInfo ?? ""}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            disabled={busy || expired}
            placeholder="Any extra notes about this meeting…"
          />
        </div>

        {/* Attendance editor */}
        {attendance.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label className="label" style={{ display: "block", marginBottom: 6 }}>
              Attendance ({attendance.filter((a) => a.status === "present").length} of {attendance.length} present)
            </label>
            <div style={{ border: "1px solid var(--color-stroke)", borderRadius: 10, maxHeight: 240, overflowY: "auto" }}>
              {attendance.map((a, idx) => (
                <div
                  key={`${a.name}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderBottom: idx < attendance.length - 1 ? "1px solid var(--color-stroke-2)" : 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    gap: 10,
                  }}
                >
                  <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                    {a.name}
                    {a.isNew && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-warning)", fontWeight: 700, textTransform: "uppercase" }}>
                        new
                      </span>
                    )}
                  </span>
                  <div className="att-toggle" style={{ display: "inline-flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(idx, "present")}
                      disabled={busy || expired}
                      className={`present${a.status === "present" ? " active" : ""}`}
                      style={{ minWidth: 76 }}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(idx, "absent")}
                      disabled={busy || expired}
                      className={`absent${a.status === "absent" ? " active" : ""}`}
                      style={{ minWidth: 76 }}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="form-actions" style={{ justifyContent: "space-between", borderTop: "1px solid var(--color-stroke)", marginTop: 18, paddingTop: 14 }}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button
            icon="check"
            onClick={() => onConfirm(payload)}
            disabled={busy || !hasChanges || expired}
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
