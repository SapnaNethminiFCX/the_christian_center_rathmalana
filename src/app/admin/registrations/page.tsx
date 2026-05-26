"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useRoleRequestQueue } from "@/application/hooks/useRoleRequestQueue";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";

const PAGE_SIZE = 25;

function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  leader:  "Cell Leader",
  g12:     "G12 Leader",
};

export default function RoleRequestsPage() {
  const Q = useRoleRequestQueue();
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Reset to page 1 when filters change.
  useEffect(() => { setPage(0); }, [Q.status, Q.search]);

  const totalPages = Math.max(1, Math.ceil(Q.items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedItems = Q.items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const onApproveConfirm = async () => {
    if (!approveId) return;
    await Q.approve(approveId, approveNote);
    setApproveId(null);
    setApproveNote("");
  };

  const onRejectConfirm = async () => {
    if (!rejectId) return;
    await Q.reject(rejectId, rejectNote);
    setRejectId(null);
    setRejectNote("");
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0 }}>Role Requests</h1>
            <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
              Members requesting elevated roles — review and decide within 24 hours.
            </p>
          </div>
          <Button variant="secondary" icon="refresh-cw" size="sm" onClick={Q.refetch}>Refresh</Button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => Q.setStatus(s)}
              style={{
                padding: "7px 16px", borderRadius: 9999, border: "1px solid var(--color-stroke)",
                background: Q.status === s ? "#152A24" : "#fff",
                color: Q.status === s ? "#fff" : "var(--color-primary)",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "pending" && Q.status === "pending" && Q.total > 0 && (
                <span style={{ marginLeft: 6, background: "#BCE955", color: "#152A24", borderRadius: 9999, padding: "1px 7px", fontSize: 11 }}>
                  {Q.total}
                </span>
              )}
            </button>
          ))}
          <div style={{ marginLeft: "auto", width: 220 }}>
            <Input
              placeholder="Search by name or email…"
              value={Q.search}
              onChange={(e) => Q.setSearch(e.target.value)}
              style={{ margin: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Queue list */}
      {Q.loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>
          <Icon name="loader" size={24} />
        </div>
      ) : Q.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Icon name="check-circle" size={40} style={{ color: "var(--color-success)", marginBottom: 12 }} />
          <p style={{ fontFamily: "var(--font-body)", color: "var(--color-muted)", margin: 0 }}>
            {Q.status === "pending" ? "All caught up — no pending requests." : `No ${Q.status} requests found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pagedItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 14,
                padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                {/* Name + status + requested role */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "var(--color-primary)" }}>
                    {item.requesterName ?? "—"}
                  </span>
                  <Badge tone={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "error"}>
                    {item.status}
                  </Badge>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, background: "rgba(188,233,85,0.2)", color: "var(--color-primary)", borderRadius: 9999, padding: "2px 8px", fontWeight: 600 }}>
                    → {ROLE_LABEL[item.requestedRole] ?? item.requestedRole}
                  </span>
                </div>

                {/* Current roles */}
                {item.requesterRoles && item.requesterRoles.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)" }}>Current roles:</span>
                    <RoleBadgeStack roles={item.requesterRoles} />
                  </div>
                )}

                {/* Email + phone + date */}
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{item.requesterEmail ?? "—"}</span>
                  {item.requesterPhone && (
                    <span>
                      <Icon name="phone" size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {item.requesterPhone}
                    </span>
                  )}
                  <span style={{ color: "var(--color-muted)" }}>Submitted {relativeTime(item.createdAt)}</span>
                </div>

                {item.decisionNote && (
                  <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-muted)", fontStyle: "italic" }}>
                    Note: &ldquo;{item.decisionNote}&rdquo;
                  </div>
                )}
              </div>

              {item.status === "pending" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button
                    size="sm" variant="secondary" icon="check"
                    disabled={Q.processingId === item.id}
                    onClick={() => setApproveId(item.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm" variant="ghost" icon="x"
                    disabled={Q.processingId === item.id}
                    onClick={() => setRejectId(item.id)}
                    style={{ color: "var(--color-error)" }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}

          {Q.items.length > 0 && (
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
                Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, Q.items.length)}</b> of <b>{Q.items.length}</b>
                {totalPages > 1 && <> · Page <b>{safePage + 1}</b> of <b>{totalPages}</b></>}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="secondary" icon="chevron-left" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve dialog */}
      {approveId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px -10px rgba(21,42,36,0.25)" }}>
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading)", fontSize: 20 }}>Approve role request</h3>
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
              The requester will be notified and gain the requested role immediately.
            </p>
            <Input
              label="Welcome note (optional)"
              placeholder="e.g. Welcome! You can now browse and apply for courses."
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="ghost" onClick={() => { setApproveId(null); setApproveNote(""); }}>Cancel</Button>
              <Button icon="check" onClick={onApproveConfirm} disabled={Q.processingId !== null}>
                {Q.processingId ? "Approving…" : "Confirm approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      {rejectId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px -10px rgba(21,42,36,0.25)" }}>
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading)", fontSize: 20 }}>Reject role request</h3>
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
              The requester will be notified with your reason.
            </p>
            <Input
              label="Reason (required)"
              placeholder="e.g. Please contact the admin office first."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="ghost" onClick={() => { setRejectId(null); setRejectNote(""); }}>Cancel</Button>
              <Button
                icon="x" onClick={onRejectConfirm}
                disabled={!rejectNote.trim() || Q.processingId !== null}
                style={{ background: "var(--color-error)", color: "#fff" }}
              >
                {Q.processingId ? "Rejecting…" : "Confirm reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
