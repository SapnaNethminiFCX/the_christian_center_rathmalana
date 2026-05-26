export interface StudentRow {
  id: number;
  name: string;
  email: string;
  country: string;
  courses: number;
  progress: number;
  status: "active" | "pending" | "suspended";
  avatar: number;
  joined: string;
}

export const STUDENTS_SEED: StudentRow[] = [
  { id: 1, name: "Priya Mendis", email: "priya@example.com", country: "Sri Lanka", courses: 3, progress: 65, status: "active", avatar: 32, joined: "Jan 2026" },
  { id: 2, name: "Ravi Tilakaratne", email: "ravi.t@example.com", country: "Sri Lanka", courses: 2, progress: 48, status: "active", avatar: 12, joined: "Feb 2026" },
  { id: 3, name: "Anjali Silva", email: "anjali@example.com", country: "Sri Lanka", courses: 1, progress: 12, status: "active", avatar: 47, joined: "Apr 2026" },
  { id: 4, name: "Nadeesha Fernando", email: "nadeesha@example.com", country: "UAE", courses: 2, progress: 78, status: "active", avatar: 38, joined: "Dec 2025" },
  { id: 5, name: "Dinithi Jayawardene", email: "dinithi@example.com", country: "Australia", courses: 4, progress: 92, status: "active", avatar: 14, joined: "Sep 2025" },
  { id: 6, name: "Saman Perera", email: "saman@example.com", country: "Sri Lanka", courses: 0, progress: 0, status: "pending", avatar: 22, joined: "May 2026" },
  { id: 7, name: "Janaka Liyanage", email: "janaka@example.com", country: "Canada", courses: 3, progress: 55, status: "active", avatar: 7, joined: "Nov 2025" },
  { id: 8, name: "Kasun Bandara", email: "kasun@example.com", country: "Sri Lanka", courses: 1, progress: 22, status: "suspended", avatar: 5, joined: "Mar 2026" },
];
