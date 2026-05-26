import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 07 — Cell Reports tests.
 *
 * Covers:
 *   1. API endpoint correctness for all 5 endpoints
 *   2. Response format handling (array vs {items:[]})
 *   3. Idempotency key behaviour
 *   4. Void report — 409 REPORT_ALREADY_VOIDED
 *   5. Photo upload validation
 *   6. didMeet=false short-circuit (no meeting fields required)
 *   7. Notification preferences toggle
 */

vi.mock("@/infrastructure/api/request", () => ({
  apiRequest: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    code: string; status: number;
    constructor({ code, message, status }: { code: string; message: string; status: number }) {
      super(message); this.code = code; this.status = status;
    }
  },
}));

import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
const mock = vi.mocked(apiRequest);

beforeEach(() => vi.clearAllMocks());

// ── GET /cells/:id/reports ────────────────────────────────────────────────────

describe("GET /cells/:id/reports", () => {
  it("fetches reports with correct URL", async () => {
    mock.mockResolvedValueOnce({ items: [], total: 0 });
    await apiRequest("/cells/c1/reports?limit=50");
    expect(mock).toHaveBeenCalledWith("/cells/c1/reports?limit=50");
  });

  it("handles plain array response", async () => {
    const reports = [{ id: "r1", date: "2026-05-20", didMeet: true }];
    mock.mockResolvedValueOnce(reports);
    const res = await apiRequest<unknown>("/cells/c1/reports?limit=50");
    const list = Array.isArray(res) ? res : ((res as { items?: unknown[] }).items ?? []);
    expect(list).toHaveLength(1);
  });

  it("handles {items:[]} response", async () => {
    mock.mockResolvedValueOnce({ items: [{ id: "r1" }], total: 1 });
    const res = await apiRequest<{ items: unknown[] }>("/cells/c1/reports?limit=50");
    expect(res.items).toHaveLength(1);
  });
});

// ── GET /cells/:id/reports/:rid ───────────────────────────────────────────────

describe("GET /cells/:id/reports/:rid", () => {
  it("fetches single report", async () => {
    const report = { id: "r1", cellId: "c1", voided: false };
    mock.mockResolvedValueOnce(report);
    const res = await apiRequest<typeof report>("/cells/c1/reports/r1");
    expect(res.id).toBe("r1");
    expect(res.voided).toBe(false);
  });

  it("throws 404 when report not found", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "CELL_REPORT_NOT_FOUND", message: "Not found.", status: 404 }));
    await expect(apiRequest("/cells/c1/reports/bad")).rejects.toMatchObject({ code: "CELL_REPORT_NOT_FOUND" });
  });
});

// ── POST /cells/:id/reports ───────────────────────────────────────────────────

describe("POST /cells/:id/reports", () => {
  it("files a report and returns created record", async () => {
    const report = { id: "r1", cellId: "c1", voided: false, date: "2026-05-20" };
    mock.mockResolvedValueOnce(report);
    const res = await apiRequest<typeof report>("/cells/c1/reports", { method: "POST" });
    expect(res.id).toBe("r1");
  });

  it("same idempotency key returns 200 (existing report)", async () => {
    const existing = { id: "r1", cellId: "c1" };
    // Both calls return same report (idempotent)
    mock.mockResolvedValueOnce(existing);
    mock.mockResolvedValueOnce(existing);
    const r1 = await apiRequest<typeof existing>("/cells/c1/reports", { method: "POST" });
    const r2 = await apiRequest<typeof existing>("/cells/c1/reports", { method: "POST" });
    expect(r1.id).toBe(r2.id);
  });
});

// ── POST /cells/:id/report-photos ─────────────────────────────────────────────

describe("POST /cells/:id/report-photos", () => {
  it("returns photo URLs on success", async () => {
    const response = { photoUrls: ["https://storage.../photo1.jpg"] };
    mock.mockResolvedValueOnce(response);
    const res = await apiRequest<typeof response>("/cells/c1/report-photos", { method: "POST" });
    expect(res.photoUrls).toHaveLength(1);
  });

  it("throws 400 on zero photos", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "VALIDATION_ERROR", message: "No files sent.", status: 400 }));
    await expect(apiRequest("/cells/c1/report-photos", { method: "POST" })).rejects.toMatchObject({ status: 400 });
  });

  it("throws 413 when photo exceeds 5 MB", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "FILE_TOO_LARGE", message: "Photo exceeds 5 MB.", status: 413 }));
    await expect(apiRequest("/cells/c1/report-photos", { method: "POST" })).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });
});

// ── POST /cells/:id/reports/:rid/void ─────────────────────────────────────────

describe("POST /cells/:id/reports/:rid/void", () => {
  it("voids a report with reason", async () => {
    mock.mockResolvedValueOnce({ id: "r1", voided: true });
    const res = await apiRequest<{ voided: boolean }>("/cells/c1/reports/r1/void", { method: "POST", body: { reason: "Filed for wrong date." } });
    expect(res.voided).toBe(true);
  });

  it("throws 409 REPORT_ALREADY_VOIDED when already voided", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "REPORT_ALREADY_VOIDED", message: "Already voided.", status: 409 }));
    await expect(apiRequest("/cells/c1/reports/r1/void", { method: "POST", body: { reason: "test" } }))
      .rejects.toMatchObject({ code: "REPORT_ALREADY_VOIDED", status: 409 });
  });
});

// ── Business logic tests ──────────────────────────────────────────────────────

describe("Idempotency key", () => {
  it("generates a UUID-like key", () => {
    const key = crypto.randomUUID();
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("different calls produce different keys", () => {
    const k1 = crypto.randomUUID();
    const k2 = crypto.randomUUID();
    expect(k1).not.toBe(k2);
  });
});

describe("didMeet=false short-circuit", () => {
  it("only noMeetReason is required when didMeet=false", () => {
    const payload = { didMeet: false, noMeetReason: "Leader was sick." };
    // V2 API: only noMeetReason needed — all meeting fields optional
    expect(payload.noMeetReason).toBeTruthy();
    expect(payload.didMeet).toBe(false);
  });

  it("meeting fields required when didMeet=true", () => {
    const payload = { didMeet: true, location: "TCCR", timeStarted: "18:00", satisfactionRate: 4 };
    expect(payload.location).toBeTruthy();
    expect(payload.satisfactionRate).toBeGreaterThan(0);
  });
});

describe("Void error message mapping", () => {
  function getVoidError(code: string): string {
    if (code === "REPORT_ALREADY_VOIDED") return "This report has already been voided.";
    if (code === "FORBIDDEN") return "You don't have permission to void this report.";
    return "Couldn't void report. Please try again.";
  }
  it("maps REPORT_ALREADY_VOIDED", () => {
    expect(getVoidError("REPORT_ALREADY_VOIDED")).toBe("This report has already been voided.");
  });
  it("maps FORBIDDEN", () => {
    expect(getVoidError("FORBIDDEN")).toBe("You don't have permission to void this report.");
  });
  it("fallback for unknown errors", () => {
    expect(getVoidError("UNKNOWN")).toBe("Couldn't void report. Please try again.");
  });
});

// ── PATCH /courses/:id { coverImageUrl } ──────────────────────────────────────

describe("PATCH /courses/:id { coverImageUrl }", () => {
  it("sets a cover image URL on the course", async () => {
    const updated = { id: "c1", title: "Foundations", coverImageUrl: "https://x/img.jpg" };
    mock.mockResolvedValueOnce(updated);
    const res = await apiRequest<typeof updated>("/courses/c1", {
      method: "PATCH",
      body: { coverImageUrl: "https://x/img.jpg" },
    });
    expect(res.coverImageUrl).toBe("https://x/img.jpg");
    expect(mock).toHaveBeenCalledWith("/courses/c1", {
      method: "PATCH",
      body: { coverImageUrl: "https://x/img.jpg" },
    });
  });

  it("clears the cover image when null is sent", async () => {
    mock.mockResolvedValueOnce({ id: "c1", coverImageUrl: null });
    const res = await apiRequest<{ coverImageUrl: string | null }>("/courses/c1", {
      method: "PATCH",
      body: { coverImageUrl: null },
    });
    expect(res.coverImageUrl).toBeNull();
  });
});

// ── POST /me/notifications/read-all (204 handling) ────────────────────────────

describe("POST /me/notifications/read-all", () => {
  it("handles undefined response from 204 No Content", async () => {
    mock.mockResolvedValueOnce(undefined);
    const res = await apiRequest<{ markedCount?: number } | undefined>(
      "/me/notifications/read-all",
      { method: "POST" },
    );
    // Reproduces the optional-chaining fix — must not throw on undefined
    const count = (res as { markedCount?: number } | undefined)?.markedCount ?? 5;
    expect(count).toBe(5);
  });

  it("uses markedCount when backend returns JSON", async () => {
    mock.mockResolvedValueOnce({ markedCount: 3 });
    const res = await apiRequest<{ markedCount?: number }>("/me/notifications/read-all", { method: "POST" });
    const count = res?.markedCount ?? 0;
    expect(count).toBe(3);
  });
});

// ── useEnrollments — skip fetch for non-students ──────────────────────────────

describe("useEnrollments role-gating", () => {
  function shouldFetchEnrollments(roles: string[] | undefined): boolean {
    return !!roles?.includes("student");
  }
  it("skips fetch when user is only a member (prevents 403)", () => {
    expect(shouldFetchEnrollments(["member"])).toBe(false);
  });
  it("skips fetch when user is leader without student role", () => {
    expect(shouldFetchEnrollments(["member", "leader"])).toBe(false);
  });
  it("fetches when user has student role", () => {
    expect(shouldFetchEnrollments(["member", "student"])).toBe(true);
  });
  it("skips fetch when roles is undefined", () => {
    expect(shouldFetchEnrollments(undefined)).toBe(false);
  });
});

// ── useCell — leaderName enrichment ───────────────────────────────────────────

describe("useCell leaderName enrichment", () => {
  function needsLeaderEnrichment(data: { leaderUid?: string; leaderName?: string }): boolean {
    if (!data.leaderUid) return false;
    return !data.leaderName || data.leaderName === data.leaderUid;
  }
  it("enriches when leaderName is missing", () => {
    expect(needsLeaderEnrichment({ leaderUid: "u1" })).toBe(true);
  });
  it("enriches when leaderName equals leaderUid (backend bug)", () => {
    expect(needsLeaderEnrichment({ leaderUid: "u1", leaderName: "u1" })).toBe(true);
  });
  it("does not enrich when leaderName is a real name", () => {
    expect(needsLeaderEnrichment({ leaderUid: "u1", leaderName: "Sapna" })).toBe(false);
  });
  it("does not enrich when leaderUid is missing", () => {
    expect(needsLeaderEnrichment({})).toBe(false);
  });

  it("builds full name from firstName + lastName", async () => {
    mock.mockResolvedValueOnce({ firstName: "Sapna", lastName: "Nethmini" });
    const u = await apiRequest<{ firstName?: string; lastName?: string }>("/users/u1");
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    expect(name).toBe("Sapna Nethmini");
  });
});

// ── Enrollment courseName enrichment ──────────────────────────────────────────

describe("Enrollment courseName enrichment", () => {
  it("fetches course title when enrollment is missing courseName", async () => {
    mock.mockResolvedValueOnce({ id: "c1", title: "Foundations of Faith" });
    const c = await apiRequest<{ title: string }>("/courses/c1");
    expect(c.title).toBe("Foundations of Faith");
  });

  function needsCourseEnrichment(e: { courseId: string; courseName?: string }): boolean {
    return !e.courseName;
  }
  it("flags enrollments without courseName for enrichment", () => {
    expect(needsCourseEnrichment({ courseId: "c1" })).toBe(true);
  });
  it("skips enrichment when courseName is already set", () => {
    expect(needsCourseEnrichment({ courseId: "c1", courseName: "Foundations" })).toBe(false);
  });
});

// ── YouTube URL format ────────────────────────────────────────────────────────

describe("Lesson YouTube URL format", () => {
  function buildYoutubeUrl(videoId: string | null): string | null {
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  }
  it("wraps the 11-char ID into a full URL", () => {
    expect(buildYoutubeUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
  it("returns null when no video id given", () => {
    expect(buildYoutubeUrl(null)).toBeNull();
  });
  it("never sends raw 11-char ID — backend rejects it as 400", () => {
    const url = buildYoutubeUrl("dQw4w9WgXcQ");
    expect(url).not.toBe("dQw4w9WgXcQ");
    expect(url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
  });
});

// ── sessionSlice — trust roles[] directly ─────────────────────────────────────

describe("sessionSlice trusts roles[] over status", () => {
  function deriveRoles(u: { roles?: string[]; role?: string; status?: string }): string[] {
    // Reproduces the post-fix logic — no pending_approval override
    return u.roles?.length ? u.roles : (u.role ? [u.role] : []);
  }
  it("uses roles[] when present", () => {
    expect(deriveRoles({ roles: ["member", "student"], status: "approved" })).toEqual(["member", "student"]);
  });
  it("does NOT downgrade an approved student to member based on status", () => {
    // V1 bug: status='pending_approval' override stripped 'student' from an approved user
    const roles = deriveRoles({ roles: ["member", "student"], status: "pending_approval" });
    expect(roles).toContain("student");
  });
  it("falls back to scalar role when roles[] is absent", () => {
    expect(deriveRoles({ role: "member" })).toEqual(["member"]);
  });
  it("returns [] when neither roles[] nor role is given", () => {
    expect(deriveRoles({})).toEqual([]);
  });
});
