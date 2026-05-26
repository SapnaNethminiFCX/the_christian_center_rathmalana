export interface NavGroup {
  group: string;
}

export interface NavLink {
  id: string;
  /** Key inside the `nav` translation namespace (src/messages/*.json "nav"). */
  labelKey: string;
  ico: string;
  count?: number;
  hint?: string;
  href: string;
}

export type NavItem = NavGroup | NavLink;

export const isLink = (it: NavItem): it is NavLink => "id" in it;

// V2 STUDENT_NAV — adds a "Home" link at the top so Member+Student users
// can cross over to the Member section. "My Requests" is intentionally
// omitted; Members track their requests via the (authed) /my-requests
// surface from their Member-section sidebar.
export const STUDENT_NAV: NavItem[] = [
  { group: "Main" },
  { id: "home",          labelKey: "home",          ico: "home",             href: "/home" },
  { id: "dashboard",     labelKey: "dashboard",      ico: "layout-dashboard", href: "/dashboard" },
  { id: "courses",       labelKey: "myCourses",      ico: "book-open",        href: "/my-courses" },
  { id: "browse",        labelKey: "browseCourses",  ico: "search",           href: "/browse-courses" },
  { id: "profile",       labelKey: "profile",        ico: "user",             href: "/profile" },
  { group: "Account" },
  { id: "notifications", labelKey: "notifications",  ico: "bell",             href: "/notifications" },
];

// V2: V1's "Registrations" page is repurposed as the Role Requests queue
// (Member → Student approval). The route /admin/registrations stays so the
// existing useRegistrationQueue API integration keeps working — only the
// nav label and on-page title/copy change to the V2 wording.
// "Students" stays at /admin/students but is rebranded "Users" since V2
// shows all roles in that table, not just students.
export const ADMIN_NAV: NavItem[] = [
  { group: "Approvals" },
  { id: "dashboard",     labelKey: "dashboard",   ico: "layout-dashboard", href: "/admin/dashboard" },
  { id: "registrations", labelKey: "roleRequests", ico: "user-plus",       count: 8, hint: "Member → student", href: "/admin/registrations" },
  { id: "enrollments",   labelKey: "enrolments",  ico: "clipboard-list",  count: 6, hint: "Course access",     href: "/admin/enrollments" },
  { group: "Content" },
  { id: "courses",  labelKey: "courses",  ico: "book-open", href: "/admin/courses" },
  { id: "students", labelKey: "users",    ico: "users",     href: "/admin/students" },
  { id: "cells",    labelKey: "cells",    ico: "users",     href: "/admin/cells" },
  { group: "System" },
  { id: "notifications", labelKey: "notifications", ico: "bell", href: "/admin/notifications" },
  { id: "profile",       labelKey: "profile",       ico: "user", href: "/admin/profile" },
];

// ---------- V2: Member / Leader / G12 navs ----------

// NAV arrays mirror src/ui_structure/v2/project/tccr-screens-member.jsx
// (MEMBER_NAV / LEADER_NAV / G12_NAV). Bible School is a cross-module link
// from every role's sidebar — /school is a tiny router page that sends the
// user to /dashboard if they have `student`, else /home.

export const MEMBER_NAV: NavItem[] = [
  { group: "Main" },
  { id: "home",          labelKey: "home",         ico: "home",      href: "/home" },
  { id: "school",        labelKey: "bibleSchool",  ico: "book-open", href: "/school" },
  { id: "cells",         labelKey: "cellGroups",   ico: "users",     href: "/my-cells" },
  { id: "requests",      labelKey: "myRequests",   ico: "file-text", href: "/my-requests" },
  { group: "Account" },
  { id: "notifications", labelKey: "notifications", ico: "bell",     href: "/notifications" },
  { id: "profile",       labelKey: "profile",       ico: "user",     href: "/profile" },
];

export const LEADER_NAV: NavItem[] = [
  { group: "Main" },
  { id: "home",          labelKey: "home",          ico: "home",             href: "/home" },
  { id: "dashboard",     labelKey: "dashboard",     ico: "layout-dashboard", href: "/leader/dashboard" },
  { id: "cells",         labelKey: "cells",         ico: "users",            href: "/cells" },
  { id: "analytics",     labelKey: "analytics",     ico: "bar-chart",        href: "/leader/analytics" },
  { id: "school",        labelKey: "bibleSchool",   ico: "book-open",        href: "/school" },
  { group: "Account" },
  { id: "notifications", labelKey: "notifications", ico: "bell",             href: "/leader/notifications" },
  { id: "profile",       labelKey: "profile",       ico: "user",             href: "/leader/profile" },
];

export const G12_NAV: NavItem[] = [
  { group: "Main" },
  { id: "home",          labelKey: "home",           ico: "home",             href: "/home" },
  { id: "dashboard",     labelKey: "dashboard",      ico: "layout-dashboard", href: "/g12/dashboard" },
  { id: "cells",         labelKey: "cells",          ico: "users",            href: "/cells" },
  { id: "network",       labelKey: "leadersNetwork", ico: "share-2",          href: "/g12/network" },
  { id: "promote",       labelKey: "promote",        ico: "user-plus",        href: "/g12/promote" },
  { id: "reports",       labelKey: "reports",        ico: "file-text",        href: "/g12/reports" },
  { id: "analytics",     labelKey: "analytics",      ico: "bar-chart",        href: "/g12/analytics" },
  { id: "school",        labelKey: "bibleSchool",    ico: "book-open",        href: "/school" },
  { group: "Account" },
  { id: "notifications", labelKey: "notifications",  ico: "bell",             href: "/g12/notifications" },
  { id: "profile",       labelKey: "profile",        ico: "user",             href: "/g12/profile" },
];

export const SUPERADMIN_NAV: NavItem[] = [
  { group: "Platform" },
  { id: "dashboard",     labelKey: "dashboard",     ico: "layout-dashboard", href: "/super-admin/dashboard" },
  { id: "admins",        labelKey: "administrators", ico: "shield-check",    count: 2, hint: "Pending invites", href: "/super-admin/admins" },
  { group: "Approvals" },
  { id: "registrations", labelKey: "roleRequests",  ico: "user-plus",       count: 8, hint: "Member → student", href: "/super-admin/registrations" },
  { id: "enrollments",   labelKey: "enrolments",    ico: "clipboard-list",  count: 6, href: "/super-admin/enrollments" },
  { group: "Content" },
  { id: "courses",  labelKey: "courses",   ico: "book-open", href: "/super-admin/courses" },
  { id: "students", labelKey: "users",     ico: "users",     href: "/super-admin/students" },
  { id: "cells",    labelKey: "cells",     ico: "users",     href: "/super-admin/cells" },
  { group: "System" },
  { id: "notifications", labelKey: "notifications", ico: "bell",    href: "/super-admin/notifications" },
  { id: "profile",       labelKey: "profile",       ico: "user",    href: "/super-admin/profile" },
];
