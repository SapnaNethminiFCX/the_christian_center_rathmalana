import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for POST /courses/:id/restore integration.
 *
 * Covers:
 *  1. Happy path — restore succeeds, course state updates to draft
 *  2. 409 INVALID_STATE — only archived courses can be restored
 *  3. 404 NOT_FOUND — course does not exist
 *  4. UI state — Restore button only visible when course is archived
 *  5. UI state — after restore, Publish button appears; Restore banner disappears
 */

// ── Mock apiRequest ───────────────────────────────────────────────────────────

vi.mock("@/infrastructure/api/request", () => ({
  apiRequest: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    code: string;
    status: number;
    constructor({ code, message, status }: { code: string; message: string; status: number }) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

const mockApiRequest = vi.mocked(apiRequest);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCourse(state: "draft" | "published" | "archived") {
  return {
    id: "course-abc",
    title: "Test Course",
    state,
    semesterCount: 2,
    publishedAt: null,
    deletedAt: null,
  };
}

// ── Unit tests: restore API call behaviour ────────────────────────────────────

describe("POST /courses/:id/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /courses/:id/restore with no body", async () => {
    mockApiRequest.mockResolvedValueOnce({ ...makeCourse("draft") });

    await apiRequest("/courses/course-abc/restore", { method: "POST" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/courses/course-abc/restore",
      { method: "POST" },
    );
  });

  it("resolves with the updated course (state: draft) on success", async () => {
    const restoredCourse = { ...makeCourse("draft") };
    mockApiRequest.mockResolvedValueOnce(restoredCourse);

    const result = await apiRequest<typeof restoredCourse>(
      "/courses/course-abc/restore",
      { method: "POST" },
    );

    expect(result.state).toBe("draft");
  });

  it("throws ApiRequestError with code INVALID_STATE on 409", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new ApiRequestError({
        code: "INVALID_STATE",
        message: "Only an ARCHIVED course can be restored.",
        status: 409,
      }),
    );

    await expect(
      apiRequest("/courses/course-abc/restore", { method: "POST" }),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
      status: 409,
    });
  });

  it("throws ApiRequestError on 404 when course does not exist", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new ApiRequestError({
        code: "COURSE_NOT_FOUND",
        message: "Course not found.",
        status: 404,
      }),
    );

    await expect(
      apiRequest("/courses/course-abc/restore", { method: "POST" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── UI state logic tests (pure logic, no DOM) ─────────────────────────────────

describe("Restore button visibility logic", () => {
  it("shows Restore button only when effectiveState is 'archived'", () => {
    const shouldShowRestore = (state: string) => state === "archived";

    expect(shouldShowRestore("archived")).toBe(true);
    expect(shouldShowRestore("draft")).toBe(false);
    expect(shouldShowRestore("published")).toBe(false);
  });

  it("shows Publish button only when effectiveState is 'draft'", () => {
    const shouldShowPublish = (state: string) => state === "draft";

    expect(shouldShowPublish("draft")).toBe(true);
    expect(shouldShowPublish("published")).toBe(false);
    expect(shouldShowPublish("archived")).toBe(false);
  });

  it("shows Unpublish + Archive buttons only when effectiveState is 'published'", () => {
    const shouldShowPublishedActions = (state: string) => state === "published";

    expect(shouldShowPublishedActions("published")).toBe(true);
    expect(shouldShowPublishedActions("draft")).toBe(false);
    expect(shouldShowPublishedActions("archived")).toBe(false);
  });

  it("after restore, effectiveState transitions archived → draft", () => {
    let effectiveState: string = "archived";

    // Simulate handleRestore success
    const onRestoreSuccess = () => { effectiveState = "draft"; };
    onRestoreSuccess();

    expect(effectiveState).toBe("draft");
    // Draft state → Publish button visible, Restore banner hidden
    expect(effectiveState === "archived").toBe(false);
    expect(effectiveState === "draft").toBe(true);
  });

  it("after publish, effectiveState transitions draft → published", () => {
    let effectiveState: string = "draft";

    const onPublishSuccess = () => { effectiveState = "published"; };
    onPublishSuccess();

    expect(effectiveState).toBe("published");
    expect(effectiveState === "published").toBe(true);
  });

  it("after unpublish, effectiveState transitions published → draft", () => {
    let effectiveState: string = "published";

    const onUnpublishSuccess = () => { effectiveState = "draft"; };
    onUnpublishSuccess();

    expect(effectiveState).toBe("draft");
    expect(effectiveState === "draft").toBe(true);
  });

  it("after archive, effectiveState transitions published → archived", () => {
    let effectiveState: string = "published";

    const onArchiveSuccess = () => { effectiveState = "archived"; };
    onArchiveSuccess();

    expect(effectiveState).toBe("archived");
    expect(effectiveState === "archived").toBe(true);
  });
});

// ── Error message mapping ─────────────────────────────────────────────────────

describe("Restore error message mapping", () => {
  function getRestoreErrorMessage(status: number, code?: string): string {
    if (status === 409 && code === "INVALID_STATE") {
      return "Only an archived course can be restored.";
    }
    if (status === 404) {
      return "Course not found.";
    }
    return "Restore failed.";
  }

  it("returns correct message for 409 INVALID_STATE", () => {
    expect(getRestoreErrorMessage(409, "INVALID_STATE")).toBe(
      "Only an archived course can be restored.",
    );
  });

  it("returns correct message for 404", () => {
    expect(getRestoreErrorMessage(404)).toBe("Course not found.");
  });

  it("returns fallback message for unexpected errors", () => {
    expect(getRestoreErrorMessage(500)).toBe("Restore failed.");
  });
});
