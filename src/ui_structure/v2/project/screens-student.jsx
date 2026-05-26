/* EduPath UI kit — Student surface: dashboard + course viewer.
   Reuses the auth shell (sidebar + topbar) which is also used by Admin. */

const STUDENT_NAV = [
  { group: "Main" },
  { id: "dashboard", label: "Dashboard", ico: "layout-dashboard" },
  { id: "courses",   label: "My Courses", ico: "book-open" },
  { id: "profile",   label: "Profile", ico: "user" },
  { group: "Account" },
  { id: "settings",  label: "Settings", ico: "settings" },
  { id: "help",      label: "Help & Support", ico: "life-buoy" }
];

const ADMIN_NAV = [
  { group: "Approvals" },
  { id: "dashboard",      label: "Dashboard", ico: "layout-dashboard" },
  { id: "registrations",  label: "Registrations", ico: "user-plus", count: 8, hint: "New sign-ups" },
  { id: "enrolments",     label: "Enrolments", ico: "clipboard-list", count: 6, hint: "Course access" },
  { group: "Content" },
  { id: "courses",        label: "Courses", ico: "book-open" },
  { group: "System" },
  { id: "settings",       label: "Settings", ico: "settings" },
  { id: "audit",          label: "Audit Log", ico: "shield" }
];

const SUPERADMIN_NAV = [
  { group: "Platform" },
  { id: "dashboard",      label: "Dashboard", ico: "layout-dashboard" },
  { id: "admins",         label: "Administrators", ico: "shield-check", count: 2, hint: "Pending invites" },
  { group: "Approvals" },
  { id: "registrations",  label: "Registrations", ico: "user-plus", count: 8 },
  { id: "enrolments",     label: "Enrolments", ico: "clipboard-list", count: 6 },
  { group: "Content" },
  { id: "courses",        label: "Courses", ico: "book-open" },
  { group: "System" },
  { id: "settings",       label: "Settings", ico: "settings" },
  { id: "audit",          label: "Audit Log", ico: "history" }
];

/* Per-role notification feeds. Students see what happened to their
   approval requests; admins/super-admins see incoming approval requests. */
const STUDENT_NOTIFS = [
  { ico: "check-circle", tone: "success", title: "Enrolment approved · Mathematics Foundations", body: "You can now access lessons and materials.", when: "12 min ago", read: false },
  { ico: "check-circle", tone: "success", title: "Enrolment approved · Science Essentials",       body: "Course unlocked. Lesson 1 is ready.",       when: "Yesterday",   read: false },
  { ico: "clock",        tone: "warning", title: "Enrolment pending · Reading & Writing",         body: "Your request is awaiting admin approval.",  when: "2 days ago",  read: true  }
];
const ADMIN_NOTIFS = [
  { ico: "user-plus",      tone: "info", title: "New registration · Anjali Silva",                   body: "Awaiting sign-up approval.",          when: "2 min ago", read: false, link: "registrations" },
  { ico: "clipboard-list", tone: "info", title: "Enrolment request · Ravi T. → Mathematics Foundations", body: "Awaiting course-access approval.", when: "8 min ago", read: false, link: "enrolments" },
  { ico: "user-plus",      tone: "info", title: "New registration · Saman Perera",                   body: "Awaiting sign-up approval.",          when: "1 h ago",   read: false, link: "registrations" }
];
const SUPER_NOTIFS = [
  { ico: "user-plus",      tone: "info", title: "Admin invite accepted · Sahan Wijeratne", body: "Sahan can now access the admin console.", when: "20 min ago", read: false },
  { ico: "alert-triangle", tone: "warning", title: "12 failed sign-ins from 1 IP",         body: "Review security log.",                     when: "1 h ago",    read: false }
];

const Shell = ({ navItems, active, onNav, user, title, headerRight, children, onLogout, accent = "Student", notifications = [] }) => {
  /* Compute account-switch destinations from the user's roles[]. */
  const goHash = (h) => { window.location.hash = "#/" + h; window.scrollTo(0, 0); };
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const switches = [];
  if (accent !== "Member"        && roles.includes("member"))       switches.push({ label: "Switch to Member",        icon: "home",         go: () => goHash("member") });
  if (accent !== "Student"       && roles.includes("student"))      switches.push({ label: "Switch to Student",       icon: "graduation-cap", go: () => goHash("student") });
  if (accent !== "Leader"        && roles.includes("leader"))       switches.push({ label: "Switch to Leader",        icon: "users",        go: () => goHash("leader") });
  if (accent !== "G12 Leader"    && roles.includes("g12"))          switches.push({ label: "Switch to G12 Leader",    icon: "shield",       go: () => goHash("g12") });
  if (accent !== "Administrator" && roles.includes("admin"))        switches.push({ label: "Switch to Admin",         icon: "shield-check", go: () => goHash("admin") });
  if (accent !== "Super Admin"   && roles.includes("super_admin"))  switches.push({ label: "Switch to Super Admin",   icon: "key",          go: () => goHash("super") });
  return (
  <div className="shell">
    <aside className="sidebar">
      <div className="sidebar-logo"><Logo variant="reversed" height={26} /></div>
      <nav className="sidebar-nav">
        {navItems.map((it, i) => it.group ? (
          <div key={"g" + i} className="sidebar-group">{it.group}</div>
        ) : (
          <a key={it.id} href="#" className={"nav-item" + (active === it.id ? " active" : "")}
             onClick={(e) => { e.preventDefault(); onNav(it.id); }}>
            <Icon name={it.ico} size={18} />
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.count && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "#BCE955", color: "#152A24", padding: "1px 7px", borderRadius: 9999 }}>{it.count}</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Avatar src={user.avatar} size="md" name={user.name} />
        <div className="who">
          <div className="name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
          <div className="role">{accent}</div>
        </div>
        <button onClick={onLogout} title="Sign out" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 6 }}>
          <Icon name="log-out" size={16} />
        </button>
      </div>
    </aside>
    <main className="shell-main">
      <header className="topbar">
        <h1>{title}</h1>
        <div className="right">
          {headerRight}
          {window.LanguageSwitcher ? <LanguageSwitcher current="EN" /> : null}
          <NotificationsMenu items={notifications} onItemClick={(n) => n.link && onNav(n.link)} />
          <UserMenu user={user} role={accent} onLogout={onLogout} switches={switches} />
        </div>
      </header>
      {children}
      <footer className="shell-footer">
        <span>© 2026 EduPath. All rights reserved.</span>
      </footer>
    </main>
  </div>
);
};

const StudentDashboard = ({ user, onContinue, onCourse, onNav }) => {
  const inProgress = [
    { kind: "math", emblem: "code-2", tag: "Engineering", title: "Modern Backend Engineering", time: "8h 40m", lessons: "16 lessons", progress: 65 },
    { kind: "sci",  emblem: "brain-circuit", tag: "Machine Learning", title: "Applied Machine Learning", time: "10h 20m", lessons: "20 lessons", progress: 28 }
  ];
  const enrolled = [
    { kind: "lit",  emblem: "database", tag: "Data Analytics", title: "SQL for Analytics", time: "6h 50m", lessons: "14 lessons", progress: 0 },
    { kind: "soc",  emblem: "bar-chart-3", tag: "Data Viz", title: "Dashboards & Storytelling", time: "5h 10m", lessons: "12 lessons", progress: 0 }
  ];

  return (
    <Shell navItems={STUDENT_NAV} active="dashboard" onNav={onNav} user={user} title="Dashboard" onLogout={() => onNav("logout")} notifications={STUDENT_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
            <div className="greeting">You've completed <b style={{ color: "#152A24" }}>3 lessons</b> this week — keep it up.</div>
          </div>
        </div>

        {/* CONTINUE LEARNING */}
        <div className="continue">
          <div>
            <div className="label">Continue learning</div>
            <h2>Designing REST APIs</h2>
            <p className="sub">Lesson 10 of 16 · Modern Backend Engineering</p>
            <div className="progress-row">
              <div className="bar"><i style={{ width: "65%" }}></i></div>
              <span className="pct">65%</span>
            </div>
            <Button icon="play" onClick={onContinue}>Resume Lesson</Button>
          </div>
          <div className="cover" style={{ background: KIT.cover("math"), display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(188,233,85,0.4)", borderRadius: 14, overflow: "hidden" }}>
            <Icon name="code-2" size={120} strokeWidth={1.25} />
          </div>
        </div>

        {/* IN PROGRESS COURSES */}
        <div className="section-h">
          <h3>In progress</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("courses"); }}>View all</ArrowLink>
        </div>
        <div className="my-grid">
          {inProgress.map(c => (
            <article key={c.title} className="course-card my-card" onClick={() => onCourse(c)}>
              <CourseCover kind={c.kind} emblem={c.emblem} tag={c.tag} />
              <div className="body">
                <div className="meta"><span><Icon name="clock" size={12} />{c.time}</span><span><Icon name="layers" size={12} />{c.lessons}</span></div>
                <h3>{c.title}</h3>
              </div>
              <div className="progress-cap">
                <div className="bar"><i style={{ width: c.progress + "%" }}></i></div>
                <span className="pct">{c.progress}%</span>
              </div>
            </article>
          ))}
        </div>

        {/* ENROLLED, NOT STARTED */}
        <div className="section-h">
          <h3>Enrolled · not started</h3>
          <Button variant="ghost" size="sm" iconAfter="arrow-right" onClick={() => onNav("courses")}>Browse catalog</Button>
        </div>
        <div className="my-grid">
          {enrolled.map(c => (
            <article key={c.title} className="course-card my-card" onClick={() => onCourse(c)}>
              <CourseCover kind={c.kind} emblem={c.emblem} tag={c.tag} />
              <div className="body">
                <div className="meta"><span><Icon name="clock" size={12} />{c.time}</span><span><Icon name="layers" size={12} />{c.lessons}</span></div>
                <h3>{c.title}</h3>
                <Button size="sm" variant="secondary" iconAfter="arrow-right" onClick={(e) => { e.stopPropagation(); onCourse(c); }}>Start course</Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
};

const StudentCourseViewer = ({ user, course, onNav, onComplete }) => {
  const [activeSubject, setActiveSubject] = useState("S1-3");
  const [completed, setCompleted] = useState(new Set(["S1-1", "S1-2"]));
  const semesters = [
    { id: "S1", title: "Module 1 · Foundations", subjects: [
      { id: "S1-1", title: "HTTP & request lifecycle" },
      { id: "S1-2", title: "TypeScript for backend" },
      { id: "S1-3", title: "Designing REST APIs" },
      { id: "S1-4", title: "Authentication & sessions" }
    ]},
    { id: "S2", title: "Module 2 · Data layer", subjects: [
      { id: "S2-1", title: "Relational data modelling" },
      { id: "S2-2", title: "Indexes & query plans" },
      { id: "S2-3", title: "Background jobs & queues" }
    ]}
  ];
  const total = semesters.reduce((n, s) => n + s.subjects.length, 0);
  const pct = Math.round(completed.size / total * 100);

  const markComplete = () => {
    const next = new Set(completed);
    next.add(activeSubject);
    setCompleted(next);
    onComplete && onComplete();
  };

  return (
    <Shell navItems={STUDENT_NAV} active="courses" onNav={onNav} user={user} title="Modern Backend Engineering" onLogout={() => onNav("logout")} notifications={STUDENT_NOTIFS}>
      <div className="viewer">
        <aside className="viewer-side">
          <div className="head">
            <h2>Modern Backend Engineering</h2>
            <div className="progress-row">
              <div className="bar"><i style={{ width: pct + "%" }}></i></div>
              <span className="pct">{pct}%</span>
            </div>
          </div>
          {semesters.map(sem => (
            <div className="semester" key={sem.id}>
              <div className="semester-head">{sem.title} <Icon name="chevron-down" size={14} /></div>
              {sem.subjects.map(sub => {
                const done = completed.has(sub.id);
                const active = activeSubject === sub.id;
                return (
                  <div key={sub.id}
                       className={"subject" + (active ? " active" : "") + (done ? " completed" : !active ? " notstarted" : "")}
                       onClick={() => setActiveSubject(sub.id)}>
                    <span className="dot">
                      <Icon name={done ? "check-circle" : active ? "play-circle" : "circle"} size={14} />
                    </span>
                    {sub.title}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>
        <div className="viewer-main">
          <div className="crumbs">My Courses · Modern Backend Engineering · <span>Designing REST APIs</span></div>
          <h1>Designing REST APIs</h1>
          <div className="player">
            <img src={(window.__resources && window.__resources.playerImg) || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80"} alt="" />
            <div className="play"><Icon name="play" size={32} style={{ marginLeft: 4 }} /></div>
          </div>
          <p className="desc">REST is still the default contract for most service-to-service traffic on the web. In this lesson we'll cover resource modelling, HTTP verb semantics, status codes you actually need, and idempotency — with worked examples from a real production codebase.</p>
          <div className="attachments">
            <h3>Lesson materials</h3>
            <div className="attach-item">
              <div className="ico"><Icon name="file-text" size={16} /></div>
              <div className="name">REST API Design · Cheatsheet</div>
              <div className="size">PDF · 312 KB</div>
              <button className="btn btn--ghost btn--sm"><Icon name="download" size={14} /></button>
            </div>
            <div className="attach-item">
              <div className="ico"><Icon name="file-text" size={16} /></div>
              <div className="name">Lab · Build a paginated /users endpoint</div>
              <div className="size">Browser sandbox</div>
              <button className="btn btn--ghost btn--sm"><Icon name="external-link" size={14} /></button>
            </div>
          </div>
          <div className="viewer-actions">
            <Button variant="secondary" icon="arrow-left">Previous lesson</Button>
            <Button icon="check" onClick={markComplete}>Mark Complete</Button>
            <Button variant="secondary" iconAfter="arrow-right">Next lesson</Button>
          </div>
        </div>
      </div>
    </Shell>
  );
};

const StudentStubPage = ({ user, onNav, active, title, eyebrow, blurb, ico, body }) => (
  <Shell navItems={STUDENT_NAV} active={active} onNav={onNav} user={user} title={title} onLogout={() => onNav("logout")} notifications={STUDENT_NOTIFS}>
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <div className="greeting">{eyebrow}</div>
        </div>
      </div>
      <div className="stub-card">
        <div className="stub-ico"><Icon name={ico} size={28} /></div>
        <h2>{blurb}</h2>
        {body && <p>{body}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Button onClick={() => onNav("dashboard")} icon="arrow-left" variant="secondary">Back to dashboard</Button>
          <Button onClick={() => onNav("courses")} iconAfter="arrow-right">Browse courses</Button>
        </div>
      </div>
    </div>
  </Shell>
);

Object.assign(window, { Shell, StudentDashboard, StudentCourseViewer, StudentStubPage, STUDENT_NAV, ADMIN_NAV, SUPERADMIN_NAV, STUDENT_NOTIFS, ADMIN_NOTIFS, SUPER_NOTIFS });
