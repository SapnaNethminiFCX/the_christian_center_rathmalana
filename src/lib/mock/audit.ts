export interface AuditRow {
  ico: string;
  actor: string;
  action: string;
  target: string;
  category: "Approvals" | "Admins" | "Content" | "Security" | "Settings";
  when: string;
  ip: string;
}

export const AUDIT_SEED: AuditRow[] = [
  { ico: "user-check", actor: "Tania Fernando", action: "Approved 4 registrations", target: "Bulk approve · queue cleared", category: "Approvals", when: "Today, 10:18", ip: "203.94.74.12" },
  { ico: "user-plus", actor: "Tania Fernando", action: "Invited new admin", target: "sahan@edupath.org as Content Admin", category: "Admins", when: "Today, 09:44", ip: "203.94.74.12" },
  { ico: "edit-3", actor: "Janaka Liyanage", action: "Edited course", target: "Modern Backend Engineering · Module 2", category: "Content", when: "Today, 08:31", ip: "180.149.201.6" },
  { ico: "upload-cloud", actor: "Janaka Liyanage", action: "Published course", target: "SQL for Analytics", category: "Content", when: "Yesterday", ip: "180.149.201.6" },
  { ico: "x-circle", actor: "Tania Fernando", action: "Rejected enrollment", target: "Saman Perera · Dashboards & Storytelling", category: "Approvals", when: "Yesterday", ip: "203.94.74.12" },
  { ico: "lock", actor: "Super Admin", action: "Enabled MFA-required policy", target: "All administrator roles", category: "Security", when: "2 d ago", ip: "203.94.74.1" },
  { ico: "user-x", actor: "Super Admin", action: "Suspended administrator", target: "roshan@edupath.org", category: "Admins", when: "3 d ago", ip: "203.94.74.1" },
  { ico: "settings", actor: "Janaka Liyanage", action: "Updated brand colors", target: "Workspace settings", category: "Settings", when: "4 d ago", ip: "180.149.201.6" },
];
