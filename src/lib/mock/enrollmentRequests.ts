/**
 * Mock course-enrollment requests for the Member + Student `/my-requests` view.
 *
 * A user who already holds the `student` role doesn't apply to become a
 * Student again — they apply to enrol in *specific courses* (and the admin
 * approves each enrolment per-course). This is the data that backs that list.
 */

export type EnrollmentRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface EnrollmentRequest {
  id: string;
  studentUid: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  status: EnrollmentRequestStatus;
  submittedAt: string; // ISO
  decidedAt?: string;
  decisionNote?: string;
  approverName?: string;
}

let _store: EnrollmentRequest[] = [
  {
    id: "er-001",
    studentUid: "dev-member-student",
    courseId: "c-foundations",
    courseTitle: "Foundations of Faith",
    batchId: "b-001",
    batchName: "Intake 12 · Q2 2026",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "er-002",
    studentUid: "dev-member-student",
    courseId: "c-disciplines",
    courseTitle: "Spiritual Disciplines",
    batchId: "b-003",
    batchName: "Intake 09 · Q2 2026",
    status: "approved",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    approverName: "Janaka Liyanage",
  },
  {
    id: "er-003",
    studentUid: "dev-member-student",
    courseId: "c-apologetics",
    courseTitle: "Christian Apologetics",
    batchId: "b-004",
    batchName: "Intake 04 · Q3 2026",
    status: "rejected",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    decisionNote: "Pre-requisite course not yet completed. Reapply after Foundations.",
    approverName: "Janaka Liyanage",
  },
  {
    id: "er-004",
    studentUid: "dev-leader",
    courseId: "c-foundations",
    courseTitle: "Foundations of Faith",
    batchId: "b-001",
    batchName: "Intake 12 · Q2 2026",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

export function listEnrollmentRequestsFor(studentUid: string): EnrollmentRequest[] {
  return _store.filter((r) => r.studentUid === studentUid);
}

export function createEnrollmentRequest(input: {
  studentUid: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
}): EnrollmentRequest {
  const req: EnrollmentRequest = {
    id: `er-${Date.now().toString(36)}`,
    ...input,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  _store = [req, ..._store];
  return req;
}

export function withdrawEnrollmentRequest(id: string): EnrollmentRequest | null {
  const idx = _store.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: EnrollmentRequest = {
    ..._store[idx],
    status: "withdrawn",
    decidedAt: new Date().toISOString(),
  };
  _store = [..._store.slice(0, idx), updated, ..._store.slice(idx + 1)];
  return updated;
}
