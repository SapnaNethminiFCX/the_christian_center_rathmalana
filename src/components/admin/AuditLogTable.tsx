"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { useAuditLog, type AuditFilters } from "@/application/hooks/useAuditLog";
import { cn } from "@/lib/cn";

const CATS = ["All", "auth", "enrollment", "cell", "role", "course", "security", "other"] as const;
type Cat = (typeof CATS)[number];
type DateRange = "7" | "30" | "90" | "all";

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function isoFromDateRange(range: DateRange): string | undefined {
  if (range === "all") return undefined;
  const days = parseInt(range, 10);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  if (isNaN(d) || d === 0) return "—";
  const diff = Date.now() - d;
  if (diff < 0) return new Date(iso).toLocaleString("en-GB");
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function categoryTone(cat: string): "warning" | "success" | "info" {
  const c = cat.toLowerCase();
  if (c === "security" || c === "auth") return "warning";
  if (c === "enrollment" || c === "approvals" || c === "role") return "success";
  return "info";
}

interface Props {
  /** When set, scopes the log to a single user via GET /users/:uid/audit-log */
  userUid?: string;
}

export function AuditLogTable({ userUid }: Props = {}) {
  const dispatch = useAppDispatch();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const filters: AuditFilters = useMemo(
    () => ({
      limit: 25,
      from: isoFromDateRange(dateRange),
      category: cat === "All" ? undefined : cat,
    }),
    [dateRange, cat],
  );

  const { entries, total, nextCursor, loading, error, fetchPage } = useAuditLog({ userUid, filters });

  // Client-side text search across already-loaded entries.
  const filtered = useMemo(() => {
    if (!q.trim()) return entries;
    const needle = q.trim().toLowerCase();
    return entries.filter((r) =>
      (r.actorEmail ?? "").toLowerCase().includes(needle) ||
      r.action.toLowerCase().includes(needle) ||
      (r.targetId ?? "").toLowerCase().includes(needle) ||
      (r.actorUid ?? "").toLowerCase().includes(needle),
    );
  }, [entries, q]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>
              {loading && entries.length === 0 ? "…" : total}
            </b>{" "}
            total entries · {entries.length} loaded
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Icon
              name="calendar"
              size={15}
              style={{ position: "absolute", left: 12, pointerEvents: "none", color: "var(--color-body-green)" }}
            />
            <select
              className="input"
              style={{ height: 38, paddingLeft: 34, paddingRight: 16, width: "auto", fontSize: 14 }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search actor, action, target or UID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="audit-cats">
          {CATS.map((c) => (
            <button
              key={c}
              className={cn("chip", cat === c && "active")}
              onClick={() => setCat(c)}
            >
              {c === "All" ? c : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          marginBottom: 16,
          background: "rgba(220, 38, 38, 0.08)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          borderRadius: 12,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--color-error, #DC2626)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}>
          <Icon name="alert-triangle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="tbl-card">
        <table className="tbl">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Category</th>
              <th>Target</th>
              <th>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && entries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && !error && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--color-muted)" }}>
                  No log entries match.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }} title={new Date(r.when).toLocaleString()}>
                  {formatRelative(r.when)}
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontFamily: "var(--font-body)" }}>
                    {r.actorEmail || (r.actorUid.length > 14 ? r.actorUid.slice(0, 14) + "…" : r.actorUid)}
                  </div>
                  {r.actorEmail && (
                    <div className="muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                      {r.actorUid.length > 14 ? r.actorUid.slice(0, 14) + "…" : r.actorUid}
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{r.action}</td>
                <td>
                  <Badge tone={categoryTone(r.category)}>{r.category}</Badge>
                </td>
                <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  {r.targetType && r.targetId
                    ? `${r.targetType}/${r.targetId.length > 10 ? r.targetId.slice(0, 10) + "…" : r.targetId}`
                    : "—"}
                </td>
                <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {r.requestId ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(r.requestId ?? "").catch(() => {});
                        dispatch(pushToast({ tone: "success", title: "Request ID copied" }));
                      }}
                      title={r.requestId}
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        color: "inherit",
                        font: "inherit",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {r.requestId.slice(0, 8)}…
                      <Icon name="copy" size={11} />
                    </button>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && !loading && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Button variant="secondary" icon="chevron-down" onClick={() => fetchPage(false)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
