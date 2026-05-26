import { TCCR_DIRECTORY } from "./tccrDirectory";

export type RoleRequestStatus = "pending" | "approved" | "rejected";

export interface RoleRequest {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar: string;
  requestedRole: "student" | "leader" | "g12";
  /** Optional course context for student-role requests. */
  courseId?: string;
  courseTitle?: string;
  batchId?: string;
  batchName?: string;
  note?: string;
  status: RoleRequestStatus;
  submittedAt: string; // ISO
  decidedAt?: string;
  decisionNote?: string;
  approverId?: string;
  approverName?: string;
}

const u = (idx: number) => TCCR_DIRECTORY[idx];

let _store: RoleRequest[] = [
  {
    id: "rr-001",
    applicantId: u(4).id,
    applicantName: u(4).name,
    applicantEmail: u(4).email,
    applicantAvatar: u(4).avatar,
    requestedRole: "student",
    courseTitle: "Foundations of Faith",
    batchName: "Intake 12 · Q2 2026",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "rr-002",
    applicantId: u(6).id,
    applicantName: u(6).name,
    applicantEmail: u(6).email,
    applicantAvatar: u(6).avatar,
    requestedRole: "student",
    courseTitle: "Spiritual Disciplines",
    batchName: "Intake 11 · Q2 2026",
    note: "Currently attending Tania's cell — would love to enrol.",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "rr-003",
    applicantId: u(11).id,
    applicantName: u(11).name,
    applicantEmail: u(11).email,
    applicantAvatar: u(11).avatar,
    requestedRole: "student",
    courseTitle: "Bible Survey 101",
    batchName: "Intake 09 · Q1 2026",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "rr-004",
    applicantId: u(13).id,
    applicantName: u(13).name,
    applicantEmail: u(13).email,
    applicantAvatar: u(13).avatar,
    requestedRole: "student",
    courseTitle: "Christian Apologetics",
    batchName: "Intake 10 · Q2 2026",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "rr-005",
    applicantId: u(8).id,
    applicantName: u(8).name,
    applicantEmail: u(8).email,
    applicantAvatar: u(8).avatar,
    requestedRole: "student",
    courseTitle: "Foundations of Faith",
    batchName: "Intake 12 · Q2 2026",
    status: "approved",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    approverName: "Janaka Liyanage",
  },
];

export function listRoleRequests(): RoleRequest[] {
  return _store.slice();
}

export function getRoleRequestsForApplicant(applicantId: string): RoleRequest[] {
  return _store.filter((r) => r.applicantId === applicantId);
}

export function createRoleRequest(input: {
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar: string;
  requestedRole: RoleRequest["requestedRole"];
  courseTitle?: string;
  batchName?: string;
  note?: string;
}): RoleRequest {
  const req: RoleRequest = {
    id: `rr-${Date.now().toString(36)}`,
    ...input,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  _store = [req, ..._store];
  return req;
}

export function decideRoleRequest(
  id: string,
  decision: "approved" | "rejected",
  decisionNote?: string,
): RoleRequest | null {
  const idx = _store.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: RoleRequest = {
    ..._store[idx],
    status: decision,
    decidedAt: new Date().toISOString(),
    decisionNote,
  };
  _store = [..._store.slice(0, idx), updated, ..._store.slice(idx + 1)];
  return updated;
}
