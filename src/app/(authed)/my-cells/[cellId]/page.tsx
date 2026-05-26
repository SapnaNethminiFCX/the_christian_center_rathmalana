"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCell } from "@/application/hooks/useCell";
import { useCellReports, type CellReport } from "@/application/hooks/useCellReports";

const TYPE_LABEL: Record<"g12" | "care" | "children" | "outreach", string> = {
  g12: "G12",
  care: "Care",
  children: "Children",
  outreach: "Outreach",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function MyCellDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cellId = (params?.cellId as string) ?? "";
  const { cell, loading } = useCell(cellId || undefined);
  const { reports } = useCellReports(cellId || undefined);

  if (loading) return <div className="page" style={{ textAlign: "center", padding: 48 }}><Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} /></div>;

  if (!cell) {
    return (
      <div className="page">
        <EmptyState icon="alert-circle" title="Cell not found" message="This cell may have been archived or you're no longer a member." />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/my-cells" className="btn btn--secondary-light">
            <Icon name="arrow-left" size={14} /> Back to My Cells
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push("/my-cells")}>
        Back to My Cells
      </Button>

      <div className="cd-header" style={{ marginTop: 12 }}>
        <span className={`cell-type ${cell.type}`} style={{ position: "relative", zIndex: 1 }}>
          {TYPE_LABEL[cell.type]} cell
        </span>
        <h1>{cell.name}</h1>
        <div className="meta">
          <span>
            <Icon name="map-pin" size={14} /> {cell.area}
          </span>
          <span>
            <Icon name="user" size={14} /> Led by {cell.leaderName}
          </span>
          {cell.g12LeaderName && (
            <span>
              <Icon name="share-2" size={14} /> G12: {cell.g12LeaderName}
            </span>
          )}
          <span>
            <Icon name="users" size={14} /> {cell.memberCount} members
          </span>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>
          Members
        </h2>
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-stroke)",
            borderRadius: 14,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {(cell.members ?? []).map((m) => (
            <MemberRow key={m.uid ?? String(m)} uid={m.uid ?? String(m)} displayName={m.displayName ?? String(m)} isLeader={(m.uid ?? String(m)) === cell.leaderUid} />
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>
          Past reports
        </h2>
        {reports.length === 0 ? (
          <EmptyState icon="file-text" title="No reports yet" message="Your leader hasn't filed any reports for this cell yet." />
        ) : (
          <div>
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MemberRow({ uid, displayName, isLeader }: { uid: string; displayName: string; isLeader: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 14px", background: "#FAFAFA", borderRadius: 10 }}>
      <Avatar name={displayName} size="sm" />
      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--color-primary)" }}>
        {displayName}
      </div>
      {isLeader && <span className="cell-type g12">Leader</span>}
    </div>
  );
}

function ReportRow({ report }: { report: CellReport }) {
  const presentCount = (report.attendance ?? []).filter((a) => a.status === "present").length;
  return (
    <div className="report-card readonly">
      <div>
        <div className="title">
          {report.didMeet
            ? `Meeting on ${formatDate(report.date)}`
            : `Did not meet — ${formatDate(report.date)}`}
        </div>
        <div className="meta">
          {report.didMeet && (report.attendance?.length ?? 0) > 0 && (
            <span>
              <Icon name="users" size={11} /> {presentCount} / {report.attendance?.length} present
            </span>
          )}
          {report.subjectDiscussed === "other" && report.otherSubjectReason && (
            <span>
              <Icon name="book-open" size={11} /> {report.otherSubjectReason}
            </span>
          )}
        </div>
      </div>
      <div className="right">
        <span style={{ display: "inline-flex", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon key={i} name="star" size={12}
              style={{ color: i <= (report.satisfactionRate ?? 0) ? "var(--color-accent)" : "var(--color-stroke)" }} />
          ))}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", textTransform: "uppercase" }}>
          {report.language}
        </span>
      </div>
    </div>
  );
}
