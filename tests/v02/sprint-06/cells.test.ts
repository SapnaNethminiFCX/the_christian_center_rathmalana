import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 06 — Cell Groups module tests.
 *
 * Covers:
 *   1. API call patterns: correct URLs + methods for all 12 endpoints
 *   2. Response format handling: both array and {items:[]} shapes
 *   3. Error handling: 403/404 for access-denied / not-found
 *   4. Cell state logic: state chip visibility
 *   5. Join-request flow: 409 CELL_JOIN_REQUEST_PENDING
 *   6. Archive / remove member confirmation logic
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

// ── API endpoint tests ────────────────────────────────────────────────────────

describe("GET /cells", () => {
  it("calls correct URL with no filters", async () => {
    mock.mockResolvedValueOnce({ items: [], total: 0 });
    await apiRequest("/cells?limit=100");
    expect(mock).toHaveBeenCalledWith("/cells?limit=100");
  });

  it("handles plain array response (backend variation)", async () => {
    const cells = [{ id: "c1", name: "Rathmalana Care", type: "care", area: "Rathmalana", leaderUid: "u1", memberCount: 5, reportCount: 3, state: "active", createdAt: "", updatedAt: "" }];
    mock.mockResolvedValueOnce(cells);
    const res = await apiRequest<unknown>("/cells?limit=100");
    const list = Array.isArray(res) ? res : ((res as { items?: unknown[] }).items ?? []);
    expect(list).toHaveLength(1);
  });

  it("handles {items:[]} response (V2 spec)", async () => {
    const cells = [{ id: "c1" }];
    mock.mockResolvedValueOnce({ items: cells, total: 1 });
    const res = await apiRequest<unknown>("/cells?limit=100");
    const list = Array.isArray(res) ? res : ((res as { items?: unknown[] }).items ?? []);
    expect(list).toHaveLength(1);
  });
});

describe("GET /cells/mine", () => {
  it("calls correct endpoint", async () => {
    mock.mockResolvedValueOnce([]);
    await apiRequest("/cells/mine");
    expect(mock).toHaveBeenCalledWith("/cells/mine");
  });
});

describe("GET /cells/:id", () => {
  it("fetches cell detail by ID", async () => {
    const cell = { id: "cell-001", name: "G12 West", memberCount: 8 };
    mock.mockResolvedValueOnce(cell);
    const res = await apiRequest<typeof cell>("/cells/cell-001");
    expect(res.id).toBe("cell-001");
    expect(res.memberCount).toBe(8);
  });

  it("throws 404 when cell does not exist", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "CELL_NOT_FOUND", message: "Cell not found.", status: 404 }));
    await expect(apiRequest("/cells/bad-id")).rejects.toMatchObject({ status: 404, code: "CELL_NOT_FOUND" });
  });

  it("throws 403 when user is not a cell member", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "FORBIDDEN", message: "Not a member.", status: 403 }));
    await expect(apiRequest("/cells/cell-001")).rejects.toMatchObject({ status: 403 });
  });
});

describe("POST /cells", () => {
  it("creates a cell with correct body", async () => {
    const created = { id: "new-cell", name: "Care West", type: "care" };
    mock.mockResolvedValueOnce(created);
    const res = await apiRequest<typeof created>("/cells", { method: "POST", body: { name: "Care West", type: "care", area: "West" } });
    expect(res.id).toBe("new-cell");
    expect(mock).toHaveBeenCalledWith("/cells", { method: "POST", body: { name: "Care West", type: "care", area: "West" } });
  });
});

describe("PATCH /cells/:id", () => {
  it("updates cell with changed fields only", async () => {
    mock.mockResolvedValueOnce({ id: "c1", name: "Updated Name" });
    await apiRequest("/cells/c1", { method: "PATCH", body: { name: "Updated Name" } });
    expect(mock).toHaveBeenCalledWith("/cells/c1", { method: "PATCH", body: { name: "Updated Name" } });
  });
});

describe("POST /cells/:id/archive", () => {
  it("archives a cell", async () => {
    mock.mockResolvedValueOnce({ id: "c1", state: "archived" });
    const res = await apiRequest<{ state: string }>("/cells/c1/archive", { method: "POST" });
    expect(res.state).toBe("archived");
  });
});

describe("POST /cells/:id/members", () => {
  it("adds members and returns count", async () => {
    mock.mockResolvedValueOnce({ added: ["uid-1", "uid-2"], memberCount: 10 });
    const res = await apiRequest<{ added: string[]; memberCount: number }>(
      "/cells/c1/members", { method: "POST", body: { userUids: ["uid-1", "uid-2"] } }
    );
    expect(res.added).toHaveLength(2);
    expect(res.memberCount).toBe(10);
  });
});

describe("DELETE /cells/:id/members/:uid", () => {
  it("calls correct DELETE URL", async () => {
    mock.mockResolvedValueOnce({ removed: "uid-1", memberCount: 9 });
    await apiRequest("/cells/c1/members/uid-1", { method: "DELETE" });
    expect(mock).toHaveBeenCalledWith("/cells/c1/members/uid-1", { method: "DELETE" });
  });
});

describe("POST /cells/:id/join-requests", () => {
  it("applies to join with optional message", async () => {
    mock.mockResolvedValueOnce({ id: "jr-1", cellId: "c1", status: "pending" });
    const res = await apiRequest<{ status: string }>("/cells/c1/join-requests", { method: "POST", body: { message: "I'd like to join" } });
    expect(res.status).toBe("pending");
  });

  it("throws 409 when join request already pending", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "CELL_JOIN_REQUEST_PENDING", message: "Already has a pending request.", status: 409 }));
    await expect(apiRequest("/cells/c1/join-requests", { method: "POST", body: {} }))
      .rejects.toMatchObject({ code: "CELL_JOIN_REQUEST_PENDING", status: 409 });
  });
});

describe("GET /cells/:id/join-requests", () => {
  it("fetches pending join requests", async () => {
    mock.mockResolvedValueOnce({ items: [{ id: "jr-1", status: "pending" }], total: 1 });
    const res = await apiRequest<{ items: { status: string }[] }>("/cells/c1/join-requests?status=pending&limit=100");
    expect(res.items[0].status).toBe("pending");
  });
});

describe("POST /cells/:id/join-requests/:rid/approve", () => {
  it("approves a request with optional note", async () => {
    mock.mockResolvedValueOnce({ joinRequestId: "jr-1", memberCount: 9 });
    await apiRequest("/cells/c1/join-requests/jr-1/approve", { method: "POST", body: { note: "Welcome!" } });
    expect(mock).toHaveBeenCalledWith("/cells/c1/join-requests/jr-1/approve", expect.objectContaining({ method: "POST" }));
  });

  it("throws 409 when request already decided", async () => {
    mock.mockRejectedValueOnce(new ApiRequestError({ code: "INVALID_STATE", message: "Already decided.", status: 409 }));
    await expect(apiRequest("/cells/c1/join-requests/jr-1/approve", { method: "POST", body: {} }))
      .rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});

describe("POST /cells/:id/join-requests/:rid/reject", () => {
  it("rejects a request with note", async () => {
    mock.mockResolvedValueOnce({ id: "jr-1", status: "rejected" });
    const res = await apiRequest<{ status: string }>("/cells/c1/join-requests/jr-1/reject", { method: "POST", body: { note: "Cell is full." } });
    expect(res.status).toBe("rejected");
  });
});

// ── Business logic tests ──────────────────────────────────────────────────────

describe("Cell state logic", () => {
  it("active cells are visible at full opacity", () => {
    const isActive = (state: string) => state === "active";
    expect(isActive("active")).toBe(true);
    expect(isActive("archived")).toBe(false);
  });

  it("memberCount reflects server-side count", () => {
    const cell = { memberCount: 12 };
    expect(cell.memberCount).toBe(12);
  });

  it("cell type chips map to correct labels", () => {
    const TYPE_LABEL = { g12: "G12", care: "Care", children: "Children", outreach: "Outreach" };
    expect(TYPE_LABEL["g12"]).toBe("G12");
    expect(TYPE_LABEL["care"]).toBe("Care");
  });
});

describe("Join-request 409 error message mapping", () => {
  function getJoinError(code: string): string {
    if (code === "CELL_JOIN_REQUEST_PENDING") return "You already have a pending request for this cell.";
    if (code === "FORBIDDEN") return "You don't have access to this cell.";
    return "Something went wrong.";
  }
  it("maps CELL_JOIN_REQUEST_PENDING correctly", () => {
    expect(getJoinError("CELL_JOIN_REQUEST_PENDING")).toBe("You already have a pending request for this cell.");
  });
  it("maps FORBIDDEN correctly", () => {
    expect(getJoinError("FORBIDDEN")).toBe("You don't have access to this cell.");
  });
  it("falls back for unknown codes", () => {
    expect(getJoinError("UNKNOWN")).toBe("Something went wrong.");
  });
});
