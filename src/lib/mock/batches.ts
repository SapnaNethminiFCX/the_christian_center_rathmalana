export type BatchState = "open" | "closed" | "draft";

export interface Batch {
  id: string;
  courseId: string;
  name: string;
  intakeStart: string; // YYYY-MM-DD
  intakeEnd: string;
  state: BatchState;
  capacity: number;
  enrolled: number;
}

export const MOCK_BATCHES: Batch[] = [
  { id: "b-001", courseId: "c-foundations", name: "Intake 12 · Q2 2026", intakeStart: "2026-04-01", intakeEnd: "2026-06-30", state: "open",   capacity: 60, enrolled: 28 },
  { id: "b-002", courseId: "c-foundations", name: "Intake 11 · Q1 2026", intakeStart: "2026-01-01", intakeEnd: "2026-03-31", state: "closed", capacity: 60, enrolled: 58 },
  { id: "b-003", courseId: "c-disciplines", name: "Intake 09 · Q2 2026", intakeStart: "2026-04-15", intakeEnd: "2026-07-15", state: "open",   capacity: 40, enrolled: 12 },
  { id: "b-004", courseId: "c-apologetics", name: "Intake 04 · Q3 2026", intakeStart: "2026-07-01", intakeEnd: "2026-09-30", state: "draft",  capacity: 30, enrolled: 0 },
];

export function listBatchesForCourse(courseId: string): Batch[] {
  return MOCK_BATCHES.filter((b) => b.courseId === courseId);
}

export function openBatchesForCourse(courseId: string): Batch[] {
  return listBatchesForCourse(courseId).filter((b) => b.state === "open");
}

export function createBatch(input: {
  courseId: string;
  name: string;
  intakeStart: string;
  intakeEnd: string;
  state: BatchState;
  capacity: number;
}): Batch {
  const batch: Batch = {
    id: `b-${Date.now().toString(36)}`,
    ...input,
    enrolled: 0,
  };
  MOCK_BATCHES.push(batch);
  return batch;
}
