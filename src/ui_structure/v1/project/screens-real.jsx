/* EduPath UI kit — real (non-stub) detail pages.
   Replaces several "coming soon" stubs with actual UI:
     · Student Settings    — profile / username / password
     · Admin Courses       — list + add-course wizard (semester → subject → lesson)
     · Admin Settings      — admin's own profile editor
     · Admin Audit Log     — searchable, filterable timeline
     · Super Admin Admins  — list + add-admin form with permission scopes */

const { useState: useS2 } = React;

/* ────────────────────────────────────────── STUDENT · SETTINGS */

const StudentSettings = ({ user, onNav }) => {
  const [tab, setTab] = useS2("profile");
  const [toast, setToast] = useS2(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2800); };

  return (
    <Shell navItems={STUDENT_NAV} active="settings" onNav={onNav} user={user} title="Settings" onLogout={() => onNav("logout")} notifications={STUDENT_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Settings</h1>
            <div className="greeting">Manage your profile, username and password.</div>
          </div>
        </div>

        <div className="settings-tabs">
          {[
            { id: "profile",  label: "Profile",  ico: "user" },
            { id: "username", label: "Username", ico: "at-sign" },
            { id: "password", label: "Password", ico: "key" }
          ].map(t => (
            <button key={t.id} className={"settings-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
              <Icon name={t.ico} size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="settings-card">
            <h2>Profile</h2>
            <p className="settings-sub">This is how you appear to instructors and other learners.</p>
            <div className="avatar-row">
              <Avatar src={user.avatar} size="xl" name={user.name} />
              <div>
                <Button variant="secondary" icon="upload" size="sm">Upload new photo</Button>
                <div className="hint" style={{ marginTop: 6 }}>JPG or PNG · max 2 MB.</div>
              </div>
            </div>
            <div className="form-grid two">
              <Input label="First name" defaultValue="Priya" />
              <Input label="Last name"  defaultValue="Mendis" />
              <Input label="Email" type="email" defaultValue="priya@example.com" hint="Used for sign-in and notifications." />
              <Input label="Phone" type="tel" defaultValue="+94 77 555 0142" />
            </div>
            <div className="form-grid one">
              <div className="field">
                <label className="label">Bio</label>
                <textarea className="input" rows={3} defaultValue="Year 12 student aiming to bridge into a Sri Lankan engineering programme." />
              </div>
            </div>
            <div className="form-actions">
              <Button variant="ghost">Cancel</Button>
              <Button icon="check" onClick={() => flash({ tone: "success", title: "Profile saved" })}>Save changes</Button>
            </div>
          </div>
        )}

        {tab === "username" && (
          <div className="settings-card">
            <h2>Username</h2>
            <p className="settings-sub">Your unique handle on EduPath.</p>
            <div className="form-grid one">
              <Input label="Current username" defaultValue="priya.mendis" disabled />
              <Input label="New username" placeholder="e.g. priya.m" hint="Lowercase, dots or underscores. 3–24 characters." />
            </div>
            <div className="form-actions">
              <Button variant="ghost">Cancel</Button>
              <Button icon="check" onClick={() => flash({ tone: "success", title: "Username updated" })}>Update username</Button>
            </div>
          </div>
        )}

        {tab === "password" && (
          <div className="settings-card">
            <h2>Password</h2>
            <p className="settings-sub">Use a strong password you don't reuse anywhere else.</p>
            <div className="form-grid one">
              <Input label="Current password" type="password" placeholder="••••••••" />
              <Input label="New password" type="password" placeholder="At least 10 characters" hint="Mix uppercase, lowercase, numbers and symbols." />
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

/* ────────────────────────────────────────── ADMIN · COURSES (list + add) */

const ADMIN_COURSES_SEED = [
  { id: 1, title: "Modern Backend Engineering", subject: "Engineering",      semesters: 2, lessons: 22, students: 412, status: "published", updated: "Yesterday" },
  { id: 2, title: "Applied Machine Learning",   subject: "Machine Learning", semesters: 2, lessons: 18, students: 287, status: "published", updated: "3 d ago" },
  { id: 3, title: "SQL for Analytics",          subject: "Data Analytics",   semesters: 1, lessons: 14, students: 198, status: "draft",     updated: "1 h ago" },
  { id: 4, title: "Dashboards & Storytelling",  subject: "Data Viz",         semesters: 2, lessons: 12, students: 142, status: "published", updated: "1 w ago" }
];

const AdminCourses = ({ user, onNav, defaultView = "list", defaultEditing = null }) => {
  const [view, setView] = useS2(defaultView); // 'list' | 'editor'
  const [courses, setCourses] = useS2(ADMIN_COURSES_SEED);
  const [editing, setEditing] = useS2(defaultEditing);
  const [toast, setToast] = useS2(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const startNew = () => { setEditing(null); setView("editor"); };
  const startEdit = (c) => { setEditing(c); setView("editor"); };

  const save = (course, publish) => {
    if (editing) {
      setCourses(courses.map(c => c.id === editing.id ? { ...c, ...course, status: publish ? "published" : "draft", updated: "just now" } : c));
    } else {
      const id = Math.max(...courses.map(c => c.id)) + 1;
      setCourses([{ id, ...course, students: 0, status: publish ? "published" : "draft", updated: "just now" }, ...courses]);
    }
    setView("list");
    flash({ tone: "success", title: publish ? "Course published" : "Draft saved", message: course.title });
  };

  if (view === "editor") {
    return (
      <Shell navItems={ADMIN_NAV} active="courses" onNav={onNav} user={user} title={editing ? "Edit course" : "New course"} accent="Administrator" onLogout={() => onNav("logout")} notifications={ADMIN_NOTIFS}>
        <CourseEditor initial={editing} onCancel={() => setView("list")} onSave={(c) => save(c, false)} onPublish={(c) => save(c, true)} />
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </Shell>
    );
  }

  return (
    <Shell navItems={ADMIN_NAV} active="courses" onNav={onNav} user={user} title="Courses" accent="Administrator" onLogout={() => onNav("logout")} notifications={ADMIN_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Courses</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{courses.length}</b> in catalog · {courses.filter(c => c.status === "draft").length} draft</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button icon="plus" onClick={startNew}>Add course</Button>
          </div>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Course</th><th>Subject</th><th>Structure</th><th>Students</th><th>Updated</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td><div style={{ fontWeight: 600 }}>{c.title}</div></td>
                  <td>{c.subject}</td>
                  <td className="muted">{c.semesters} sem · {c.lessons} lessons</td>
                  <td>{c.students}</td>
                  <td className="muted">{c.updated}</td>
                  <td>{c.status === "published" ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button size="sm" variant="ghost" icon="edit-3" onClick={() => startEdit(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" icon="more-horizontal" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

/* Course editor — semester → subject → lesson tree on the left, lesson form on the right. */
const CourseEditor = ({ initial, onCancel, onSave, onPublish }) => {
  const [title, setTitle] = useS2(initial ? initial.title : "");
  const [subject, setSubject] = useS2(initial ? initial.subject : "Engineering");
  const [tree, setTree] = useS2([
    { id: "S1", title: "Semester 1", subjects: [
      { id: "S1-1", title: "Number Sense & Operations", lessons: [
        { id: "L1", title: "Whole numbers", description: "Place value, ordering and rounding.", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", attachments: [{ name: "Worksheet.pdf", size: "312 KB" }] }
      ]},
      { id: "S1-2", title: "Fractions, Decimals, Percents", lessons: [
        { id: "L2", title: "Equivalent fractions", description: "", videoUrl: "", attachments: [] }
      ]}
    ]},
    { id: "S2", title: "Semester 2", subjects: [] }
  ]);
  const [activeLessonRef, setActiveLessonRef] = useS2({ semId: "S1", subId: "S1-1", lessonId: "L1" });

  const findLesson = () => {
    const sem = tree.find(s => s.id === activeLessonRef.semId);
    if (!sem) return null;
    const sub = sem.subjects.find(x => x.id === activeLessonRef.subId);
    if (!sub) return null;
    return sub.lessons.find(l => l.id === activeLessonRef.lessonId) || null;
  };
  const lesson = findLesson();

  const updateLesson = (patch) => {
    setTree(tree.map(sem => sem.id !== activeLessonRef.semId ? sem : ({
      ...sem,
      subjects: sem.subjects.map(sub => sub.id !== activeLessonRef.subId ? sub : ({
        ...sub,
        lessons: sub.lessons.map(l => l.id !== activeLessonRef.lessonId ? l : ({ ...l, ...patch }))
      }))
    })));
  };

  const addSemester = () => {
    const id = "S" + (tree.length + 1);
    setTree([...tree, { id, title: "Semester " + (tree.length + 1), subjects: [] }]);
  };
  const addSubject = (semId) => {
    const sem = tree.find(s => s.id === semId);
    const id = semId + "-" + (sem.subjects.length + 1);
    setTree(tree.map(s => s.id !== semId ? s : ({ ...s, subjects: [...s.subjects, { id, title: "New subject", lessons: [] }] })));
  };
  const addLesson = (semId, subId) => {
    const id = "L" + Date.now();
    setTree(tree.map(s => s.id !== semId ? s : ({
      ...s, subjects: s.subjects.map(sub => sub.id !== subId ? sub : ({
        ...sub, lessons: [...sub.lessons, { id, title: "New lesson", description: "", videoUrl: "", attachments: [] }]
      }))
    })));
    setActiveLessonRef({ semId, subId, lessonId: id });
  };

  const totalLessons = tree.reduce((n, s) => n + s.subjects.reduce((m, su) => m + su.lessons.length, 0), 0);

  const buildPayload = () => ({ title, subject, semesters: tree.length, lessons: totalLessons, tree });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{initial ? "Edit course" : "New course"}</h1>
          <div className="greeting">Build the structure: semesters → subjects → lessons. Add a video and attachments to each lesson.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="secondary" icon="save" onClick={() => onSave(buildPayload())}>Save draft</Button>
          <Button icon="upload-cloud" onClick={() => onPublish(buildPayload())}>Publish</Button>
        </div>
      </div>

      <div className="course-meta-card">
        <div className="form-grid two">
          <Input label="Course title" placeholder="e.g. Modern Backend Engineering" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="field">
            <label className="label">Subject</label>
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option>Engineering</option><option>Machine Learning</option><option>Data Analytics</option><option>Data Viz</option><option>Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="course-editor">
        <aside className="course-tree">
          <div className="tree-head">
            <h3>Structure</h3>
            <Button size="sm" variant="ghost" icon="plus" onClick={addSemester}>Semester</Button>
          </div>
          {tree.map(sem => (
            <div key={sem.id} className="tree-sem">
              <div className="tree-sem-row">
                <Icon name="folder" size={14} /> <b>{sem.title}</b>
                <button className="tree-add" onClick={() => addSubject(sem.id)} title="Add subject"><Icon name="plus" size={14} /></button>
              </div>
              {sem.subjects.map(sub => (
                <div key={sub.id} className="tree-sub">
                  <div className="tree-sub-row">
                    <Icon name="bookmark" size={13} /> {sub.title}
                    <button className="tree-add" onClick={() => addLesson(sem.id, sub.id)} title="Add lesson"><Icon name="plus" size={13} /></button>
                  </div>
                  {sub.lessons.map(l => (
                    <div key={l.id}
                         className={"tree-lesson" + (activeLessonRef.lessonId === l.id ? " active" : "")}
                         onClick={() => setActiveLessonRef({ semId: sem.id, subId: sub.id, lessonId: l.id })}>
                      <Icon name="play-circle" size={12} /> {l.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <div className="course-form">
          {!lesson ? (
            <div className="settings-card"><h2>Pick or add a lesson</h2><p className="settings-sub">Use the tree on the left to add a semester, subject, then lesson.</p></div>
          ) : (
            <div className="settings-card">
              <h2>Lesson</h2>
              <div className="form-grid one">
                <Input label="Title" value={lesson.title} onChange={(e) => updateLesson({ title: e.target.value })} />
                <div className="field">
                  <label className="label">Description</label>
                  <textarea className="input" rows={4} value={lesson.description} onChange={(e) => updateLesson({ description: e.target.value })} placeholder="What this lesson covers and what learners will be able to do." />
                </div>
                <Input label="Embedded video URL" placeholder="YouTube / Vimeo embed URL" value={lesson.videoUrl} onChange={(e) => updateLesson({ videoUrl: e.target.value })} hint="Paste a YouTube or Vimeo embed link." />
                {lesson.videoUrl && (
                  <div className="video-preview">
                    <iframe src={lesson.videoUrl} title="Lesson video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
                <div className="field">
                  <label className="label">Attachments</label>
                  <div className="dropzone">
                    <Icon name="upload-cloud" size={22} />
                    <div><b>Drop files here</b> <span className="muted">or click to browse</span></div>
                    <div className="hint">PDFs, slides, worksheets · up to 25 MB each.</div>
                  </div>
                  {lesson.attachments.length > 0 && (
                    <div className="attach-list">
                      {lesson.attachments.map((a, i) => (
                        <div key={i} className="attach-item">
                          <div className="ico"><Icon name="file-text" size={16} /></div>
                          <div className="name">{a.name}</div>
                          <div className="size">{a.size}</div>
                          <button className="btn btn--ghost btn--sm" onClick={() => updateLesson({ attachments: lesson.attachments.filter((_, j) => j !== i) })}><Icon name="trash-2" size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────── ADMIN · SETTINGS (own profile) */

const AdminSettings = ({ user, onNav, role = "Administrator", nav = ADMIN_NAV, notifications = ADMIN_NOTIFS }) => {
  const [toast, setToast] = useS2(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2800); };
  return (
    <Shell navItems={nav} active="settings" onNav={onNav} user={user} title="Settings" accent={role} onLogout={() => onNav("logout")} notifications={notifications}>
      <div className="page">
        <div className="page-header">
          <div><h1>Your profile</h1><div className="greeting">Update your account details and contact information.</div></div>
        </div>

        <div className="settings-card">
          <h2>Profile</h2>
          <p className="settings-sub">Visible to other administrators on the platform.</p>
          <div className="avatar-row">
            <Avatar src={user.avatar} size="xl" name={user.name} />
            <div>
              <Button variant="secondary" icon="upload" size="sm">Upload new photo</Button>
              <div className="hint" style={{ marginTop: 6 }}>JPG or PNG · max 2 MB.</div>
            </div>
          </div>
          <div className="form-grid two">
            <Input label="First name" defaultValue={user.name.split(" ")[0]} />
            <Input label="Last name"  defaultValue={user.name.split(" ").slice(1).join(" ")} />
            <Input label="Email"   type="email" defaultValue={`${user.name.toLowerCase().replace(/[^a-z]+/g, ".")}@edupath.org`} />
            <Input label="Phone"   type="tel" defaultValue="+94 11 555 0102" />
            <Input label="Job title" defaultValue={role} />
            <Input label="Department" defaultValue="Academic Operations" />
          </div>
          <div className="form-actions">
            <Button variant="ghost">Cancel</Button>
            <Button icon="check" onClick={() => flash({ tone: "success", title: "Profile saved" })}>Save changes</Button>
          </div>
        </div>

        <div className="settings-card">
          <h2>Password</h2>
          <p className="settings-sub">Use a strong password you don't reuse elsewhere.</p>
          <div className="form-grid two">
            <Input label="Current password" type="password" placeholder="••••••••" />
            <div></div>
            <Input label="New password" type="password" placeholder="At least 10 characters" />
            <Input label="Confirm new password" type="password" />
          </div>
          <div className="form-actions">
            <Button variant="ghost">Cancel</Button>
            <Button icon="check" onClick={() => flash({ tone: "success", title: "Password updated" })}>Update password</Button>
          </div>
        </div>
      </div>
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

/* ────────────────────────────────────────── ADMIN · AUDIT LOG */

const AUDIT_SEED = [
  { ico: "user-check", actor: "Tania Fernando",  action: "Approved 4 registrations",         target: "Bulk approve · queue cleared", category: "Approvals", when: "Today, 10:18", ip: "203.94.74.12" },
  { ico: "user-plus",  actor: "Tania Fernando",  action: "Invited new admin",                target: "sahan@edupath.org as Content Admin", category: "Admins",    when: "Today, 09:44", ip: "203.94.74.12" },
  { ico: "edit-3",     actor: "Janaka Liyanage", action: "Edited course",                    target: "Modern Backend Engineering · Module 2", category: "Content",    when: "Today, 08:31", ip: "180.149.201.6" },
  { ico: "upload-cloud",actor: "Janaka Liyanage",action: "Published course",                 target: "SQL for Analytics",     category: "Content",    when: "Yesterday",     ip: "180.149.201.6" },
  { ico: "x-circle",   actor: "Tania Fernando",  action: "Rejected enrolment",               target: "Saman Perera · Dashboards & Storytelling",   category: "Approvals",  when: "Yesterday",     ip: "203.94.74.12" },
  { ico: "lock",       actor: "Super Admin",     action: "Enabled MFA-required policy",      target: "All administrator roles",         category: "Security",   when: "2 d ago",       ip: "203.94.74.1" },
  { ico: "user-x",     actor: "Super Admin",     action: "Suspended administrator",          target: "roshan@edupath.org",              category: "Admins",     when: "3 d ago",       ip: "203.94.74.1" },
  { ico: "settings",   actor: "Janaka Liyanage", action: "Updated brand colors",             target: "Workspace settings",              category: "Settings",   when: "4 d ago",       ip: "180.149.201.6" }
];

const AdminAuditLog = ({ user, onNav, role = "Administrator", nav = ADMIN_NAV, notifications = ADMIN_NOTIFS }) => {
  const [q, setQ] = useS2("");
  const [cat, setCat] = useS2("All");
  const cats = ["All", "Approvals", "Admins", "Content", "Security", "Settings"];
  const filtered = AUDIT_SEED.filter(r =>
    (cat === "All" || r.category === cat) &&
    (q === "" || (r.actor + r.action + r.target).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <Shell navItems={nav} active="audit" onNav={onNav} user={user} title="Audit Log" accent={role} onLogout={() => onNav("logout")} notifications={notifications}>
      <div className="page">
        <div className="page-header">
          <div><h1>Audit Log</h1><div className="greeting">Every administrative action — sign-ins, approvals, content edits, role changes.</div></div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="calendar">Last 30 days</Button>
            <Button variant="secondary" icon="download">Export CSV</Button>
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-search">
            <Icon name="search" size={16} />
            <input placeholder="Search actor, action or target…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="audit-cats">
            {cats.map(c => (
              <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Category</th><th>IP</th></tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td className="muted">{r.when}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 9999, background: "#EEF1EF", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#152A24" }}><Icon name={r.ico} size={14} /></span>
                      <span style={{ fontWeight: 600 }}>{r.actor}</span>
                    </div>
                  </td>
                  <td>{r.action}</td>
                  <td className="muted">{r.target}</td>
                  <td><Badge tone={r.category === "Security" ? "warning" : r.category === "Approvals" ? "success" : "info"}>{r.category}</Badge></td>
                  <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.ip}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#41574A" }}>No log entries match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
};

/* ────────────────────────────────────────── SUPER ADMIN · ADMINISTRATORS */

const SUPER_PERMISSIONS = [
  { id: "registrations", label: "Approve registrations", hint: "Approve new sign-ups." },
  { id: "enrolments",    label: "Approve enrolments",    hint: "Approve course-access requests." },
  { id: "courses",       label: "Manage courses",        hint: "Create, edit and publish courses." },
  { id: "audit",         label: "View audit log",        hint: "Read-only access to platform logs." }
];

const ADMINS_SEED = [
  { id: 1, name: "Tania Fernando",      email: "tania@edupath.org",   status: "active",    avatar: 48, perms: ["registrations","enrolments","courses","audit"] },
  { id: 2, name: "Dinithi Jayawardene", email: "dinithi@edupath.org", status: "active",    avatar: 14, perms: ["registrations","enrolments","courses"] },
  { id: 3, name: "Janaka Liyanage",     email: "janaka@edupath.org",  status: "active",    avatar: 7,  perms: ["courses","audit"] },
  { id: 4, name: "Sahan Wijeratne",     email: "sahan@edupath.org",   status: "invited",   avatar: 22, perms: ["courses"] },
  { id: 5, name: "Imani Rajapaksa",     email: "imani@edupath.org",   status: "invited",   avatar: 38, perms: ["registrations","enrolments"] }
];

const SuperAdminAdmins = ({ user, onNav }) => {
  const [admins, setAdmins] = useS2(ADMINS_SEED);
  const [showForm, setShowForm] = useS2(false);
  const [name, setName] = useS2("");
  const [email, setEmail] = useS2("");
  const [perms, setPerms] = useS2(["registrations", "enrolments"]);
  const [toRemove, setToRemove] = useS2(null);
  const [toast, setToast] = useS2(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const togglePerm = (id) => setPerms(perms.includes(id) ? perms.filter(p => p !== id) : [...perms, id]);
  const reset = () => { setName(""); setEmail(""); setPerms(["registrations", "enrolments"]); setShowForm(false); };
  const submit = () => {
    if (!name.trim() || !email.trim()) { flash({ tone: "warning", title: "Missing details", message: "Name and email are required." }); return; }
    const id = Math.max(...admins.map(a => a.id)) + 1;
    setAdmins([{ id, name, email, status: "invited", avatar: 30 + (id % 30), perms }, ...admins]);
    flash({ tone: "success", title: "Invite sent", message: `${name} will receive an email at ${email}.` });
    reset();
  };
  const confirmRemove = () => {
    setAdmins(admins.filter(a => a.id !== toRemove.id));
    flash({ tone: "success", title: "Administrator removed", message: `${toRemove.name} no longer has access.` });
    setToRemove(null);
  };

  return (
    <Shell navItems={SUPERADMIN_NAV} active="admins" onNav={onNav} user={user} title="Administrators" accent="Super Admin" onLogout={() => onNav("logout")} notifications={SUPER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Administrators</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{admins.length}</b> total · {admins.filter(a => a.status === "invited").length} pending invites</div>
          </div>
          <Button icon="user-plus" onClick={() => setShowForm(true)}>Add admin</Button>
        </div>

        {showForm && (
          <div className="settings-card">
            <h2>Invite a new administrator</h2>
            <p className="settings-sub">They'll receive an email with a sign-in link. You can adjust permissions later.</p>
            <div className="form-grid two">
              <Input label="Full name" placeholder="e.g. Sahan Wijeratne" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" type="email" placeholder="name@edupath.org" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-grid one">
              <div className="field">
                <label className="label">Access</label>
                <div className="hint" style={{ marginBottom: 10 }}>Pick what this administrator can do.</div>
                <div className="perm-grid">
                  {SUPER_PERMISSIONS.map(p => {
                    const on = perms.includes(p.id);
                    return (
                      <label key={p.id} className={"perm-card" + (on ? " on" : "")}>
                        <input type="checkbox" checked={on} onChange={() => togglePerm(p.id)} />
                        <div>
                          <div className="perm-label">{p.label}</div>
                          <div className="perm-hint">{p.hint}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={reset}>Cancel</Button>
              <Button icon="send" onClick={submit}>Send invite</Button>
            </div>
          </div>
        )}

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Person</th><th>Access</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(a.avatar)} size="sm" name={a.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {a.perms.length === 0 && <span className="muted">No access</span>}
                      {a.perms.map(p => {
                        const meta = SUPER_PERMISSIONS.find(x => x.id === p);
                        return <span key={p} className="perm-chip">{meta ? meta.label.replace(/^Approve |^Manage |^View /, "") : p}</span>;
                      })}
                    </div>
                  </td>
                  <td>
                    {a.status === "active"  && <Badge tone="success">Active</Badge>}
                    {a.status === "invited" && <Badge tone="warning">Invited</Badge>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button size="sm" variant="ghost" icon="key">Edit access</Button>
                      <Button size="sm" variant="destructive" icon="trash-2" onClick={() => setToRemove(a)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toRemove && (
        <div className="modal-backdrop" onClick={() => setToRemove(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-ico"><Icon name="alert-triangle" size={22} /></div>
            <h2>Remove {toRemove.name}?</h2>
            <p>They will lose access immediately. You can re-invite them later if needed.</p>
            <div className="form-actions" style={{ justifyContent: "center" }}>
              <Button variant="ghost" onClick={() => setToRemove(null)}>Cancel</Button>
              <Button variant="destructive" icon="trash-2" onClick={confirmRemove}>Remove administrator</Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

Object.assign(window, { StudentSettings, AdminCourses, AdminSettings, AdminAuditLog, SuperAdminAdmins });
