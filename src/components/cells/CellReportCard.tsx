"use client";

import { Icon } from "@/components/ui/Icon";
import type { CellReport } from "@/lib/mock/cellReports";

interface Props {
  report: CellReport;
  onClick?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function CellReportCard({ report, onClick }: Props) {
  const present = report.attendance.filter((a) => a.status === "present").length;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      className={`report-card${onClick ? "" : " readonly"}`}
      onClick={onClick}
      style={onClick ? { width: "100%", textAlign: "left", border: "1px solid var(--color-stroke)" } : undefined}
    >
      <div>
        <div className="title">
          {report.didMeet
            ? `Meeting on ${formatDate(report.meetingDate)}`
            : `Did not meet — ${formatDate(report.meetingDate)}`}
          {report.voided && (
            <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error-deep)", textTransform: "uppercase" }}>
              Voided
            </span>
          )}
        </div>
        <div className="meta">
          <span>
            <Icon name="user" size={11} /> Filed by {report.filedBy}
          </span>
          {report.didMeet && report.attendance.length > 0 && (
            <span>
              <Icon name="users" size={11} /> {present} / {report.attendance.length} present
            </span>
          )}
          {report.subjectKind === "other" && report.subjectTopic && (
            <span>
              <Icon name="book-open" size={11} /> {report.subjectTopic}
            </span>
          )}
          {report.subjectKind === "sunday_sermon" && (
            <span>
              <Icon name="book-open" size={11} /> Sunday sermon
            </span>
          )}
        </div>
      </div>
      <div className="right">
        <span style={{ display: "inline-flex", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon
              key={i}
              name="star"
              size={12}
              style={{ color: i <= report.satisfaction ? "var(--color-accent)" : "var(--color-stroke)" }}
            />
          ))}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", textTransform: "uppercase" }}>
          {report.language}
        </span>
      </div>
    </Wrapper>
  );
}
