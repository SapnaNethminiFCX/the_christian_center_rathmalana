export interface RegistrationRow {
  id: number;
  name: string;
  email: string;
  country: string;
  source: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  avatar: number;
}

export const REGISTRATIONS_SEED: RegistrationRow[] = [
  { id: 1, name: "Anjali Silva", email: "anjali@example.com", country: "Sri Lanka", source: "Web · /register", date: "Today, 09:14", status: "pending", avatar: 47 },
  { id: 2, name: "Saman Perera", email: "saman@example.com", country: "Sri Lanka", source: "Web · /register", date: "Today, 08:02", status: "pending", avatar: 22 },
  { id: 3, name: "Nadeesha Fernando", email: "nadeesha@example.com", country: "UAE", source: "Referral · ravi.t", date: "Yesterday", status: "pending", avatar: 38 },
  { id: 4, name: "Dinithi Jayawardene", email: "dinithi@example.com", country: "Australia", source: "Web · /register", date: "Yesterday", status: "pending", avatar: 14 },
  { id: 5, name: "Janaka Liyanage", email: "janaka@example.com", country: "Canada", source: "Web · /register", date: "2 days ago", status: "pending", avatar: 7 },
  { id: 6, name: "Kasun Bandara", email: "kasun@example.com", country: "Sri Lanka", source: "Web · /register", date: "3 days ago", status: "approved", avatar: 5 },
];

export interface EnrollmentRow {
  id: number;
  name: string;
  email: string;
  course: string;
  semester: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  avatar: number;
}

export const ENROLLMENTS_SEED: EnrollmentRow[] = [
  { id: 1, name: "Anjali Silva", email: "anjali@example.com", course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "Today, 09:18", status: "pending", avatar: 47 },
  { id: 2, name: "Ravi Tilakaratne", email: "ravi.t@example.com", course: "Applied Machine Learning", semester: "Cohort · Q1 2026", date: "Today, 08:42", status: "pending", avatar: 12 },
  { id: 3, name: "Priya Mendis", email: "priya@example.com", course: "SQL for Analytics", semester: "Cohort · Q2 2026", date: "Today, 07:11", status: "pending", avatar: 32 },
  { id: 4, name: "Nadeesha Fernando", email: "nadeesha@example.com", course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "Yesterday", status: "pending", avatar: 38 },
  { id: 5, name: "Saman Perera", email: "saman@example.com", course: "Dashboards & Storytelling", semester: "Cohort · Q1 2026", date: "Yesterday", status: "pending", avatar: 22 },
  { id: 6, name: "Kasun Bandara", email: "kasun@example.com", course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "3 days ago", status: "approved", avatar: 5 },
];
