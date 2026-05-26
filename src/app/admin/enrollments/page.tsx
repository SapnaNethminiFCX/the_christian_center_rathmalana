"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RowMenu } from "@/components/ui/RowMenu";
import { RejectModal } from "@/components/enrollment/RejectModal";
import { EnrollmentProfileDialog } from "@/components/admin/EnrollmentProfileDialog";
import {
  useAdminEnrollmentQueue,
  isApproved,
  isRejected,
  type EnrollmentItem,
} from "@/application/hooks/useAdminEnrollmentQueue";

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function stateBadge(r: EnrollmentItem) {
  if (isApproved(r.state)) return <Badge tone="success">Approved</Badge>;
  if (isRejected(r.state)) return <Badge tone="error">Rejected</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

export default function AdminEnrollmentsPage() {
  const Q = useAdminEnrollmentQueue();
  const [rejectTarget, setRejectTarget] = useState<{ id: string; label: string } | null>(null);
  const [viewing, setViewing] = useState<EnrollmentItem | null>(null);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            Enrollments <span className="page-sub">· course-access approvals</span>
          </h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{Q.total}</b> total ·{" "}
            <b style={{ color: "var(--color-primary)" }}>{Q.pendingCount}</b> pending ·{" "}
            <b style={{ color: "var(--color-primary)" }}>{Q.approvedCount}</b> approved ·{" "}
            <b style={{ color: "var(--color-primary)" }}>{Q.rejectedCount}</b> rejected.
            Approving unlocks course materials for the student.
          </div>
        </div>
        <Button variant="secondary" icon="refresh-cw" onClick={Q.refresh}>
          Refresh
        </Button>
      </div>

      {/* Flow strip */}
      <div className="flow-strip">
        <div className="flow-step done">
          <i><Icon name="check" size={12} /></i> Sign-up <small>Approved</small>
        </div>
        <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
        <div className="flow-step active">
          <i>2</i> Course request <small>Awaits admin approval</small>
        </div>
        <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
        <div className="flow-step">
          <i>3</i> Studying <small>Course materials unlocked</small>
        </div>
      </div>

      {/* Search + status filter */}
      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by student name, email or course..."
            value={Q.search}
            onChange={(e) => Q.setSearch(e.target.value)}
          />
        </div>
        <div className="audit-cats">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              className={`chip${Q.statusFilter === s ? " active" : ""}`}
              onClick={() => Q.setStatusFilter(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "pending"  && Q.pendingCount  > 0 && ` (${Q.pendingCount})`}
              {s === "approved" && Q.approvedCount > 0 && ` (${Q.approvedCount})`}
              {s === "rejected" && Q.rejectedCount > 0 && ` (${Q.rejectedCount})`}
              {s === "all" && ` (${Q.total})`}
            </button>
          ))}
        </div>
      </div>

      <div className="tbl-card">
        <div className="tbl-bar" style={{ flexWrap: "wrap" }}>
          <span className="live"><i />Live data</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge--warning">{Q.pendingCount} Pending</span>
            <span className="badge badge--success">{Q.approvedCount} Approved</span>
            <span className="badge badge--error">{Q.rejectedCount} Rejected</span>
          </div>
        </div>

        <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "32%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ minWidth: 130 }} />
            <col style={{ minWidth: 100 }} />
            <col style={{ minWidth: 140 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Requested</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {Q.loading && Q.items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!Q.loading && Q.items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <h3>No enrollments found</h3>
                    <p>{Q.search ? "Try a different search term." : "No pending enrollments right now."}</p>
                  </div>
                </td>
              </tr>
            )}
            {Q.items.map((r) => {
              const pending = Q.isRowPending(r);
              const title = r.courseTitle;
              const label = title ?? r.courseId;
              return (
                <tr key={r.id}>
                  <td style={{ maxWidth: 280 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar
                        size="sm"
                        name={r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentUid}
                        src={r.student?.profilePhotoUrl ?? undefined}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {r.student ? (
                          <>
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.student.firstName} {r.student.lastName}
                            </div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.student.email}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-muted)" }}>
                            {r.studentUid.slice(0, 14)}…
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    {title ? (
                      <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={title}>
                        {title}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontStyle: "italic", color: "var(--color-muted)", fontSize: 13, fontFamily: "var(--font-body)" }}>
                          <Icon name="alert-circle" size={13} />
                          Course unavailable
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                          may be deleted or archived
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(r.createdAt)}</td>
                  <td>{stateBadge(r)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="eye"
                        onClick={() => setViewing(r)}
                        title="View student profile"
                      >
                        View
                      </Button>
                      {pending ? (
                        <RowMenu
                          ariaLabel={`Actions for enrollment ${r.id}`}
                          items={[
                            { label: "View profile", ico: "eye",        onClick: () => setViewing(r) },
                            { label: "Approve",      ico: "check-circle", onClick: () => Q.approve(r.id) },
                            { label: "Reject",       ico: "x-circle",     onClick: () => setRejectTarget({ id: r.id, label }), danger: true },
                          ]}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(Q.hasNext || Q.hasPrev) && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid var(--color-stroke)",
          }}>
            <Button size="sm" variant="secondary" icon="chevron-left" disabled={!Q.hasPrev} onClick={Q.prevPage}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={!Q.hasNext} onClick={Q.nextPage}>
              Next
            </Button>
          </div>
        )}
      </div>

      <RejectModal
        open={!!rejectTarget}
        name={rejectTarget?.label ?? ""}
        onConfirm={(reason) => {
          if (rejectTarget) Q.reject(rejectTarget.id, reason);
          setRejectTarget(null);
        }}
        onCancel={() => setRejectTarget(null)}
      />

      <EnrollmentProfileDialog
        enrollment={viewing}
        onClose={() => setViewing(null)}
        onApprove={(id) => {
          Q.approve(id);
          setViewing(null);
        }}
        onReject={(id, label) => {
          setViewing(null);
          setRejectTarget({ id, label });
        }}
      />
    </div>
  );
}
