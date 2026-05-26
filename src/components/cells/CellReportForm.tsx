"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AttendanceEditor } from "./AttendanceEditor";
import { SatisfactionStars } from "./SatisfactionStars";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { cellMemberSearchRoles } from "@/lib/cellMemberSearchRoles";
import type { Cell } from "@/lib/mock/cells";
import type { AttendanceEntry, CellReportLanguage } from "@/lib/mock/cellReports";

interface Props {
  cell: Cell;
  onSubmit: (payload: CellReportPayload) => void;
  onCancel: () => void;
}

export interface CellReportPayload {
  meetingDate: string;
  language: CellReportLanguage;
  didMeet: boolean;
  notMetReason?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  leaderPresent: boolean;
  subjectKind: "sunday_sermon" | "other";
  subjectTopic?: string;
  cellType: Cell["type"];
  attendance: AttendanceEntry[];
  visitorCount?: number;
  followUpNotes?: string;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  photos?: File[]; // optional photo files — uploaded separately before POST
}

const STEPS = [
  { id: "met", num: 1, title: "Did the cell meet?", sub: "Yes / no" },
  { id: "basics", num: 2, title: "Meeting basics", sub: "Date, time, language" },
  { id: "subject", num: 3, title: "Subject discussed", sub: "Sunday sermon or other" },
  { id: "attendance", num: 4, title: "Attendance", sub: "Present / absent per member" },
  { id: "visitors", num: 5, title: "Visitors & follow-up", sub: "Optional notes" },
  { id: "satisfaction", num: 6, title: "How did it go?", sub: "1–5 stars" },
  { id: "review", num: 7, title: "Review & submit", sub: "Final check" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function CellReportForm({ cell, onSubmit, onCancel }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [step, setStep] = useState<StepId>("met");
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());

  // Form state
  const [didMeet, setDidMeet] = useState(true);
  const [notMetReason, setNotMetReason] = useState("");
  const [meetingDate, setMeetingDate] = useState(today);
  const [language, setLanguage] = useState<CellReportLanguage>("en");
  const [location, setLocation] = useState(cell.area);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [leaderPresent, setLeaderPresent] = useState(true);
  const [subjectKind, setSubjectKind] = useState<"sunday_sermon" | "other">("sunday_sermon");
  const [subjectTopic, setSubjectTopic] = useState("");
  const [cellType] = useState(cell.type);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>(
    cell.members.map((m) => ({ memberId: m.id, memberName: m.name, status: "present" })),
  );
  const [visitorCount, setVisitorCount] = useState<number | "">("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [satisfaction, setSatisfaction] = useState<1 | 2 | 3 | 4 | 5>(4);

  // Form creator — pulled from the current session. Displayed at the top of
  // the form so the leader knows the report will be attributed to them.
  const sessionUser = useSessionUser();
  const filerName = sessionUser.name || "Current user";
  const sessionRoles = useAppSelector((s) => s.session.user?.roles);
  const attendanceRoleFilter = cellMemberSearchRoles(sessionRoles);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const advance = () => {
    setCompleted((prev) => new Set(prev).add(step));
    if (!isLast) setStep(STEPS[stepIdx + 1].id);
  };
  const back = () => {
    if (!isFirst) setStep(STEPS[stepIdx - 1].id);
  };
  const jump = (id: StepId) => setStep(id);

  const submit = () => {
    onSubmit({
      meetingDate,
      language,
      didMeet,
      notMetReason: didMeet ? undefined : notMetReason || undefined,
      location: didMeet ? location || undefined : undefined,
      startTime: didMeet ? startTime : undefined,
      endTime: didMeet ? endTime : undefined,
      leaderPresent,
      subjectKind,
      subjectTopic: subjectKind === "other" ? subjectTopic || undefined : undefined,
      cellType,
      attendance: didMeet ? attendance : [],
      visitorCount: typeof visitorCount === "number" ? visitorCount : undefined,
      followUpNotes: followUpNotes || undefined,
      satisfaction,
    });
  };

  return (
    <div className="report-form">
      <nav className="report-steps">
        {STEPS.map((s) => {
          const done = completed.has(s.id);
          const active = step === s.id;
          return (
            <button
              type="button"
              key={s.id}
              className={`report-step${active ? " active" : ""}${done ? " done" : ""}`}
              onClick={() => jump(s.id)}
            >
              <span className="num">{done ? <Icon name="check" size={12} /> : s.num}</span>
              <span>
                {s.title}
                <small>{s.sub}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="rf-card">
        {/* Filer pill — surfaces the current session user so the leader can see
            the report will be attributed to them, picked up from the system. */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px 6px 6px",
            background: "var(--color-stroke-2)",
            borderRadius: 9999,
            marginBottom: 18,
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "var(--color-body-green)",
          }}
        >
          <Avatar src={sessionUser.avatar} name={filerName} size="sm" />
          <span>
            Filed by <b style={{ color: "var(--color-primary)" }}>{filerName}</b>
          </span>
        </div>

        {step === "met" && (
          <>
            <h2>Did the cell meet this week?</h2>
            <p className="sub">Pick one. If no, we&apos;ll just ask for a quick reason.</p>
            <div className="rf-yesno">
              <label className={didMeet ? "on" : ""}>
                <input type="radio" checked={didMeet} onChange={() => setDidMeet(true)} /> Yes, we met
              </label>
              <label className={!didMeet ? "on" : ""}>
                <input type="radio" checked={!didMeet} onChange={() => setDidMeet(false)} /> No, we didn&apos;t
              </label>
            </div>
            {!didMeet && (
              <div style={{ marginTop: 16 }}>
                <label className="label">Reason</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={notMetReason}
                  onChange={(e) => setNotMetReason(e.target.value)}
                  placeholder="Leader travelling, public holiday, etc."
                  style={textareaStyle()}
                />
              </div>
            )}
          </>
        )}

        {step === "basics" && (
          <>
            <h2>Meeting basics</h2>
            <p className="sub">When did you meet and in what language?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Date" inGrid>
                  <input type="date" className="input" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={inputStyle()} />
                </Field>
                <Field label="Language" inGrid>
                  <select className="select" value={language} onChange={(e) => setLanguage(e.target.value as CellReportLanguage)} style={inputStyle()}>
                    <option value="en">English</option>
                    <option value="si">සිංහල</option>
                    <option value="ta">தமிழ்</option>
                  </select>
                </Field>
              </div>
              {didMeet && (
                <>
                  <Field label="Location" inGrid>
                    <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle()} />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="Start time" inGrid>
                      <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle()} />
                    </Field>
                    <Field label="End time" inGrid>
                      <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle()} />
                    </Field>
                  </div>
                </>
              )}
            </div>
            <div style={{ marginTop: 20 }}>
              <div className="rf-yesno">
                <label className={leaderPresent ? "on" : ""}>
                  <input type="radio" checked={leaderPresent} onChange={() => setLeaderPresent(true)} /> Leader was present
                </label>
                <label className={!leaderPresent ? "on" : ""}>
                  <input type="radio" checked={!leaderPresent} onChange={() => setLeaderPresent(false)} /> A co-leader filled in
                </label>
              </div>
            </div>
          </>
        )}

        {step === "subject" && (
          <>
            <h2>Subject discussed</h2>
            <p className="sub">What did the cell study?</p>
            <div className="rf-yesno">
              <label className={subjectKind === "sunday_sermon" ? "on" : ""}>
                <input type="radio" checked={subjectKind === "sunday_sermon"} onChange={() => setSubjectKind("sunday_sermon")} /> Sunday sermon
              </label>
              <label className={subjectKind === "other" ? "on" : ""}>
                <input type="radio" checked={subjectKind === "other"} onChange={() => setSubjectKind("other")} /> Other topic
              </label>
            </div>
            {subjectKind === "other" && (
              <div style={{ marginTop: 16 }}>
                <Field label="Topic"><input className="input" value={subjectTopic} onChange={(e) => setSubjectTopic(e.target.value)} placeholder="e.g. Prayer & fasting" style={inputStyle()} /></Field>
              </div>
            )}
            <p style={{ marginTop: 18, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>
              Cell type stays as <b>{cell.type}</b> — change it from cell settings if needed.
            </p>
          </>
        )}

        {step === "attendance" && (
          <>
            <h2>Attendance</h2>
            <p className="sub">Toggle present / absent for each member. Add visitors if any.</p>
            {didMeet ? (
              <AttendanceEditor attendance={attendance} onChange={setAttendance} roleFilter={attendanceRoleFilter} />
            ) : (
              <p style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                Attendance is skipped because the cell didn&apos;t meet.
              </p>
            )}
          </>
        )}

        {step === "visitors" && (
          <>
            <h2>Visitors &amp; follow-up</h2>
            <p className="sub">Optional notes. Helpful for G12 leaders reviewing your cell.</p>
            <Field label="Number of visitors">
              <input
                type="number"
                min={0}
                className="input"
                value={visitorCount}
                onChange={(e) => setVisitorCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                style={inputStyle()}
              />
            </Field>
            <Field label="Follow-up notes">
              <textarea
                className="textarea"
                rows={4}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Anyone who needs a personal visit, prayer request, etc."
                style={textareaStyle()}
              />
            </Field>
          </>
        )}

        {step === "satisfaction" && (
          <>
            <h2>How did it go?</h2>
            <p className="sub">Your honest rating helps us spot cells that need support.</p>
            <SatisfactionStars value={satisfaction} onChange={setSatisfaction} size={36} />
          </>
        )}

        {step === "review" && (
          <>
            <h2>Review &amp; submit</h2>
            <p className="sub">Quick recap before you send it to your G12 leader.</p>
            <ReviewSummary
              cell={cell}
              filerName={filerName}
              didMeet={didMeet}
              notMetReason={notMetReason}
              meetingDate={meetingDate}
              language={language}
              location={location}
              startTime={startTime}
              endTime={endTime}
              leaderPresent={leaderPresent}
              subjectKind={subjectKind}
              subjectTopic={subjectTopic}
              attendance={attendance}
              visitorCount={visitorCount}
              satisfaction={satisfaction}
            />
          </>
        )}

        <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <div style={{ display: "flex", gap: 10 }}>
            {!isFirst && (
              <Button variant="secondary-light" icon="arrow-left" onClick={back}>Back</Button>
            )}
            {isLast ? (
              <Button onClick={submit} iconAfter="check">Submit report</Button>
            ) : (
              <Button onClick={advance} iconAfter="arrow-right">Next</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--color-stroke)",
    borderRadius: 10,
    fontFamily: "var(--font-body)",
    fontSize: 14,
    color: "var(--color-primary)",
    background: "#fff",
  };
}
function textareaStyle(): React.CSSProperties {
  return { ...inputStyle(), resize: "vertical" };
}

function Field({
  label,
  children,
  inGrid = false,
}: {
  label: string;
  children: React.ReactNode;
  /** Set to true when this Field is a direct grid/flex child — the parent
   *  controls vertical spacing via gap, so the Field shouldn't add its own
   *  margins. We also kill the global `.field + .field { margin-top: 14px }`
   *  rule that otherwise pushes the right-column Field down by 14 px, leaving
   *  the labels visibly misaligned across the grid row. */
  inGrid?: boolean;
}) {
  const style: React.CSSProperties = inGrid
    ? { marginTop: 0, marginBottom: 0 }
    : { marginBottom: 14 };
  return (
    <div className="field" style={style}>
      <label className="label" style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-body-green)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReviewSummary(props: {
  cell: Cell;
  filerName: string;
  didMeet: boolean;
  notMetReason: string;
  meetingDate: string;
  language: CellReportLanguage;
  location: string;
  startTime: string;
  endTime: string;
  leaderPresent: boolean;
  subjectKind: "sunday_sermon" | "other";
  subjectTopic: string;
  attendance: AttendanceEntry[];
  visitorCount: number | "";
  satisfaction: number;
}) {
  const present = props.attendance.filter((a) => a.status === "present").length;
  const total = props.attendance.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
      <SummaryRow k="Cell" v={props.cell.name} />
      <SummaryRow k="Filed by" v={props.filerName} />
      <SummaryRow k="Date" v={`${props.meetingDate} · ${props.language.toUpperCase()}`} />
      <SummaryRow k="Did meet" v={props.didMeet ? "Yes" : `No — ${props.notMetReason || "(no reason)"}`} />
      {props.didMeet && (
        <>
          <SummaryRow k="Location" v={props.location || "—"} />
          <SummaryRow k="Time" v={`${props.startTime} – ${props.endTime}`} />
          <SummaryRow k="Leader present" v={props.leaderPresent ? "Yes" : "No"} />
          <SummaryRow k="Subject" v={props.subjectKind === "sunday_sermon" ? "Sunday sermon" : props.subjectTopic || "(other)"} />
          <SummaryRow k="Attendance" v={`${present} / ${total} present`} />
        </>
      )}
      {typeof props.visitorCount === "number" && <SummaryRow k="Visitors" v={String(props.visitorCount)} />}
      <SummaryRow k="Satisfaction" v={`${props.satisfaction} / 5`} />
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid var(--color-stroke-2)" }}>
      <span style={{ minWidth: 120, color: "var(--color-muted)", fontSize: 12 }}>{k}</span>
      <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>{v}</span>
    </div>
  );
}
