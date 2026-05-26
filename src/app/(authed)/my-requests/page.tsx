"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRoleRequests, type RoleRequest } from "@/application/hooks/useRoleRequests";
import { useEnrollments, type Enrollment } from "@/application/hooks/useEnrollments";

const PAGE_SIZE = 10;

/**
 * My Requests — surface adapts to the user's existing roles.
 *
 * - **Pure Member** (no `student` role): shows role requests from GET /role-requests/mine
 * - **Member + Student** (has `student` role): shows enrollment requests (mock — replaced in Sprint 5)
 */

type BadgeTone = "warning" | "success" | "error" | "archive";

const STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  pending:   { tone: "warning",  label: "Pending" },
  approved:  { tone: "success",  label: "Approved" },
  rejected:  { tone: "error",    label: "Rejected" },
  withdrawn: { tone: "archive",  label: "Withdrawn" },
};

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  leader:  "Cell Leader",
  g12:     "G12 Leader",
};

function relativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MyRequestsPage() {
  const user = useAppSelector((s) => s.session.user);
  const hasStudent = user?.roles?.includes("student") ?? false;

  // Role requests — real API (GET /role-requests/mine)
  const { items: roleRequests, loading: roleLoading } = useRoleRequests();

  // Enrollment requests — real API (GET /enrollments/mine)
  const { items: allEnrollments, loading: enrollLoading } = useEnrollments();
  const enrollmentRequests = allEnrollments
    .filter((e) => (e.status ?? e.state) !== "withdrawn")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
          My Requests
        </h1>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          {hasStudent
            ? "Track every course enrolment you've applied for — admins review each per course."
            : "Track the status of every role request you've submitted."}
        </p>
      </header>

      {hasStudent
        ? <EnrollmentRequestsList items={enrollmentRequests} loading={enrollLoading} />
        : <RoleRequestsList items={roleRequests} loading={roleLoading} />}
    </div>
  );
}

/* ─── Inline pagination footer — shared by both list types ───────── */
function PaginationFooter({ total, page, totalPages, onPage }: {
  total: number;
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 4px 4px",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--color-body-green)",
      flexWrap: "wrap",
      gap: 10,
    }}>
      <span>
        Showing <b>{page * PAGE_SIZE + 1}</b>–<b>{Math.min((page + 1) * PAGE_SIZE, total)}</b> of <b>{total}</b>
        {totalPages > 1 && <> · Page <b>{page + 1}</b> of <b>{totalPages}</b></>}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="secondary" icon="chevron-left" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={page >= totalPages - 1} onClick={() => onPage(Math.min(totalPages - 1, page + 1))}>
          Next
        </Button>
      </div>
    </div>
  );
}

/* ─── Role-request list (pure Member) ────────────────────────────── */
function RoleRequestsList({ items, loading }: { items: RoleRequest[]; loading: boolean }) {
  const hasPending = items.some((r) => r.status === "pending");
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>
        <Icon name="loader" size={20} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState icon="file-text" title="No requests yet"
          message="Apply to become a Student to access the Bible School module." />
        {/* Only show Apply button when there are no requests at all */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/apply/student" className="btn btn--primary">
            <Icon name="arrow-right" size={16} /> Apply now
          </Link>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {paged.map((r) => {
        const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
        return (
          <div key={r.id} style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, color: "var(--color-primary)" }}>
                  {ROLE_LABEL[r.requestedRole] ?? r.requestedRole} Role Request
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </div>
              {r.decisionNote && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: r.status === "rejected" ? "var(--color-error-deep)" : "var(--color-body-green)", marginTop: 4, padding: "8px 12px", background: r.status === "rejected" ? "var(--color-error-bg)" : "var(--color-light-gray)", borderRadius: 8 }}>
                  <Icon name="message-square" size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {r.decisionNote}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                Submitted {relativeTime(r.createdAt)}
              </span>
              {r.decidedAt && r.decisionByName && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>
                  Decided {relativeTime(r.decidedAt)} by {r.decisionByName}
                </span>
              )}
              {r.status === "rejected" && !hasPending && (
                <Link href="/apply/student" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                  Apply again →
                </Link>
              )}
            </div>
          </div>
        );
      })}
      <PaginationFooter total={items.length} page={safePage} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

/* ─── Enrollment-request list (Member + Student) — real API ──────── */
function EnrollmentRequestsList({ items, loading }: { items: Enrollment[]; loading: boolean }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}><Icon name="loader" size={20} /></div>;
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState icon="book-open" title="No course enrolments yet"
          message="When you apply to enrol in a Bible School course, the request will appear here." />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/browse-courses" className="btn btn--primary">
            <Icon name="arrow-right" size={16} /> Browse Bible School courses
          </Link>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {paged.map((r) => {
        const enrollStatus = (r.status ?? r.state ?? "pending") as string;
        const badge = STATUS_BADGE[enrollStatus] ?? STATUS_BADGE.pending;
        return (
          <div key={r.id} style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14, padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, color: "var(--color-primary)" }}>
                  {r.courseName ?? r.courseId}
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </div>
              {r.batchName && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                  <Icon name="calendar-clock" size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {r.batchName}
                </div>
              )}
              {enrollStatus === "rejected" && r.decisionNote && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-error-deep)", marginTop: 8, padding: "8px 12px", background: "var(--color-error-bg)", borderRadius: 8 }}>
                  <Icon name="alert-circle" size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {r.decisionNote}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                Submitted {relativeTime(r.createdAt)}
              </span>
              {enrollStatus === "approved" && (
                <Link href="/my-courses" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-success-deep)", fontWeight: 600, textDecoration: "none" }}>
                  Go to course →
                </Link>
              )}
            </div>
          </div>
        );
      })}
      <PaginationFooter total={items.length} page={safePage} totalPages={totalPages} onPage={setPage} />
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Button variant="ghost" icon="arrow-right" onClick={() => (window.location.href = "/browse-courses")}>
          Apply to another course
        </Button>
      </div>
    </div>
  );
}
