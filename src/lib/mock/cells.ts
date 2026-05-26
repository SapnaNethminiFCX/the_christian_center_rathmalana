import { TCCR_DIRECTORY } from "./tccrDirectory";

export type CellType = "g12" | "care" | "children" | "outreach";
export type CellState = "active" | "archived";

export interface CellMember {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string; // ISO
  roleInCell?: "leader" | "co-leader" | "member" | "guest";
}

export interface Cell {
  id: string;
  name: string;
  type: CellType;
  area: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar: string;
  g12LeaderName?: string;
  members: CellMember[];
  state: CellState;
  reportCount: number;
  lastMeetingDate?: string;
}

const m = (idx: number, joinedDaysAgo: number, roleInCell?: CellMember["roleInCell"]): CellMember => ({
  id: TCCR_DIRECTORY[idx].id,
  name: TCCR_DIRECTORY[idx].name,
  avatar: TCCR_DIRECTORY[idx].avatar,
  joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * joinedDaysAgo).toISOString(),
  roleInCell,
});

export const MOCK_CELLS: Cell[] = [
  {
    id: "cell-001",
    name: "Rathmalana Care Cell · East",
    type: "care",
    area: "Rathmalana East",
    leaderId: TCCR_DIRECTORY[3].id, // Tania
    leaderName: TCCR_DIRECTORY[3].name,
    leaderAvatar: TCCR_DIRECTORY[3].avatar,
    g12LeaderName: "Pastor Suresh Perera",
    members: [m(0, 120, "co-leader"), m(2, 90), m(4, 60), m(5, 45), m(7, 30)],
    state: "active",
    reportCount: 18,
    lastMeetingDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "cell-002",
    name: "Youth Outreach · Saturday",
    type: "outreach",
    area: "Mount Lavinia",
    leaderId: TCCR_DIRECTORY[1].id, // Ravi
    leaderName: TCCR_DIRECTORY[1].name,
    leaderAvatar: TCCR_DIRECTORY[1].avatar,
    g12LeaderName: "Tania Fernando",
    members: [m(9, 80), m(10, 70), m(12, 60), m(13, 30)],
    state: "active",
    reportCount: 12,
    lastMeetingDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "cell-003",
    name: "Children's Cell · Sunday",
    type: "children",
    area: "Dehiwala",
    leaderId: TCCR_DIRECTORY[5].id, // Saman
    leaderName: TCCR_DIRECTORY[5].name,
    leaderAvatar: TCCR_DIRECTORY[5].avatar,
    g12LeaderName: "Tania Fernando",
    members: [m(11, 50), m(13, 50), m(4, 40)],
    state: "active",
    reportCount: 9,
    lastMeetingDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "cell-004",
    name: "G12 Leaders Cell",
    type: "g12",
    area: "Colombo South",
    leaderId: TCCR_DIRECTORY[3].id,
    leaderName: TCCR_DIRECTORY[3].name,
    leaderAvatar: TCCR_DIRECTORY[3].avatar,
    members: [m(1, 200, "co-leader"), m(5, 180), m(10, 160), m(7, 150)],
    state: "active",
    reportCount: 24,
    lastMeetingDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

export function listCells(): Cell[] {
  return MOCK_CELLS.slice();
}

export function getCellById(id: string): Cell | undefined {
  return MOCK_CELLS.find((c) => c.id === id);
}

export function listCellsForMember(userId: string): Cell[] {
  return MOCK_CELLS.filter(
    (c) => c.leaderId === userId || c.members.some((m) => m.id === userId),
  );
}

export function listCellsForLeader(leaderId: string): Cell[] {
  return MOCK_CELLS.filter((c) => c.leaderId === leaderId);
}
