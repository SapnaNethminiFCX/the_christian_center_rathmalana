export type CellReportLanguage = "en" | "si" | "ta";

export interface AttendanceEntry {
  memberId: string;
  memberName: string;
  status: "present" | "absent";
}

export interface CellReport {
  id: string;
  cellId: string;
  cellName: string;
  /** When the cell actually met (or would have). */
  meetingDate: string; // YYYY-MM-DD
  language: CellReportLanguage;
  didMeet: boolean;
  notMetReason?: string;
  location?: string;
  startTime?: string; // HH:MM
  endTime?: string;
  leaderPresent: boolean;
  subjectKind: "sunday_sermon" | "other";
  subjectTopic?: string;
  cellType: "g12" | "care" | "children" | "outreach";
  attendance: AttendanceEntry[];
  visitorCount?: number;
  followUpNotes?: string;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  filedBy: string;
  filedAt: string; // ISO
  voided?: boolean;
  voidReason?: string;
}

let _reports: CellReport[] = [
  {
    id: "rep-001",
    cellId: "cell-001",
    cellName: "Rathmalana Care Cell · East",
    meetingDate: "2026-05-10",
    language: "en",
    didMeet: true,
    location: "Tania's home",
    startTime: "19:00",
    endTime: "20:30",
    leaderPresent: true,
    subjectKind: "sunday_sermon",
    cellType: "care",
    attendance: [
      { memberId: "u-anjali", memberName: "Anjali Silva", status: "present" },
      { memberId: "u-priya", memberName: "Priya Mendis", status: "present" },
      { memberId: "u-nadeesha", memberName: "Nadeesha Fernando", status: "absent" },
      { memberId: "u-saman", memberName: "Saman Perera", status: "present" },
      { memberId: "u-kasun", memberName: "Kasun Bandara", status: "present" },
    ],
    visitorCount: 1,
    satisfaction: 4,
    filedBy: "Tania Fernando",
    filedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "rep-002",
    cellId: "cell-001",
    cellName: "Rathmalana Care Cell · East",
    meetingDate: "2026-05-03",
    language: "si",
    didMeet: true,
    location: "Tania's home",
    startTime: "19:00",
    endTime: "20:45",
    leaderPresent: true,
    subjectKind: "other",
    subjectTopic: "Prayer & fasting",
    cellType: "care",
    attendance: [
      { memberId: "u-anjali", memberName: "Anjali Silva", status: "present" },
      { memberId: "u-priya", memberName: "Priya Mendis", status: "present" },
      { memberId: "u-nadeesha", memberName: "Nadeesha Fernando", status: "present" },
      { memberId: "u-saman", memberName: "Saman Perera", status: "absent" },
      { memberId: "u-kasun", memberName: "Kasun Bandara", status: "present" },
    ],
    satisfaction: 5,
    filedBy: "Tania Fernando",
    filedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  {
    id: "rep-003",
    cellId: "cell-002",
    cellName: "Youth Outreach · Saturday",
    meetingDate: "2026-05-11",
    language: "en",
    didMeet: false,
    notMetReason: "Leader travelling for ministry; rescheduled to next week.",
    leaderPresent: false,
    subjectKind: "sunday_sermon",
    cellType: "outreach",
    attendance: [],
    satisfaction: 3,
    filedBy: "Ravi Tilakaratne",
    filedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
];

export function listCellReports(filters?: { cellId?: string; voided?: boolean }): CellReport[] {
  return _reports.filter((r) => {
    if (filters?.cellId && r.cellId !== filters.cellId) return false;
    if (filters?.voided !== undefined && Boolean(r.voided) !== filters.voided) return false;
    return true;
  });
}

export function getCellReportById(id: string): CellReport | undefined {
  return _reports.find((r) => r.id === id);
}

export function createCellReport(report: Omit<CellReport, "id" | "filedAt">): CellReport {
  const created: CellReport = {
    ...report,
    id: `rep-${Date.now().toString(36)}`,
    filedAt: new Date().toISOString(),
  };
  _reports = [created, ..._reports];
  return created;
}

export function voidCellReport(id: string, reason: string): CellReport | null {
  const idx = _reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: CellReport = { ..._reports[idx], voided: true, voidReason: reason };
  _reports = [..._reports.slice(0, idx), updated, ..._reports.slice(idx + 1)];
  return updated;
}
