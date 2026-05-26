"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useNotifications } from "@/application/hooks/useNotifications";

const PAGE_SIZE = 25;

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return `${days} d ago`;
}

function categoryIcon(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("admin") || c.includes("promoted")) return "arrow-up-circle";
  if (c.includes("approved")) return "check-circle";
  if (c.includes("rejected") || c.includes("suspended")) return "alert-triangle";
  if (c.includes("registration")) return "user-plus";
  if (c.includes("enrollment")) return "clipboard-list";
  return "bell";
}

function categoryTone(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("rejected") || c.includes("suspended")) return "#D97706";
  if (c.includes("approved")) return "#3DB55F";
  return "#152A24";
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [page, setPage] = useState(0);

  const handleClick = (id: string, link: string | null | undefined, read: boolean) => {
    if (!read) markRead(id);
    if (link) router.push(link);
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedItems = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>
              {loading && items.length === 0 ? "…" : unreadCount}
            </b>{" "}
            unread.
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" icon="check" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-body-green)" }}>
          <Icon name="loader" size={22} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-body)" }}>Loading notifications…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty" style={{ padding: "48px 16px" }}>
          <Icon name="check-circle" size={28} style={{ opacity: 0.4, marginBottom: 12 }} />
          <h3>You&apos;re all caught up</h3>
          <p>No notifications yet — they&apos;ll show up here when something needs your attention.</p>
        </div>
      ) : (
        <div className="activity">
          {pagedItems.map((n) => {
            const clickable = !n.read || !!n.link;
            return (
              <div
                className="row"
                key={n.id}
                onClick={() => clickable && handleClick(n.id, n.link, n.read)}
                style={{
                  cursor: clickable ? "pointer" : "default",
                  background: n.read ? "transparent" : "rgba(188,233,85,0.06)",
                }}
              >
                <div className="ico" style={{ color: categoryTone(n.category) }}>
                  <Icon name={categoryIcon(n.category)} size={16} />
                </div>
                <div className="body">
                  <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {n.title}
                    {(n.duplicateIds?.length ?? 0) > 0 && (
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        background: "var(--color-light-gray)",
                        color: "var(--color-body-green)",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        fontWeight: 600,
                      }}>
                        ×{(n.duplicateIds?.length ?? 0) + 1}
                      </span>
                    )}
                  </div>
                  <div className="meta">{n.body}</div>
                </div>
                <span className="when">{formatRelative(n.createdAt)}</span>
              </div>
            );
          })}

          {items.length > 0 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 4px 4px",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--color-body-green)",
              flexWrap: "wrap",
              gap: 10,
            }}>
              <span>
                Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, items.length)}</b> of <b>{items.length}</b>
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
    </div>
  );
}
