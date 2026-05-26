import type { CoverKind } from "@/lib/kit";

export interface CourseSummary {
  id: string;
  kind: CoverKind;
  emblem: string;
  tag: string;
  title: string;
  desc?: string;
  time: string;
  lessons: string;
  progress?: number;
}

export const FEATURED_COURSES: CourseSummary[] = [
  {
    id: "modern-backend-engineering",
    kind: "math",
    emblem: "code-2",
    tag: "Engineering",
    time: "8h 40m",
    lessons: "16 lessons",
    title: "Modern Backend Engineering",
    desc: "Design APIs, model relational data and ship production services with TypeScript and Postgres.",
  },
  {
    id: "applied-machine-learning",
    kind: "sci",
    emblem: "brain-circuit",
    tag: "Machine Learning",
    time: "10h 20m",
    lessons: "20 lessons",
    title: "Applied Machine Learning",
    desc: "From regression to fine-tuning, hands-on with Python, scikit-learn and PyTorch.",
  },
  {
    id: "sql-for-analytics",
    kind: "lit",
    emblem: "database",
    tag: "Data Analytics",
    time: "6h 50m",
    lessons: "14 lessons",
    title: "SQL for Analytics",
    desc: "Window functions, joins, query plans. Patterns you will use every day on the job.",
  },
  {
    id: "dashboards-storytelling",
    kind: "soc",
    emblem: "bar-chart-3",
    tag: "Data Viz",
    time: "5h 10m",
    lessons: "12 lessons",
    title: "Dashboards & Storytelling",
    desc: "Turn raw data into clear, opinionated dashboards stakeholders actually use.",
  },
  {
    id: "cloud-architecture",
    kind: "gen",
    emblem: "layers",
    tag: "Cloud",
    time: "7h 30m",
    lessons: "15 lessons",
    title: "Cloud Architecture",
    desc: "Design scalable cloud systems on AWS and Azure with infrastructure-as-code and CI/CD pipelines.",
  },
  {
    id: "python-fundamentals",
    kind: "math",
    emblem: "terminal",
    tag: "Programming",
    time: "4h 20m",
    lessons: "10 lessons",
    title: "Python Fundamentals",
    desc: "Core Python for engineers: data structures, functions, OOP and writing clean, readable code.",
  },
];

export const STUDENT_IN_PROGRESS: CourseSummary[] = [
  {
    id: "modern-backend-engineering",
    kind: "math",
    emblem: "code-2",
    tag: "Engineering",
    title: "Modern Backend Engineering",
    time: "8h 40m",
    lessons: "16 lessons",
    progress: 65,
  },
  {
    id: "applied-machine-learning",
    kind: "sci",
    emblem: "brain-circuit",
    tag: "Machine Learning",
    title: "Applied Machine Learning",
    time: "10h 20m",
    lessons: "20 lessons",
    progress: 28,
  },
];

export const STUDENT_PENDING_COURSES: CourseSummary[] = [
  {
    id: "cloud-architecture",
    kind: "gen",
    emblem: "layers",
    tag: "Cloud",
    title: "Cloud Architecture",
    time: "7h 30m",
    lessons: "15 lessons",
  },
];

export const STUDENT_ENROLLED_NOT_STARTED: CourseSummary[] = [
  {
    id: "sql-for-analytics",
    kind: "lit",
    emblem: "database",
    tag: "Data Analytics",
    title: "SQL for Analytics",
    time: "6h 50m",
    lessons: "14 lessons",
    progress: 0,
  },
  {
    id: "dashboards-storytelling",
    kind: "soc",
    emblem: "bar-chart-3",
    tag: "Data Viz",
    title: "Dashboards & Storytelling",
    time: "5h 10m",
    lessons: "12 lessons",
    progress: 0,
  },
];

export interface AdminCourseRow {
  id: number;
  title: string;
  subject: string;
  semesters: number;
  lessons: number;
  students: number;
  status: "published" | "draft";
  updated: string;
}

export const ADMIN_COURSES_SEED: AdminCourseRow[] = [
  {
    id: 1,
    title: "Modern Backend Engineering",
    subject: "Engineering",
    semesters: 2,
    lessons: 22,
    students: 412,
    status: "published",
    updated: "Yesterday",
  },
  {
    id: 2,
    title: "Applied Machine Learning",
    subject: "Machine Learning",
    semesters: 2,
    lessons: 18,
    students: 287,
    status: "published",
    updated: "3 d ago",
  },
  {
    id: 3,
    title: "SQL for Analytics",
    subject: "Data Analytics",
    semesters: 1,
    lessons: 14,
    students: 198,
    status: "draft",
    updated: "1 h ago",
  },
  {
    id: 4,
    title: "Dashboards & Storytelling",
    subject: "Data Viz",
    semesters: 2,
    lessons: 12,
    students: 142,
    status: "published",
    updated: "1 w ago",
  },
];

export interface CourseSubject {
  id: string;
  title: string;
}

export interface CourseSemester {
  id: string;
  title: string;
  subjects: CourseSubject[];
}

export const COURSE_VIEWER_SEMESTERS: CourseSemester[] = [
  {
    id: "S1",
    title: "Module 1 · Foundations",
    subjects: [
      { id: "S1-1", title: "HTTP & request lifecycle" },
      { id: "S1-2", title: "TypeScript for backend" },
      { id: "S1-3", title: "Designing REST APIs" },
      { id: "S1-4", title: "Authentication & sessions" },
    ],
  },
  {
    id: "S2",
    title: "Module 2 · Data layer",
    subjects: [
      { id: "S2-1", title: "Relational data modelling" },
      { id: "S2-2", title: "Indexes & query plans" },
      { id: "S2-3", title: "Background jobs & queues" },
    ],
  },
];
