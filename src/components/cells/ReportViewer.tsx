"use client";

import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { SatisfactionStars } from "./SatisfactionStars";
import type { CellReport } from "@/application/hooks/useCellReports";

interface Props {
  report: CellReport;
  /** Optional cell name to display alongside the date. */
  cellName?: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(t?: string | null): string {
  if (!t) return "—";
  // Accepts "19:00" (HH:MM) or full ISO datetime
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function ReportViewer({ report, cellName }: Props) {
  const attendance = report.attendance ?? [];
  const present = attendance.filter((a) => a.status === "present");
  const absent = attendance.filter((a) => a.status === "absent");

  const presentLabel = (a: typeof attendance[number]) =>
    a.isNew ? `${a.name} (visitor)` : a.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {report.voided && (
        <div
          style={{
            background: "var(--color-error-bg)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--color-error-deep)",
          }}
        >
          <Icon name="alert-circle" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <b>This report has been voided.</b>
            {(() => {
              const reason = (report as unknown as { voidReason?: string; voidedReason?: string }).voidReason
                ?? (report as unknown as { voidedReason?: string }).voidedReason;
              return reason ? <div style={{ marginTop: 4 }}>Reason: {reason}</div> : null;
            })()}
          </div>
        </div>
      )}

      <Section title="Overview">
        <Row k="Meeting date" v={formatDate(report.date)} />
        {cellName && <Row k="Cell" v={cellName} />}
        <Row
          k="Did meet?"
          v={report.didMeet ? "Yes" : `No — ${report.noMeetReason ?? "no reason given"}`}
        />
        {report.language && <Row k="Language" v={report.language.toUpperCase()} />}
        <Row k="Filed" v={formatDate(report.createdAt)} />
      </Section>

      {report.didMeet && (
        <Section title="Meeting basics">
          {report.location && <Row k="Location" v={report.location} />}
          {(report.timeStarted || report.timeEnded) && (
            <Row k="Time" v={`${formatTime(report.timeStarted)} – ${formatTime(report.timeEnded)}`} />
          )}
          <Row k="Leader present" v={report.leaderPresent ? "Yes" : "No (co-leader filled in)"} />
          {!report.leaderPresent && report.conductedByIfAbsent && (
            <Row k="Conducted by" v={report.conductedByIfAbsent} />
          )}
        </Section>
      )}

      <Section title="Subject">
        <Row k="Type" v={report.subjectDiscussed === "sunday_sermon" ? "Sunday sermon" : "Other"} />
        {report.otherSubjectReason && <Row k="Topic" v={report.otherSubjectReason} />}
        {report.cellType && (
          <Row k="Cell type" v={<Badge tone="info">{report.cellType.toUpperCase()}</Badge>} />
        )}
      </Section>

      {report.didMeet && attendance.length > 0 && (
        <Section title={`Attendance — ${present.length} / ${attendance.length} present`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <AttList title="Present" people={present.map(presentLabel)} tone="success" />
            <AttList title="Absent" people={absent.map((a) => a.name)} tone="error" />
          </div>
          {report.contactedAbsentees && (
            <div style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
              Contacted absentees: <b style={{ color: "var(--color-primary)" }}>{report.contactedAbsentees}</b>
              {report.absenteeNotes && (
                <div style={{ marginTop: 6, padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, color: "var(--color-body-green)" }}>
                  {report.absenteeNotes}
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {(report.additionalVisitors || report.childrenCount || report.additionalInfo) && (
        <Section title="Visitors & follow-up">
          {typeof report.additionalVisitors === "number" && report.additionalVisitors > 0 && (
            <Row k="Visitors" v={String(report.additionalVisitors)} />
          )}
          {typeof report.childrenCount === "number" && report.childrenCount > 0 && (
            <Row k="Children" v={String(report.childrenCount)} />
          )}
          {report.additionalInfo && (
            <div style={{ marginTop: 6, padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)", whiteSpace: "pre-wrap" }}>
              {report.additionalInfo}
            </div>
          )}
        </Section>
      )}

      {typeof report.satisfactionRate === "number" && (
        <Section title="Satisfaction">
          <SatisfactionStars value={report.satisfactionRate as 1 | 2 | 3 | 4 | 5} readonly />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, padding: 20 }}>
      <h3 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--color-stroke-2)", fontFamily: "var(--font-body)", fontSize: 14 }}>
      <span style={{ minWidth: 140, color: "var(--color-muted)", fontSize: 12 }}>{k}</span>
      <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function AttList({ title, people, tone }: { title: string; people: string[]; tone: "success" | "error" }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: tone === "success" ? "var(--color-success-deep)" : "var(--color-error-deep)", marginBottom: 6 }}>
        {title} ({people.length})
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-primary)" }}>
        {people.length === 0 ? (
          <li style={{ color: "var(--color-muted)" }}>—</li>
        ) : (
          people.map((p, i) => <li key={`${p}-${i}`} style={{ padding: "3px 0" }}>{p}</li>)
        )}
      </ul>
    </div>
  );
}
