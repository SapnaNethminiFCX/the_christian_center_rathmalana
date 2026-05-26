/* TCCR v2 — Student surface, redesigned to match v1 EduPath screenshots.
   Three pages: Dashboard, My Courses, Course Detail (with batches/sem dates). */

const { useState: useTSS } = React;

const STUDENT_COURSES = [
  { id: "sc1", short: "SC", tag: "COURSE", coverKind: "purple", title: "Smoke Course A (updated)",  semesters: 1, requested: "14 May 2026", status: "approved", progress: 0  },
  { id: "tc2", short: "TC", tag: "COURSE", coverKind: "green",  title: "Test course 002 - updated", semesters: 3, requested: "14 May 2026", status: "approved", progress: 0  },
  { id: "fd",  short: "FD", tag: "COURSE", coverKind: "indigo", title: "Foundations of Faith",     semesters: 2, requested: "01 May 2026", status: "approved", progress: 32 },
  { id: "ot",  short: "OT", tag: "COURSE", coverKind: "teal",   title: "Old Testament Survey",      semesters: 2, requested: "01 May 2026", status: "approved", progress: 14 }
];
const STUDENT_PENDING = [
  { id: "p1", short: "DS", tag: "COURSE", coverKind: "amber", title: "Discipleship & the Great Commission", semesters: 1, requested: "12 May 2026", status: "pending" }
];
const STUDENT_REJECTED = [
  { id: "r1", short: "LD", tag: "COURSE", coverKind: "rose",   title: "Leadership in the Local Church", semesters: 2, requested: "20 Apr 2026", status: "rejected", reason: "Pre-req: complete Foundations first." },
  { id: "r2", short: "PR", tag: "COURSE", coverKind: "indigo", title: "Prophets & Wisdom",              semesters: 1, requested: "10 Apr 2026", status: "rejected", reason: "Course archived." }
];

/* Course covers — gradient + huge emblematic SVG (matches image 2). */
const COVER_BG = {
  purple: "linear-gradient(135deg, #4a206b 0%, #2a1342 100%)",
  green:  "linear-gradient(135deg, #1F3626 0%, #0e1f15 100%)",
  indigo: "linear-gradient(135deg, #1e2d6b 0%, #0e1a3f 100%)",
  teal:   "linear-gradient(135deg, #144d52 0%, #07262a 100%)",
  amber:  "linear-gradient(135deg, #5b3a13 0%, #2b1c08 100%)",
  rose:   "linear-gradient(135deg, #5d1f3a 0%, #2c0e1c 100%)"
};
const COVER_GLYPH = {
  purple: "brain", green: "book-open", indigo: "scroll", teal: "compass", amber: "heart-handshake", rose: "mic-2"
};

function TStudentCourseCard({ c, onClick }) {
  return (
    <article className="course-card my-card" onClick={() => onClick && onClick(c)} style={{ cursor: "pointer" }}>
      <div className="cover" style={{ background: COVER_BG[c.coverKind] || COVER_BG.green, position: "relative", overflow: "hidden", aspectRatio: "16/10" }}>
        <div style={{ position: "absolute", right: -20, bottom: -28, color: "rgba(188,233,85,0.12)" }}>
          <Icon name={COVER_GLYPH[c.coverKind] || "book-open"} size={170} strokeWidth={1.25} />
        </div>
        <div style={{ position: "absolute", left: 16, bottom: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(188,233,85,0.22)", color: "#BCE955", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13 }}>{c.short}</span>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, letterSpacing: 0.1, color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>{c.tag}</span>
        </div>
      </div>
      <div className="body" style={{ padding: "16px 20px 14px" }}>
        <div className="meta" style={{ marginBottom: 8 }}>
          <span><Icon name="layers" size={12} />{c.semesters} semester{c.semesters > 1 ? "s" : ""}</span>
          <span><Icon name="calendar" size={12} />Requested {c.requested}</span>
        </div>
        <h3 style={{ marginBottom: 10 }}>{c.title}</h3>
        {c.status === "approved" && <Badge tone="success">Approved</Badge>}
        {c.status === "pending"  && <Badge tone="warning">Pending</Badge>}
        {c.status === "rejected" && <Badge tone="error">Rejected</Badge>}
        {c.status === "rejected" && <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{c.reason}</div>}
      </div>
      {c.status === "approved" && c.progress > 0 && (
        <div className="progress-cap">
          <div className="bar"><i style={{ width: c.progress + "%" }}></i></div>
          <span className="pct">{c.progress}%</span>
        </div>
      )}
    </article>
  );
}

/* ─────────────────── Student Dashboard (matches image) */
const TStudentDashboard = ({ user, onNav, onContinue, onCourse }) => {
  const pending = STUDENT_PENDING.length;
  const continueCourse = STUDENT_COURSES[0];
  const inProgress = STUDENT_COURSES.filter(c => c.progress > 0);

  return (
    <Shell navItems={STUDENT_NAV_V2} active="dashboard" onNav={onNav} user={user} title="Dashboard"
           accent="Student" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
            <div className="greeting">You've completed <b style={{ color: "#152A24" }}>3 lessons</b> so far. Keep it up. {pending > 0 && <span style={{ color: "#D97706" }}>· {pending} enrollment pending approval</span>}</div>
          </div>
        </div>

        <div className="continue">
          <div>
            <div className="label">Continue learning</div>
            <h2>{continueCourse.title}</h2>
            <p className="sub">0 of 1 subjects completed</p>
            <div className="progress-row">
              <div className="bar"><i style={{ width: "0%" }}></i></div>
              <span className="pct">0%</span>
            </div>
            <Button icon="play" onClick={onContinue}>Start Course</Button>
          </div>
          <div className="cover" style={{ background: COVER_BG.green, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(188,233,85,0.32)", borderRadius: 14, overflow: "hidden" }}>
            <Icon name="play-circle" size={120} strokeWidth={1.25} />
          </div>
        </div>

        <div className="section-h">
          <h3>In progress</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("mycourses"); }}>View all</ArrowLink>
        </div>
        <div className="my-grid">
          {(inProgress.length > 0 ? inProgress : STUDENT_COURSES.slice(0, 2)).map(c => (
            <TStudentCourseCard key={c.id} c={c} onClick={onCourse} />
          ))}
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── My Courses list (matches image) */
const TStudentMyCourses = ({ user, onNav, onCourse }) => {
  const enrolled = STUDENT_COURSES.length;
  const pending = STUDENT_PENDING.length;
  const rejected = STUDENT_REJECTED.length;
  return (
    <Shell navItems={STUDENT_NAV_V2} active="mycourses" onNav={onNav} user={user} title="My Courses"
           accent="Student" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>My Courses</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{enrolled} enrolled</b> · {pending} pending · {rejected} rejected</div>
          </div>
          <Button variant="secondary" icon="search" onClick={() => onNav("school")}>Browse Courses</Button>
        </div>

        <div className="section-h" style={{ marginTop: 0 }}><h3>Enrolled</h3></div>
        <div className="my-grid">
          {STUDENT_COURSES.map(c => <TStudentCourseCard key={c.id} c={c} onClick={onCourse} />)}
        </div>

        {pending > 0 && (<>
          <div className="section-h"><h3>Pending approval</h3></div>
          <div className="my-grid">
            {STUDENT_PENDING.map(c => <TStudentCourseCard key={c.id} c={c} onClick={onCourse} />)}
          </div>
        </>)}

        {rejected > 0 && (<>
          <div className="section-h"><h3>Rejected</h3></div>
          <div className="my-grid">
            {STUDENT_REJECTED.map(c => <TStudentCourseCard key={c.id} c={c} onClick={onCourse} />)}
          </div>
        </>)}
      </div>
    </Shell>
  );
};

/* ─────────────────── Browse Courses (full catalog, student role) */
const TStudentBrowseCourses = ({ user, onNav, onCourse }) => {
  return (
    <Shell navItems={STUDENT_NAV_V2} active="school" onNav={onNav} user={user} title="Browse Courses"
           accent="Student" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Browse Courses</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{TCCR_COURSES.length}</b> courses available. Click any course → Request Enrollment to apply for an intake.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E5E5", borderRadius: 9999, padding: "8px 14px", minWidth: 280 }}>
            <Icon name="search" size={16} style={{ color: "#41574A" }} />
            <input placeholder="Search courses…" style={{ border: "none", outline: "none", flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", background: "transparent" }} />
          </div>
        </div>

        <div className="course-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {TCCR_COURSES.map(c => (
            <article key={c.id} className="course-card" onClick={() => onCourse(c)} style={{ cursor: "pointer" }}>
              <CourseCover kind={c.kind} emblem={c.emblem} tag={c.tag} />
              <div className="body">
                <div className="meta">
                  <span><Icon name="clock" size={12} />{c.time}</span>
                  <span><Icon name="layers" size={12} />{c.semesters} sem</span>
                  <span><Icon name="calendar-clock" size={12} />{c.batches} intake{c.batches > 1 ? "s" : ""}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <ArrowLink>View course</ArrowLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Course Detail (student) — matches image exactly:
   dark hero card with simple meta + Request Enrollment, then Syllabus card
   listing semesters/subjects (with batch + semester date scenarios). */
const TStudentCourseDetail = ({ user, onNav, course, onRequest }) => {
  const c = course || TCCR_COURSES[1];

  const semesters = [
    { id: "S1", num: 1, title: "Semester 1", start: "01 May 2026", end: "30 Jun 2026", state: "open",
      subjects: [
        { id: "su1", num: 1, title: "Test subject 001",  lessons: [{ id: "l1", title: "Lesson 001 updated" }, { id: "l2", title: "Lesson 002" }] },
        { id: "su2", num: 2, title: "Patriarchs",        lessons: [{ id: "l3", title: "Abraham" }, { id: "l4", title: "Isaac & Jacob" }] }
      ]
    },
    { id: "S2", num: 2, title: "Semester 2", start: "01 Jul 2026", end: "31 Aug 2026", state: "future",
      subjects: [
        { id: "su3", num: 3, title: "Kings & Prophets", lessons: [{ id: "l5", title: "Saul, David, Solomon" }] }
      ]
    }
  ];

  const batches = c.id === "c2" ? [
    { id: "b1", name: "Intake A · Q1 2026", start: "20 Jan 2026", end: "31 Jan 2026", state: "closed" },
    { id: "b2", name: "Intake B · Q2 2026", start: "01 Apr 2026", end: "15 Apr 2026", state: "open" },
    { id: "b3", name: "Intake C · Q3 2026", start: "01 Jul 2026", end: "15 Jul 2026", state: "open" }
  ] : [
    { id: "b1", name: "Intake A · Q1 2026", start: "20 Jan 2026", end: "31 Jan 2026", state: "closed" },
    { id: "b2", name: "Intake B · Q2 2026", start: "01 May 2026", end: "20 May 2026", state: "open" }
  ];

  const totalSubjects = semesters.reduce((n, s) => n + s.subjects.length, 0);

  return (
    <Shell navItems={STUDENT_NAV_V2} active="school" onNav={onNav} user={user} title="Course Details"
           accent="Student" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div style={{ background: "linear-gradient(135deg, #152A24 0%, #1F3626 100%)", borderRadius: 24, padding: 32, color: "#fff", marginBottom: 18, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -80, top: -80, width: 240, height: 240, borderRadius: 9999, background: "radial-gradient(circle, rgba(188,233,85,0.14), transparent 60%)" }}></div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 36, color: "#fff", margin: "0 0 14px", lineHeight: 1.1, position: "relative" }}>{c.title}</h1>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.75)", position: "relative", marginBottom: 22 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="layers" size={14} /> {c.semesters} semesters</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="play-circle" size={14} /> {totalSubjects} subjects</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="calendar" size={14} /> Published 14 May 2026</span>
          </div>
          <div style={{ display: "flex", gap: 12, position: "relative", flexWrap: "wrap" }}>
            <Button size="lg" icon="file-text" onClick={onRequest}>Request Enrollment</Button>
            <Button size="lg" variant="secondary-light" onClick={() => onNav("school")}>Back to catalog</Button>
          </div>
        </div>

        <div className="settings-card">
          <h2>Available intakes</h2>
          <p className="settings-sub">Pick the intake window you want when you request enrollment. Past intakes are auto-closed.</p>
          <div className="batches">
            {batches.map(b => <TBatchRow key={b.id} {...b} onApply={onRequest} />)}
          </div>
        </div>

        <div className="settings-card">
          <h2>Syllabus</h2>
          <p className="settings-sub">Course structure across all semesters. Enroll to unlock lessons, videos and materials.</p>
          {semesters.map(sem => (
            <div key={sem.id} className="semester" style={{ padding: "12px 0", borderTop: "1px solid #F6F6F6" }}>
              <div className="semester-head" style={{ paddingLeft: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9999, background: "rgba(188,233,85,0.22)", color: "#1F3626", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13 }}>{sem.num}</span>
                  <b>{sem.title}</b>
                  <span className={"sem-dates" + (sem.state === "closed" ? " disabled" : "")}><Icon name="calendar" size={11} /> {sem.start} → {sem.end}</span>
                </span>
              </div>
              <div style={{ padding: "8px 0 4px 40px" }}>
                {sem.subjects.map(sub => (
                  <div key={sub.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: sem.state === "closed" ? "#A0ACA6" : "#152A24" }}>
                      <Icon name="bookmark" size={14} /> {sub.title}
                    </div>
                    <div style={{ paddingLeft: 24, marginTop: 4 }}>
                      {sub.lessons.map(l => (
                        <div key={l.id} className={"subject" + (sem.state === "closed" ? " disabled" : "")} style={{ paddingLeft: 0, fontSize: 13 }}>
                          <span className="dot"><Icon name="play-circle" size={13} /></span> {l.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

Object.assign(window, {
  TStudentDashboard, TStudentMyCourses, TStudentBrowseCourses,
  TStudentCourseDetail, TStudentCourseCard, TStudentCourseView,
  TStudentNotifications, STUDENT_COURSES
});

/* ─────────────────── Notifications (matches v1 EduPath layout) */
function TStudentNotifications({ user, onNav, nav = STUDENT_NAV_V2, accent = "Student", active = "notifs" }) {
  const notifs = [
    { count: 7, title: "Enrollment Approved",  body: "Your enrollment has been approved.",                     when: "2 d ago" },
    { count: 3, title: "Enrollment Rejected",  body: "Your enrollment request was rejected.",                  when: "2 d ago" },
    { count: 5, title: "Registration Approved",body: "Your registration has been approved. You can now enroll in courses.", when: "3 d ago" }
  ];
  return (
    <Shell navItems={nav} active={active} onNav={onNav} user={user} title="Notifications"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Notifications</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>0</b> unread.</div>
          </div>
        </div>
        <div className="tbl-card" style={{ padding: 0 }}>
          {notifs.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "18px 22px", borderBottom: i < notifs.length - 1 ? "1px solid #F6F6F6" : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9999, background: "#EEF1EF", color: "#41574A", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="bell" size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "#152A24" }}>{n.title}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 9999, background: "#EEF1EF", color: "#41574A", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>x{n.count}</span>
                </div>
                <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 14, color: "#41574A" }}>{n.body}</div>
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#A0ACA6", whiteSpace: "nowrap" }}>{n.when}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ─────────────────── Course view (lesson watcher) — matches screenshot:
   full-bleed white sidebar + breadcrumb + h1 + YouTube embed. No app shell. */
function TStudentCourseView({ user, onNav, course }) {
  const courseName = (course && course.title) || "Introduction to Science by Sapna Nethmini";
  const intake = "Intake B · Q2 2026 · 01 May → 20 May 2026";
  const semesters = [
    { id: "S1", title: "Semester 1 · Past", start: "01 Jan 2026", end: "28 Feb 2026", disabled: true, subjects: [
      { id: "sub0", title: "Closed: past content", lessons: [
        { id: "l0", title: "Past lesson" }
      ]}
    ]},
    { id: "S2", title: "Semester 2 · Current", start: "01 May 2026", end: "30 Jun 2026", disabled: false, subjects: [
      { id: "sub1", title: "Fundamentals of Science", lessons: [
        { id: "l1", title: "Growth" },
        { id: "l2", title: "Plants" }
      ]},
      { id: "sub2", title: "Science for Students", lessons: [
        { id: "l3", title: "Lesson one" }
      ]}
    ]},
    { id: "S3", title: "Semester 3 · Future", start: "01 Aug 2026", end: "30 Sep 2026", disabled: true, subjects: [
      { id: "sub3", title: "Locked: future content", lessons: [
        { id: "l4", title: "Locked lesson" }
      ]}
    ]}
  ];
  const [activeLesson, setActiveLesson] = useTSS("l1");
  const allLessons = semesters.flatMap(s => s.subjects.flatMap(x => x.lessons.map(l => ({ ...l, semDisabled: s.disabled }))));
  const lesson = allLessons.find(l => l.id === activeLesson) || allLessons[0];
  const activeSem = semesters.find(s => s.subjects.some(x => x.lessons.some(l => l.id === activeLesson))) || semesters[0];
  const activeSubject = activeSem.subjects.find(s => s.lessons.some(l => l.id === activeLesson)) || activeSem.subjects[0];
  const isDisabled = !!lesson.semDisabled;

  return (
    <Shell navItems={STUDENT_NAV_V2} active="mycourses" onNav={onNav} user={user} title="Course View"
           accent="Student" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="cv-wrap">
        <aside className="cv-side">
          <div className="cv-side-head">
            <h2>{courseName.split(" by ")[0]} by</h2>
            <div className="byline">{courseName.split(" by ")[1] || "Sapna Nethmini"}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(188,233,85,0.22)", color: "#1F3626", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, marginBottom: 12 }}>
              <Icon name="calendar-clock" size={11} /> {intake}
            </div>
            <div className="cv-progress">
              <div className="bar"><i style={{ width: "0%" }}></i></div>
              <span className="pct">0%</span>
            </div>
            <div className="meta">0 of {allLessons.length} lessons completed</div>
          </div>

          {semesters.map(sem => (
            <div key={sem.id} className="cv-sem" style={sem.disabled ? { opacity: 0.45 } : {}}>
              <div className="cv-sem-head" style={sem.disabled ? { cursor: "not-allowed" } : {}}>
                <span>
                  {sem.title}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: sem.disabled ? "#B91C1C" : "#41574A", marginTop: 2 }}>
                    {sem.start} → {sem.end} {sem.disabled && "· closed"}
                  </div>
                </span>
                <Icon name={sem.disabled ? "lock" : "chevron-down"} size={16} />
              </div>
              {sem.subjects.map(sub => (
                <div key={sub.id}>
                  <div className={"cv-sub" + (sub.lessons.some(l => l.id === activeLesson) ? " open" : "")}
                       style={sem.disabled ? { cursor: "not-allowed" } : {}}>
                    <Icon name={sem.disabled ? "lock" : "play-circle"} size={16} className="play" /> {sub.title}
                  </div>
                  <div className="cv-lessons">
                    {sub.lessons.map(l => (
                      <div key={l.id}
                           className={"cv-lesson" + (l.id === activeLesson ? " active" : " todo")}
                           style={sem.disabled ? { cursor: "not-allowed", pointerEvents: "none" } : {}}
                           onClick={() => !sem.disabled && setActiveLesson(l.id)}>
                        <span className="dot"><Icon name={sem.disabled ? "lock" : (l.id === activeLesson ? "play-circle" : "circle")} size={14} /></span>
                        {l.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="cv-side-footer">
            <span className="brand"><i></i> © 2026 TCCR</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>v2.0.0</span>
          </div>
        </aside>

        <main className="cv-main">
          <div className="cv-crumbs">
            <a href="#" onClick={(e) => { e.preventDefault(); onNav && onNav("mycourses"); }} style={{ color: "#41574A", textDecoration: "none" }}>My Courses</a> · {courseName} · {activeSem.title} ({activeSem.start} → {activeSem.end}) · {activeSubject.title}
          </div>
          <h1>{lesson.title}</h1>
          {isDisabled ? (
            <div style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 14, padding: 32, textAlign: "center" }}>
              <Icon name="lock" size={36} style={{ color: "#B91C1C", marginBottom: 8 }} />
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "#152A24", margin: "0 0 6px" }}>This semester has ended</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#41574A", margin: 0 }}>Content is locked because the semester end date has passed. Video playback and downloads are disabled.</p>
            </div>
          ) : (
            <div className="cv-player">
              <iframe src={"https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"} title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen></iframe>
            </div>
          )}
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "#41574A", margin: "20px 0 28px" }}>
            You can learn about the growth of a human.
          </p>
          <div style={{ marginBottom: 28, opacity: isDisabled ? 0.45 : 1, pointerEvents: isDisabled ? "none" : "auto" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, color: "#152A24", margin: "0 0 12px" }}>Lesson materials {isDisabled && <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 12, color: "#B91C1C", marginLeft: 8 }}>· locked</span>}</h3>
            <div className="attach-item" style={isDisabled ? { cursor: "not-allowed" } : {}}>
              <div className="ico"><Icon name={isDisabled ? "lock" : "file-text"} size={16} /></div>
              <div className="name">Attachment (a9a5ceb3…)</div>
              <div className="size" style={{ display: "inline-flex", gap: 6 }}>
                <span style={{ padding: "2px 8px", border: "1px solid #E5E5E5", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>PDF</span>
                <span style={{ padding: "2px 8px", border: "1px solid #E5E5E5", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>DOC</span>
              </div>
              <button className="btn btn--ghost btn--sm" disabled={isDisabled}><Icon name="download" size={14} /></button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, paddingTop: 24, borderTop: "1px solid #E5E5E5" }}>
            <Button variant="secondary" icon="arrow-left">Previous lesson</Button>
            <Button icon="check" disabled={isDisabled}>Mark Complete</Button>
            <Button variant="secondary" iconAfter="arrow-right">Next lesson</Button>
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onNav && onNav("dashboard"); }}
               style={{ display: "inline-flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#41574A", textDecoration: "none" }}>
              <Icon name="layout-dashboard" size={16} /> Go to Dashboard
            </a>
          </div>
        </main>
      </div>
    </Shell>
  );
}
