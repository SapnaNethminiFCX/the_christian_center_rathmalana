/* TCCR v2 — Member surface (every user gets these by default).
   Pages: Member Home, Apply (become a student), Bible School catalog,
   Course detail (with Batches), My Requests, My Cells (read-only),
   Profile (linked accounts + preferred language). */

const { useState: useTMS } = React;

const MEMBER_NAV = [
  { group: "Main" },
  { id: "home",     label: "Home",          ico: "home" },
  { id: "school",   label: "Bible School",  ico: "book-open" },
  { id: "cells",    label: "Cell Groups",   ico: "users" },
  { group: "Account" },
  { id: "profile",  label: "Profile",       ico: "user" },
  { id: "notifs",   label: "Notifications", ico: "bell" }
];

/* Matches v1 student sidebar image — MAIN: Dashboard / My Courses /
   Browse Courses / Profile · ACCOUNT: My Requests / Notifications. */
const STUDENT_NAV_V2 = [
  { group: "Main" },
  { id: "home",      label: "Home",          ico: "home" },
  { id: "dashboard", label: "Dashboard",     ico: "layout-dashboard" },
  { id: "mycourses", label: "My Courses",    ico: "book-open" },
  { id: "school",    label: "Browse Courses",ico: "search" },
  { id: "profile",   label: "Profile",       ico: "user" },
  { group: "Account" },
  { id: "requests",  label: "My Requests",   ico: "file-text" },
  { id: "notifs",    label: "Notifications", ico: "bell" }
];

const LEADER_NAV = [
  { group: "Main" },
  { id: "home",       label: "Home",         ico: "home" },
  { id: "leaderdash", label: "Dashboard",   ico: "layout-dashboard" },
  { id: "mycells",    label: "Cells",       ico: "users" },
  { id: "school",     label: "Bible School",ico: "book-open" },
  { group: "Account" },
  { id: "notifs",     label: "Notifications", ico: "bell" },
  { id: "profile",    label: "Profile",     ico: "user" }
];

const G12_NAV = [
  { group: "Main" },
  { id: "home",       label: "Home",        ico: "home" },
  { id: "leaderdash", label: "Dashboard",   ico: "layout-dashboard" },
  { id: "mycells",    label: "Cells",       ico: "users" },
  { id: "network",    label: "Leaders Network", ico: "network" },
  { id: "promote",    label: "Promote",     ico: "user-plus" },
  { id: "school",     label: "Bible School",ico: "book-open" },
  { group: "Account" },
  { id: "notifs",     label: "Notifications", ico: "bell" },
  { id: "profile",    label: "Profile",     ico: "user" }
];

/* Notifications */
const MEMBER_NOTIFS = [
  { ico: "user-check",  tone: "success", title: "Welcome to TCCR — you're a Member", body: "Apply to be a Student to enrol in courses.", when: "Just now", read: false },
  { ico: "users",       tone: "info",    title: "Added to cell · Care Cell · Mt Lavinia", body: "Tania F. added you as a member.", when: "2 d ago", read: true }
];

/* Course catalog data */
const TCCR_COURSES = [
  { id: "c1", kind: "math", emblem: "book-open",    tag: "Foundations",  title: "New Believers Foundations",   time: "8h 40m", lessons: "16 lessons", semesters: 2, batches: 2, desc: "Core teaching for new believers — baptism, salvation, the Holy Spirit and your identity in Christ." },
  { id: "c2", kind: "sci",  emblem: "scroll",        tag: "Bible",        title: "Old Testament Survey",        time: "10h 20m",lessons: "20 lessons", semesters: 2, batches: 3, desc: "Genesis to Malachi — patriarchs, kings, prophets and the story of redemption." },
  { id: "c3", kind: "lit",  emblem: "heart",         tag: "Discipleship", title: "Discipleship & the Great Commission", time: "6h 50m", lessons: "14 lessons", semesters: 1, batches: 1, desc: "How to disciple another believer — relational, repeatable, biblical." },
  { id: "c4", kind: "soc",  emblem: "mic-2",         tag: "Leadership",   title: "Leadership in the Local Church", time: "5h 10m", lessons: "12 lessons", semesters: 2, batches: 2, desc: "Servant leadership, team dynamics and pastoral care for cell-group leaders." }
];

const TBatchRow = ({ name, start, end, capacity, state = "open", onApply }) => (
  <div className={"batch-row " + (state === "closed" ? "closed" : "")}>
    <div className="ico"><Icon name={state === "closed" ? "x-circle" : "calendar-clock"} size={18} /></div>
    <div className="b-body">
      <div className="name">{name}</div>
      <div className="window">
        <span><Icon name="calendar" size={12} /> {start} → {end}</span>
        <span className="sep">·</span>
        <span><Icon name="users" size={12} /> {capacity || "—"} seats</span>
      </div>
    </div>
    {state === "closed" ? <Badge tone="archive">Closed</Badge>
     : state === "draft" ? <Badge tone="warning">Draft</Badge>
     : <Badge tone="success">Open</Badge>}
    {state === "open" && <Button size="sm" iconAfter="arrow-right" onClick={onApply}>Apply</Button>}
  </div>
);

/* ─────────────────── Member Home (member-only state) */
const TMemberHome = ({ user, onNav, role = "member", hasLeaderRole = false, hasG12Role = false }) => (
  <Shell navItems={MEMBER_NAV} active="home" onNav={onNav} user={user} title="Home"
         onLogout={() => onNav("logout")} accent="Member" notifications={MEMBER_NOTIFS}>
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome to TCCR, {user.name.split(" ")[0]}.</h1>
          <div className="greeting">You're signed in as a <b style={{ color: "#152A24" }}>Member</b>. <RoleBadgeStack roles={Array.isArray(user.roles) ? user.roles : [role]} /></div>
        </div>
      </div>

      <div className="module-tiles">
        <div className="mod-tile bs" onClick={() => onNav("school")}>
          <div>
            <div className="label">Module · Bible School</div>
            <h2>Become a Student</h2>
            <p>Bible School courses require Student access. Submit a request — admins review it within 24 hours.</p>
          </div>
          <div className="row pill-row">
            <a href="#" onClick={(e) => { e.preventDefault(); onNav("school"); }}>Request access <Icon name="arrow-right" size={14} /></a>
          </div>
          <div className="glyph"><Icon name="book-open" size={200} strokeWidth={1} /></div>
        </div>
        <div className="mod-tile cg" onClick={() => onNav("cells")}>
          <div>
            <div className="label">Module · Cell Groups</div>
            <h2>My Cells</h2>
            <p>See cells you belong to and weekly reports. Read-only — only your Leader can file new reports.</p>
          </div>
          <div className="row pill-row">
            <a href="#" onClick={(e) => { e.preventDefault(); onNav("cells"); }}>View my cells <Icon name="arrow-right" size={14} /></a>
          </div>
          <div className="glyph"><Icon name="users" size={200} strokeWidth={1} /></div>
        </div>
      </div>

      <div className="role-banner">
        <div className="ico"><Icon name="graduation-cap" size={20} /></div>
        <div className="b-body">
          <h3>You're at the starting line — be a Student.</h3>
          <p>Click Bible School in the sidebar to request Student access. Approval unlocks every course and the full Bible School workspace.</p>
        </div>
        <Button onClick={() => onNav("school")} iconAfter="arrow-right">Request access</Button>
      </div>
    </div>
  </Shell>
);

/* ─────────────────── Waiting-for-approval screen (matches the design) */
const TWaitingForApproval = ({ user, onNav, course, batch }) => {
  return (
    <Shell navItems={MEMBER_NAV} active="school" onNav={onNav} user={user} title="Bible School"
           accent="Member" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="wfa-wrap">
          <div className="wfa-rings">
            <div className="wfa-bulb"><Icon name="clock" size={40} strokeWidth={2.25} /></div>
          </div>
          <h1 className="wfa-title">Waiting for approval</h1>
          <p className="wfa-blurb">
            Thanks, <b>{user.name.split(" ")[0]}</b>. An administrator is reviewing your Student access request{course ? <> for <b>{course}</b></> : null}. We'll email <b>{user.email || "you"}</b> as soon as you're approved, usually within <b>24 hours</b>.
          </p>
          <div className="wfa-steps">
            <div className="wfa-step done">
              <span className="marker"><Icon name="check" size={14} /></span>
              <div>
                <div className="name">Application submitted</div>
                <div className="meta">Just now {batch ? "· " + batch : ""}</div>
              </div>
            </div>
            <div className="wfa-step active">
              <span className="marker"><Icon name="clock" size={14} /></span>
              <div>
                <div className="name">In review by admin</div>
                <div className="meta">We're verifying your details</div>
              </div>
            </div>
            <div className="wfa-step pending">
              <span className="marker"><Icon name="user-check" size={14} /></span>
              <div>
                <div className="name">Approved</div>
                <div className="meta">Email sent with a one-time sign-in link</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 32, justifyContent: "center" }}>
            <Button variant="secondary" icon="arrow-left" onClick={() => onNav("home")}>Back to home</Button>
            <Button variant="ghost" icon="users" onClick={() => onNav("cells")}>View cell groups</Button>
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Request-to-be-Student form
   Simplified per v2 flow: members request Student ACCESS only — no course
   or batch yet. Course enrolments happen later, after they're a Student. */
const TRequestStudentAccess = ({ user, onNav, onSubmit }) => {
  const [reason, setReason] = useTMS("");
  return (
    <Shell navItems={MEMBER_NAV} active="school" onNav={onNav} user={user} title="Bible School"
           accent="Member" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Request Student access</h1>
            <div className="greeting">Become a Student to unlock the full Bible School workspace — browse courses, request enrolments, and track your learning.</div>
          </div>
        </div>

        <div className="flow-strip">
          <div className="flow-step active"><i>1</i> Request access <small>You're here</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>2</i> Admin review <small>Within 24 hours</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>3</i> Student workspace <small>Browse + request enrolments</small></div>
        </div>

        <div className="settings-card">
          <h2>What you'll get as a Student</h2>
          <p className="settings-sub">No extra fields — just confirm and submit. Once an admin approves, your Student workspace unlocks instantly.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 18 }}>
            {[
              { ico: "book-open",     title: "Browse the full catalog",  body: "See every course with batches and semester dates." },
              { ico: "calendar-clock",title: "Request course enrolment", body: "Pick an open intake — admins approve per course." },
              { ico: "play-circle",   title: "Lessons + materials",      body: "Watch embedded videos and download attachments." },
              { ico: "trending-up",   title: "Track your progress",      body: "See completion across every semester at a glance." }
            ].map(f => (
              <div key={f.title} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: "#FAFAFA", borderRadius: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(188,233,85,0.22)", color: "#1F3626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={f.ico} size={18} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14, color: "#152A24" }}>{f.title}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A", marginTop: 2, lineHeight: 1.4 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => onNav("home")}>Cancel</Button>
            <Button icon="send" onClick={() => onSubmit && onSubmit({})}>Submit request</Button>
          </div>
        </div>

        <div className="role-banner">
          <div className="ico"><Icon name="info" size={20} /></div>
          <div className="b-body">
            <h3>What happens after approval?</h3>
            <p>You'll keep your Member status — the Student role is added on top. Sign in next, and you'll land on a full Student workspace with Dashboard, My Courses, Browse Courses and My Requests in the sidebar.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Bible School catalog */
const TBibleSchoolCatalog = ({ user, onNav, role = "member", onCourse }) => {
  const nav = role === "student" ? STUDENT_NAV_V2 : MEMBER_NAV;
  return (
    <Shell navItems={nav} active="school" onNav={onNav} user={user} title="Bible School · Catalog"
           accent={role === "student" ? "Student" : "Member"}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Bible School</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{TCCR_COURSES.length}</b> courses across foundation, leadership, and discipleship tracks.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button variant="secondary" icon="search">Search</Button>
          </div>
        </div>

        {role === "member" && (
          <div className="role-banner">
            <div className="ico"><Icon name="info" size={20} /></div>
            <div className="b-body">
              <h3>You're a Member — that's the first step.</h3>
              <p>To enrol, click a course → "Apply to Enroll". Approval grants Student role and unlocks lessons in one decision.</p>
            </div>
            <RoleBadgeStack roles={[role]} />
          </div>
        )}

        <div className="course-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {TCCR_COURSES.map(c => (
            <article key={c.id} className="course-card" onClick={() => onCourse(c)}>
              <CourseCover kind={c.kind} emblem={c.emblem} tag={c.tag} />
              <div className="body">
                <div className="meta">
                  <span><Icon name="clock" size={12} />{c.time}</span>
                  <span><Icon name="layers" size={12} />{c.semesters} sem</span>
                  <span><Icon name="calendar-clock" size={12} />{c.batches} intake{c.batches > 1 ? "s" : ""}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <ArrowLink>View course</ArrowLink>
                  {role === "member" && <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#41574A" }}>Member · apply to enrol</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Course detail with BATCHES + semester outline */
const TCourseDetail = ({ user, onNav, role = "member", course, onApply, onContinue }) => {
  const nav = role === "student" ? STUDENT_NAV_V2 : MEMBER_NAV;
  const c = course || TCCR_COURSES[1];

  const batches = c.id === "c2" ? [
    { id: "b1", name: "Intake A · Q1 2026", start: "20 Jan 2026", end: "31 Jan 2026", state: "closed", capacity: 45 },
    { id: "b2", name: "Intake B · Q2 2026", start: "01 Apr 2026", end: "15 Apr 2026", state: "open",   capacity: 60 },
    { id: "b3", name: "Intake C · Q3 2026", start: "01 Jul 2026", end: "15 Jul 2026", state: "open",   capacity: 60 }
  ] : [
    { id: "b1", name: "Intake A · Q1 2026", start: "20 Jan 2026", end: "31 Jan 2026", state: "closed", capacity: 50 },
    { id: "b2", name: "Intake B · Q2 2026", start: "01 May 2026", end: "20 May 2026", state: "open",   capacity: 60 }
  ];

  const semesters = [
    { id: "S1", title: "Semester 1 · Foundations",   start: "01 May 2026", end: "30 Jun 2026", state: "open",
      subjects: ["Beginnings", "Patriarchs", "Exodus & Wilderness", "Conquest of Canaan"] },
    { id: "S2", title: "Semester 2 · Kings & Prophets", start: "01 Jul 2026", end: "31 Aug 2026", state: "future",
      subjects: ["Saul, David, Solomon", "Divided Kingdom", "Prophets", "Exile & Return"] }
  ];

  return (
    <Shell navItems={nav} active="school" onNav={onNav} user={user} title="Course Details"
           accent={role === "student" ? "Student" : "Member"}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="cd-header">
          <Eyebrow dark>{c.tag}</Eyebrow>
          <h1 style={{ position: "relative" }}>{c.title}</h1>
          <div className="meta">
            <span><Icon name="layers" size={14} /> {c.semesters} semesters</span>
            <span><Icon name="play-circle" size={14} /> {c.lessons}</span>
            <span><Icon name="clock" size={14} /> {c.time}</span>
            <span><Icon name="calendar-clock" size={14} /> {batches.filter(b => b.state === "open").length} open intake{batches.filter(b => b.state === "open").length === 1 ? "" : "s"}</span>
          </div>
          <div className="cd-actions">
            {role === "member" && <Button size="lg" icon="file-text" onClick={onApply}>Apply to Enroll</Button>}
            {role === "student" && <Button size="lg" icon="play" onClick={onContinue}>Continue learning</Button>}
            <Button size="lg" variant="secondary-light" icon="arrow-left" onClick={() => onNav("school")}>Back to catalog</Button>
          </div>
        </div>

        <div className="settings-card">
          <h2>Choose your Batch</h2>
          <p className="settings-sub">Each batch is a separate cohort with its own intake window. Past intakes are auto-closed.</p>
          <div className="batches">
            {batches.map(b => <TBatchRow key={b.id} {...b} onApply={onApply} />)}
          </div>
        </div>

        <div className="settings-card">
          <h2>Syllabus</h2>
          <p className="settings-sub">Course structure across all semesters. Enrol to unlock lessons, videos and materials.</p>
          {semesters.map(sem => (
            <div key={sem.id} className="semester" style={{ padding: "12px 0", borderTop: "1px solid #F6F6F6" }}>
              <div className="semester-head" style={{ paddingLeft: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icon name="folder" size={14} /> <b>{sem.title}</b>
                  <span className={"sem-dates" + (sem.state === "closed" ? " disabled" : "")}><Icon name="calendar" size={11} /> {sem.start} → {sem.end}</span>
                </span>
                <Icon name="chevron-down" size={14} />
              </div>
              <div style={{ padding: "4px 0 8px" }}>
                {sem.subjects.map((s, i) => (
                  <div key={i} className={"subject" + (sem.state === "closed" ? " disabled" : "")} style={{ paddingLeft: 16 }}>
                    <span className="dot"><Icon name={role === "student" ? "play-circle" : "lock"} size={14} /></span>
                    {s}
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

/* ─────────────────── Apply to Enroll form */
const TApply = ({ user, onNav, course, onSubmit }) => {
  const c = course || TCCR_COURSES[1];
  const [batch, setBatch] = useTMS("b2");
  const [note, setNote] = useTMS("");
  const batches = [
    { id: "b2", name: "Intake B · Q2 2026 · 01 May → 20 May" },
    { id: "b3", name: "Intake C · Q3 2026 · 01 Jul → 15 Jul" }
  ];
  return (
    <Shell navItems={MEMBER_NAV} active="school" onNav={onNav} user={user} title="Apply to Enroll"
           accent="Member" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Apply to Enroll</h1>
            <div className="greeting">Bible School · <b style={{ color: "#152A24" }}>{c.title}</b></div>
          </div>
          <Button variant="secondary" icon="arrow-left" onClick={() => onNav("school/" + c.id)}>Back to course</Button>
        </div>

        <div className="flow-strip">
          <div className="flow-step active"><i>1</i> Apply <small>You're here</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>2</i> Admin review <small>Within 24 hours</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>3</i> Student access <small>Lessons unlock</small></div>
        </div>

        <div className="settings-card">
          <h2>Application details</h2>
          <p className="settings-sub">Pick an open batch and add a short note for the admin if you want.</p>
          <div className="form-grid one">
            <Input label="Course" defaultValue={c.title} disabled />
            <div className="field">
              <label className="label">Batch / Intake</label>
              <select className="input" value={batch} onChange={(e) => setBatch(e.target.value)}>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <span className="hint">Past intakes are not shown.</span>
            </div>
            <div className="field">
              <label className="label">Note to admin <span style={{ color: "#A0ACA6", fontWeight: 400 }}>· optional, 200 chars</span></label>
              <textarea className="input" rows={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell the admin why you'd like to join this course." />
            </div>
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => onNav("school")}>Cancel</Button>
            <Button icon="send" onClick={onSubmit}>Submit application</Button>
          </div>
        </div>

        <div className="role-banner" style={{ marginTop: 18 }}>
          <div className="ico"><Icon name="info" size={20} /></div>
          <div className="b-body">
            <h3>One decision, two grants.</h3>
            <p>Approval grants you Student role <i>and</i> enrols you in this batch — no double approval.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── My Requests */
const TMyRequests = ({ user, onNav, role = "member" }) => {
  const nav = role === "student" ? STUDENT_NAV_V2 : MEMBER_NAV;
  const rows = [
    { course: "Old Testament Survey",  batch: "Intake B · Q2 2026", submitted: "Today, 09:14",  status: "pending",  decided: "—",         note: "—" },
    { course: "Discipleship & Great Commission", batch: "Intake A · Q1 2026", submitted: "3 weeks ago", status: "approved", decided: "12 Apr 2026", note: "Welcome — Tania F." },
    { course: "Leadership in Church",   batch: "Intake A · Q1 2026", submitted: "2 months ago",   status: "rejected", decided: "21 Mar 2026", note: "Pre-req: complete Foundations first." }
  ];
  return (
    <Shell navItems={nav} active="requests" onNav={onNav} user={user} title="My Requests"
           accent={role === "student" ? "Student" : "Member"}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>My Requests</h1>
            <div className="greeting">Track every application — Student role, course enrolment, or future leader promotion.</div>
          </div>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Course</th><th>Batch</th><th>Submitted</th><th>Decision</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><div style={{ fontWeight: 600 }}>{r.course}</div></td>
                  <td className="muted">{r.batch}</td>
                  <td className="muted">{r.submitted}</td>
                  <td className="muted">{r.decided}</td>
                  <td>
                    {r.status === "pending"  && <Badge tone="warning">Pending</Badge>}
                    {r.status === "approved" && <Badge tone="success">Approved</Badge>}
                    {r.status === "rejected" && <Badge tone="error">Rejected</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Profile (linked accounts, preferred language) */
const TProfile = ({ user, onNav, role = "member", nav = MEMBER_NAV, notifications = MEMBER_NOTIFS, accent = "Member" }) => {
  const [tab, setTab] = useTMS("profile");
  const [toast, setToast] = useTMS(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };
  return (
    <Shell navItems={nav} active="profile" onNav={onNav} user={user} title="Profile"
           accent={accent} onLogout={() => onNav("logout")} notifications={notifications}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Profile</h1>
            <div className="greeting">Update your account, preferred language, and linked sign-in methods.</div>
          </div>
        </div>

        <div className="settings-tabs">
          {[
            { id: "profile",  label: "Profile",          ico: "user" },
            { id: "password", label: "Update password",  ico: "key" }
          ].map(t => (
            <button key={t.id} className={"settings-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
              <Icon name={t.ico} size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="settings-card">
            <h2>Your details</h2>
            <p className="settings-sub">Roles: <RoleBadgeStack roles={Array.isArray(user.roles) ? user.roles : [role]} /></p>
            <div className="avatar-row">
              <Avatar src={user.avatar} size="xl" name={user.name} />
              <div>
                <Button variant="secondary" icon="upload" size="sm">Upload photo</Button>
                <div className="hint" style={{ marginTop: 6 }}>JPG or PNG · max 2 MB</div>
              </div>
            </div>
            <div className="form-grid two">
              <Input label="First name" defaultValue={user.name.split(" ")[0]} />
              <Input label="Last name"  defaultValue={user.name.split(" ").slice(1).join(" ")} />
              <Input label="Email" type="email" defaultValue="priya@example.com" hint="Used for sign-in and notifications" />
              <Input label="Phone" type="tel" defaultValue="+94 77 555 0142" />
            </div>
            <div className="form-actions">
              <Button variant="ghost">Cancel</Button>
              <Button icon="check" onClick={() => flash({ tone: "success", title: "Profile saved" })}>Save changes</Button>
            </div>
          </div>
        )}

        {tab === "password" && (
          <div className="settings-card">
            <h2>Update password</h2>
            <p className="settings-sub">Use a strong password you don't reuse anywhere else. You'll stay signed in on this device after a successful change.</p>
            <div className="form-grid one">
              <Input label="Current password" type="password" placeholder="••••••••" />
              <Input label="New password" type="password" placeholder="At least 10 characters"
                hint="Mix uppercase, lowercase, numbers and symbols." />
              <Input label="Confirm new password" type="password" placeholder="Re-enter new password" />
            </div>
            <div className="form-actions">
              <Button variant="ghost">Cancel</Button>
              <Button icon="check" onClick={() => flash({ tone: "success", title: "Password updated", message: "You'll be signed out from other devices." })}>Update password</Button>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

Object.assign(window, {
  MEMBER_NAV, STUDENT_NAV_V2, LEADER_NAV, G12_NAV, MEMBER_NOTIFS, TCCR_COURSES,
  TMemberHome, TBibleSchoolCatalog, TCourseDetail, TApply, TMyRequests, TProfile, TBatchRow
});
