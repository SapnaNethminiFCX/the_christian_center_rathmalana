"use client";

import { Icon } from "@/components/ui/Icon";

/**
 * V2 per-user audit timeline. Mock data only — when the backend exposes
 * GET /audit?userUid=… this becomes a real fetch.
 *
 * Mirrors the prototype's `.activity` list pattern but vertically dense
 * with a left rail and per-row icon tokens.
 */

interface AuditEntry {
  id: string;
  ico: string;
  category: "auth" | "role" | "enrolment" | "progress" | "profile";
  title: string;
  detail?: string;
  actor?: string;
  at: string; // ISO
}

const CATEGORY_TONE: Record<AuditEntry["category"], { bg: string; color: string }> = {
  auth:       { bg: "rgba(21,42,36,0.08)",   color: "var(--color-primary)" },
  role:       { bg: "rgba(188,233,85,0.18)", color: "var(--color-primary-2)" },
  enrolment:  { bg: "var(--color-info-bg)",  color: "var(--color-info)" },
  progress:   { bg: "var(--color-success-bg)", color: "var(--color-success-deep)" },
  profile:    { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  userName: string;
  // The userUid is taken so a future real implementation can scope by it.
  userUid: string;
}

export function UserAuditTimeline({ userName, userUid: _userUid }: Props) {
  // Mock entries — every user-detail page renders the same set for now.
  const entries: AuditEntry[] = [
    {
      id: "e1",
      ico: "log-in",
      category: "auth",
      title: "Signed in",
      detail: "Web · Chrome on Windows",
      at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: "e2",
      ico: "user-check",
      category: "role",
      title: `Granted ${userName} the Student role`,
      detail: "Approved from Role Requests queue",
      actor: "Janaka Liyanage",
      at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: "e3",
      ico: "book-open",
      category: "enrolment",
      title: "Enrolled in Foundations of Faith · Intake 12 · Q2 2026",
      detail: "Per-course approval granted",
      actor: "Janaka Liyanage",
      at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
    {
      id: "e4",
      ico: "play-circle",
      category: "progress",
      title: "Completed Lesson 03 — Faith & works",
      detail: "Course: Foundations of Faith",
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: "e5",
      ico: "user",
      category: "profile",
      title: "Updated profile photo",
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      id: "e6",
      ico: "user-plus",
      category: "auth",
      title: "Account created (Member)",
      detail: "Registration completed — no approval needed in V2",
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p
        className="settings-sub"
        style={{ marginTop: 0, marginBottom: 16 }}
      >
        Every meaningful action against this user&apos;s account — sign-ins, role grants, enrolment
        decisions, lesson completions, profile edits.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }}>
        {/* Vertical rail */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 18,
            top: 14,
            bottom: 14,
            width: 2,
            background: "var(--color-stroke)",
          }}
        />
        {entries.map((e) => {
          const tone = CATEGORY_TONE[e.category];
          return (
            <li
              key={e.id}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "38px 1fr auto",
                gap: 14,
                padding: "10px 0",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9999,
                  background: tone.bg,
                  color: tone.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  border: "2px solid #fff",
                }}
              >
                <Icon name={e.ico} size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                  }}
                >
                  {e.title}
                </div>
                {(e.detail || e.actor) && (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      color: "var(--color-body-green)",
                      marginTop: 2,
                    }}
                  >
                    {e.detail}
                    {e.detail && e.actor && " · "}
                    {e.actor && <>by {e.actor}</>}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-muted)",
                  whiteSpace: "nowrap",
                  paddingTop: 4,
                }}
              >
                {relativeTime(e.at)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
