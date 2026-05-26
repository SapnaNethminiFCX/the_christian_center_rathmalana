export interface AdminRow {
  id: number;
  name: string;
  email: string;
  role?: string;
  status: "active" | "invited" | "suspended";
  mfa?: boolean;
  last?: string;
  avatar: number;
  perms: string[];
  createdAt: string;
}

export const SUPER_PERMISSIONS = [
  { id: "registrations", label: "Approve registrations", hint: "Approve new sign-ups." },
  { id: "enrollments", label: "Approve enrollments", hint: "Approve course-access requests." },
  { id: "courses", label: "Manage courses", hint: "Create, edit and publish courses." },
  { id: "audit", label: "View audit log", hint: "Read-only access to platform logs." },
];

export const ADMINS_SEED: AdminRow[] = [
  { id: 1, name: "Tania Fernando", email: "tania@edupath.org", role: "Administrator", status: "active", mfa: true, last: "Online now", avatar: 48, perms: ["registrations", "enrollments", "courses", "audit"], createdAt: "12 Jan 2025" },
  { id: 2, name: "Dinithi Jayawardene", email: "dinithi@edupath.org", role: "Administrator", status: "active", mfa: true, last: "2 h ago", avatar: 14, perms: ["registrations", "enrollments", "courses"], createdAt: "3 Mar 2025" },
  { id: 3, name: "Janaka Liyanage", email: "janaka@edupath.org", role: "Content Admin", status: "active", mfa: false, last: "Yesterday", avatar: 7, perms: ["courses", "audit"], createdAt: "18 Mar 2025" },
  { id: 4, name: "Sahan Wijeratne", email: "sahan@edupath.org", role: "Content Admin", status: "invited", mfa: false, last: "Awaiting accept", avatar: 22, perms: ["courses"], createdAt: "2 May 2025" },
  { id: 5, name: "Imani Rajapaksa", email: "imani@edupath.org", role: "Administrator", status: "invited", mfa: false, last: "Awaiting accept", avatar: 38, perms: ["registrations", "enrollments"], createdAt: "8 May 2025" },
  { id: 6, name: "Roshan De Silva", email: "roshan@edupath.org", role: "Read-only", status: "suspended", mfa: true, last: "8 d ago", avatar: 5, perms: [], createdAt: "5 Feb 2025" },
];
