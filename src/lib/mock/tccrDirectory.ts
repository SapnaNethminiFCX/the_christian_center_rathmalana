import { avatarUrl } from "@/lib/kit";

export interface DirectoryEntry {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  roles: string[];
}

/**
 * V2 mock directory of TCCR users, ported from
 * src/ui_structure/v2/project/tccr-components.jsx (TCCR_DIRECTORY).
 * Used by Typeahead search across cells, promote, role-requests flows.
 */
export const TCCR_DIRECTORY: DirectoryEntry[] = [
  { id: "u-anjali",   name: "Anjali Silva",        avatar: avatarUrl(47), email: "anjali@example.com",   roles: ["member", "student"] },
  { id: "u-ravi",     name: "Ravi Tilakaratne",    avatar: avatarUrl(12), email: "ravi@example.com",     roles: ["member", "student", "leader"] },
  { id: "u-priya",    name: "Priya Mendis",        avatar: avatarUrl(32), email: "priya@example.com",    roles: ["member", "student"] },
  { id: "u-tania",    name: "Tania Fernando",      avatar: avatarUrl(48), email: "tania@example.com",    roles: ["member", "student", "leader", "g12"] },
  { id: "u-nadeesha", name: "Nadeesha Fernando",   avatar: avatarUrl(38), email: "nadeesha@example.com", roles: ["member"] },
  { id: "u-saman",    name: "Saman Perera",        avatar: avatarUrl(22), email: "saman@example.com",    roles: ["member", "leader"] },
  { id: "u-kasun",    name: "Kasun Bandara",       avatar: avatarUrl(5),  email: "kasun@example.com",    roles: ["member"] },
  { id: "u-dinithi",  name: "Dinithi Jayawardene", avatar: avatarUrl(14), email: "dinithi@example.com",  roles: ["member", "student", "leader"] },
  { id: "u-janaka",   name: "Janaka Liyanage",     avatar: avatarUrl(7),  email: "janaka@edupath.org",   roles: ["member", "admin"] },
  { id: "u-imani",    name: "Imani Rajapaksa",     avatar: avatarUrl(38), email: "imani@example.com",    roles: ["member", "student"] },
  { id: "u-sahan",    name: "Sahan Wijeratne",     avatar: avatarUrl(22), email: "sahan@example.com",    roles: ["member", "leader"] },
  { id: "u-dilshan",  name: "Dilshan Perera",      avatar: avatarUrl(28), email: "dilshan@example.com",  roles: ["member"] },
  { id: "u-asha",     name: "Asha Wickrama",       avatar: avatarUrl(19), email: "asha@example.com",     roles: ["member", "student"] },
  { id: "u-tharindu", name: "Tharindu Silva",      avatar: avatarUrl(42), email: "tharindu@example.com", roles: ["member"] },
];
