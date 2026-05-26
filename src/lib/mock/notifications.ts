export interface NotificationItem {
  ico: string;
  tone: "success" | "warning" | "info" | "error";
  title: string;
  body?: string;
  when: string;
  read: boolean;
  link?: string;
}

export const STUDENT_NOTIFS: NotificationItem[] = [
  {
    ico: "check-circle",
    tone: "success",
    title: "Enrollment approved · Mathematics Foundations",
    body: "You can now access lessons and materials.",
    when: "12 min ago",
    read: false,
  },
  {
    ico: "check-circle",
    tone: "success",
    title: "Enrollment approved · Science Essentials",
    body: "Course unlocked. Lesson 1 is ready.",
    when: "Yesterday",
    read: false,
  },
  {
    ico: "clock",
    tone: "warning",
    title: "Enrollment pending · Reading & Writing",
    body: "Your request is awaiting admin approval.",
    when: "2 days ago",
    read: true,
  },
];

export const ADMIN_NOTIFS: NotificationItem[] = [
  {
    ico: "user-plus",
    tone: "info",
    title: "New registration · Anjali Silva",
    body: "Awaiting sign-up approval.",
    when: "2 min ago",
    read: false,
    link: "/admin/registrations",
  },
  {
    ico: "clipboard-list",
    tone: "info",
    title: "Enrollment request · Ravi T. → Mathematics Foundations",
    body: "Awaiting course-access approval.",
    when: "8 min ago",
    read: false,
    link: "/admin/enrollments",
  },
  {
    ico: "user-plus",
    tone: "info",
    title: "New registration · Saman Perera",
    body: "Awaiting sign-up approval.",
    when: "1 h ago",
    read: false,
    link: "/admin/registrations",
  },
];

export const SUPER_NOTIFS: NotificationItem[] = [
  {
    ico: "user-plus",
    tone: "info",
    title: "Admin invite accepted · Sahan Wijeratne",
    body: "Sahan can now access the admin console.",
    when: "20 min ago",
    read: false,
  },
  {
    ico: "alert-triangle",
    tone: "warning",
    title: "12 failed sign-ins from 1 IP",
    body: "Review security log.",
    when: "1 h ago",
    read: false,
  },
];
