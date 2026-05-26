/* EduPath UI kit — Admin & Super-Admin surfaces.
   Two distinct approval queues:
     · Registrations  — approve a NEW sign-up before they get an account
     · Enrolments     — approve an existing student joining a specific course
   Plus a Super-Admin surface that manages the admins themselves. */

/* ───────────────────────── ADMIN ───────────────────────── */

const AdminDashboard = ({ user, onNav }) => {
  const kpis = [
    { ico: "user-plus",      label: "Pending Registrations", num: "8",  trend: "3 new today",       warn: true,  to: "registrations" },
    { ico: "clipboard-list", label: "Pending Enrolments",    num: "6",  trend: "2 new today",       warn: true,  to: "enrolments" },
    { ico: "users",          label: "Total Students",        num: "3,248", trend: "+12% this month" },
    { ico: "trending-up",    label: "Course Completion",     num: "68%",   trend: "+4 pts vs last month" }
  ];
  const queues = [
    { ico: "user-plus",      title: "Registrations queue", body: "Approve sign-ups before students gain access to the platform.", count: 8, to: "registrations" },
    { ico: "clipboard-list", title: "Enrolments queue",    body: "Approve course-access requests from existing students.",        count: 6, to: "enrolments" }
  ];
  const activity = [
    { ico: "user-plus",     tone: "s", title: "Anjali Silva submitted a sign-up request",          meta: "Awaiting registration approval", when: "2 min ago" },
    { ico: "clipboard-list",tone: "s", title: "Ravi Tilakaratne requested Modern Backend Engineering",meta: "Awaiting enrolment approval",     when: "8 min ago" },
    { ico: "check-circle",  tone: "s", title: "Course \"SQL for Analytics\" published",            meta: "by Tania F. (instructor)",        when: "1 h ago" },
    { ico: "alert-triangle",tone: "w", title: "3 lessons in \"Applied Machine Learning\" missing labs", meta: "Tania F. flagged for review",  when: "3 h ago" },
    { ico: "edit-3",        tone: null, title: "Modern Backend Engineering · Module 2 reordered",  meta: "by Admin",                        when: "2 d ago" }
  ];

  return (
    <Shell navItems={ADMIN_NAV} active="dashboard" onNav={onNav} user={user} title="Admin Dashboard" accent="Administrator" onLogout={() => onNav("logout")} notifications={ADMIN_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Operations overview</h1>
            <div className="greeting">Last 30 days · across all published courses.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="calendar">This month</Button>
            <Button icon="plus" onClick={() => onNav("courses")}>New course</Button>
          </div>
        </div>

        <div className="kpi-grid">
          {kpis.map(k => (
            <div className="kpi" key={k.label} style={{ cursor: k.to ? "pointer" : "default" }} onClick={() => k.to && onNav(k.to)}>
              <div className="kpi-top">
                <div className="kpi-ico"><Icon name={k.ico} size={18} /></div>
                <span className="kpi-label">{k.label}</span>
              </div>
              <div className="kpi-num">{k.num}</div>
              <div className={"kpi-trend" + (k.warn ? " warn" : "")}>{k.trend}</div>
            </div>
          ))}
        </div>

        <div className="section-h"><h3>Approval queues</h3></div>
        <div className="queue-grid">
          {queues.map(q => (
            <div className="queue-card" key={q.title} onClick={() => onNav(q.to)}>
              <div className="queue-ico"><Icon name={q.ico} size={22} /></div>
              <div style={{ flex: 1 }}>
                <h3>{q.title}</h3>
                <p>{q.body}</p>
              </div>
              <div className="queue-count"><b>{q.count}</b><span>pending</span></div>
              <Icon name="arrow-right" size={18} style={{ color: "#41574A" }} />
            </div>
          ))}
        </div>

        <div className="section-h">
          <h3>Recent activity</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("audit"); }}>View audit log</ArrowLink>
        </div>
        <div className="activity">
          {activity.map((a, i) => (
            <div className="row" key={i}>
              <div className={"ico" + (a.tone ? " " + a.tone : "")}><Icon name={a.ico} size={16} /></div>
              <div className="body">
                <div className="title">{a.title}</div>
                <div className="meta">{a.meta}</div>
              </div>
              <span className="when">{a.when}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

/* ───────────── Shared approval-table helper ─────────────
   Both the Registrations and Enrolments queues share the same
   selection/approve/reject mechanics — only the columns differ. */
const useApprovalQueue = (initial, kind) => {
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id)));
  const setStatus = (ids, status, label, body) => {
    setRows(rows.map(r => ids.includes(r.id) ? { ...r, status } : r));
    setSelected(new Set());
    setToast({ tone: status === "approved" ? "success" : "warning", title: ids.length === 1 ? `${kind} ${label}` : `${ids.length} ${kind.toLowerCase()}s ${label}`, message: body });
    setTimeout(() => setToast(null), 3500);
  };
  return { rows, selected, toast, setToast, allChecked, toggle, toggleAll,
           approve: (ids) => setStatus(ids, "approved", "approved", "The student has been emailed."),
           reject:  (ids) => setStatus(ids, "rejected", "rejected", "The student has been notified by email.") };
};

const QueueBulkbar = ({ selected, onApprove, onReject, onCancel }) => (
  <div className="tbl-bulkbar">
    <span><b>{selected.size}</b> selected</span>
    <div style={{ display: "flex", gap: 8 }}>
      <Button size="sm" variant="primary" icon="check" onClick={onApprove}>Approve all</Button>
      <Button size="sm" variant="destructive" icon="x" onClick={onReject}>Reject all</Button>
      <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Cancel</button>
    </div>
  </div>
);

const StatusBadge = ({ s }) => s === "pending"  ? <Badge tone="warning">Pending</Badge>
                              : s === "approved" ? <Badge tone="success">Approved</Badge>
                                                 : <Badge tone="error">Rejected</Badge>;

const RowActions = ({ status, onApprove, onReject }) => status === "pending" ? (
  <div style={{ display: "inline-flex", gap: 6 }}>
    <Button size="sm" variant="primary" onClick={onApprove}>Approve</Button>
    <Button size="sm" variant="ghost" onClick={onReject}>Reject</Button>
  </div>
) : <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: 12 }}>—</span>;

/* ─────────── Registrations: approve NEW sign-ups ─────────── */
const AdminRegistrations = ({ user, onNav }) => {
  const initial = [
    { id: 1, name: "Anjali Silva",      email: "anjali@example.com",   country: "Sri Lanka", source: "Web · /register",   date: "Today, 09:14",  status: "pending", avatar: 47 },
    { id: 2, name: "Saman Perera",      email: "saman@example.com",    country: "Sri Lanka", source: "Web · /register",   date: "Today, 08:02",  status: "pending", avatar: 22 },
    { id: 3, name: "Nadeesha Fernando", email: "nadeesha@example.com", country: "UAE",       source: "Referral · ravi.t", date: "Yesterday",     status: "pending", avatar: 38 },
    { id: 4, name: "Dinithi Jayawardene",email: "dinithi@example.com", country: "Australia", source: "Web · /register",   date: "Yesterday",     status: "pending", avatar: 14 },
    { id: 5, name: "Janaka Liyanage",   email: "janaka@example.com",   country: "Canada",    source: "Web · /register",   date: "2 days ago",    status: "pending", avatar: 7  },
    { id: 6, name: "Kasun Bandara",     email: "kasun@example.com",    country: "Sri Lanka", source: "Web · /register",   date: "3 days ago",    status: "approved", avatar: 5 }
  ];
  const Q = useApprovalQueue(initial, "Registration");
  const pending = Q.rows.filter(r => r.status === "pending").length;

  return (
    <Shell navItems={ADMIN_NAV} active="registrations" onNav={onNav} user={user} title="Registrations" accent="Administrator" onLogout={() => onNav("logout")} notifications={ADMIN_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Registrations <span className="page-sub">· sign-up approvals</span></h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{pending}</b> awaiting approval. Once approved, the learner can sign in and request course access.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button variant="secondary" icon="download">Export CSV</Button>
          </div>
        </div>

        {/* Approval-flow strip */}
        <div className="flow-strip">
          <div className="flow-step active"><i>1</i> Sign-up <small>Awaits admin approval</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>2</i> Course request <small>Triggers an enrolment</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>3</i> Studying <small>Course materials unlocked</small></div>
        </div>

        <div className="tbl-card">
          <div className="tbl-bar">
            <span className="live"><i></i>Live · auto-refresh every 30s</span>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="badge badge--warning">{pending} Pending</span>
              <span className="badge badge--success">{Q.rows.filter(r => r.status === "approved").length} Approved</span>
              <span className="badge badge--error">{Q.rows.filter(r => r.status === "rejected").length} Rejected</span>
            </div>
          </div>
          {Q.selected.size > 0 && <QueueBulkbar selected={Q.selected} onApprove={() => Q.approve([...Q.selected])} onReject={() => Q.reject([...Q.selected])} onCancel={() => Q.toggleAll()} />}
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" checked={Q.allChecked} onChange={Q.toggleAll} /></th>
                <th>Applicant</th>
                <th>Country</th>
                <th>Source</th>
                <th>Submitted</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Q.rows.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={Q.selected.has(r.id)} onChange={() => Q.toggle(r.id)} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(r.avatar)} size="sm" name={r.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.country}</td>
                  <td className="muted">{r.source}</td>
                  <td className="muted">{r.date}</td>
                  <td><StatusBadge s={r.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <RowActions status={r.status} onApprove={() => Q.approve([r.id])} onReject={() => Q.reject([r.id])} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {Q.toast && <Toast {...Q.toast} onDismiss={() => Q.setToast(null)} />}
    </Shell>
  );
};

/* ─────────── Enrolments: approve course-access requests ─────────── */
const AdminEnrolments = ({ user, onNav, nav = ADMIN_NAV, notifications = ADMIN_NOTIFS, accent = "Administrator" }) => {
  const initial = [
    { id: 1, name: "Anjali Silva",      email: "anjali@example.com",   course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "Today, 09:18", status: "pending", avatar: 47 },
    { id: 2, name: "Ravi Tilakaratne",  email: "ravi.t@example.com",   course: "Applied Machine Learning",   semester: "Cohort · Q1 2026", date: "Today, 08:42", status: "pending", avatar: 12 },
    { id: 3, name: "Priya Mendis",      email: "priya@example.com",    course: "SQL for Analytics",          semester: "Cohort · Q2 2026", date: "Today, 07:11", status: "pending", avatar: 32 },
    { id: 4, name: "Nadeesha Fernando", email: "nadeesha@example.com", course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "Yesterday",    status: "pending", avatar: 38 },
    { id: 5, name: "Saman Perera",      email: "saman@example.com",    course: "Dashboards & Storytelling",  semester: "Cohort · Q1 2026", date: "Yesterday",    status: "pending", avatar: 22 },
    { id: 6, name: "Kasun Bandara",     email: "kasun@example.com",    course: "Modern Backend Engineering", semester: "Cohort · Q1 2026", date: "3 days ago",   status: "approved", avatar: 5 }
  ];
  const Q = useApprovalQueue(initial, "Enrolment");
  const pending = Q.rows.filter(r => r.status === "pending").length;

  return (
    <Shell navItems={nav} active="enrolments" onNav={onNav} user={user} title="Enrolments" accent={accent} onLogout={() => onNav("logout")} notifications={notifications}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Enrolments <span className="page-sub">· course-access approvals</span></h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{pending}</b> awaiting approval. The learner already has an account — approving unlocks course materials.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button variant="secondary" icon="download">Export CSV</Button>
          </div>
        </div>

        <div className="flow-strip">
          <div className="flow-step done"><i><Icon name="check" size={12} /></i> Sign-up <small>Approved</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step active"><i>2</i> Course request <small>Awaits admin approval</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>3</i> Studying <small>Course materials unlocked</small></div>
        </div>

        <div className="tbl-card">
          <div className="tbl-bar">
            <span className="live"><i></i>Live · auto-refresh every 30s</span>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="badge badge--warning">{pending} Pending</span>
              <span className="badge badge--success">{Q.rows.filter(r => r.status === "approved").length} Approved</span>
              <span className="badge badge--error">{Q.rows.filter(r => r.status === "rejected").length} Rejected</span>
            </div>
          </div>
          {Q.selected.size > 0 && <QueueBulkbar selected={Q.selected} onApprove={() => Q.approve([...Q.selected])} onReject={() => Q.reject([...Q.selected])} onCancel={() => Q.toggleAll()} />}
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" checked={Q.allChecked} onChange={Q.toggleAll} /></th>
                <th>Student</th>
                <th>Course</th>
                <th>Semester</th>
                <th>Requested</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Q.rows.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={Q.selected.has(r.id)} onChange={() => Q.toggle(r.id)} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(r.avatar)} size="sm" name={r.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.course}</td>
                  <td className="muted">{r.semester}</td>
                  <td className="muted">{r.date}</td>
                  <td><StatusBadge s={r.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <RowActions status={r.status} onApprove={() => Q.approve([r.id])} onReject={() => Q.reject([r.id])} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {Q.toast && <Toast {...Q.toast} onDismiss={() => Q.setToast(null)} />}
    </Shell>
  );
};

const AdminStubPage = ({ user, onNav, active, title, eyebrow, blurb, ico, body, nav = ADMIN_NAV, notifications = ADMIN_NOTIFS, accent = "Administrator" }) => (
  <Shell navItems={nav} active={active} onNav={onNav} user={user} title={title} accent={accent} onLogout={() => onNav("logout")} notifications={notifications}>
    <div className="page">
      <div className="page-header"><div><h1>{title}</h1><div className="greeting">{eyebrow}</div></div></div>
      <div className="stub-card">
        <div className="stub-ico"><Icon name={ico} size={28} /></div>
        <h2>{blurb}</h2>
        {body && <p>{body}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <Button onClick={() => onNav("dashboard")} icon="arrow-left" variant="secondary">Back to dashboard</Button>
          <Button onClick={() => onNav("registrations")} iconAfter="arrow-right">Open registrations</Button>
        </div>
      </div>
    </div>
  </Shell>
);

/* ───────────────────────── SUPER ADMIN ─────────────────────────
   Super-admins manage the people who manage the platform. The
   day-to-day approval queues live in the Admin surface. */

const SuperAdminDashboard = ({ user, onNav }) => {
  const kpis = [
    { ico: "shield-check",   label: "Active Administrators", num: "7",   trend: "1 new this week" },
    { ico: "user-plus",      label: "Pending Admin Invites", num: "2",   trend: "Awaiting acceptance", warn: true, to: "admins" },
    { ico: "alert-octagon",  label: "Failed Sign-ins (24h)", num: "12",  trend: "2 from same IP",      warn: true },
    { ico: "activity",       label: "API Requests (24h)",    num: "1.2M", trend: "Within plan limits" }
  ];

  const admins = [
    { name: "Tania Fernando",  role: "Administrator",  email: "tania@edupath.org",   last: "Online now",      mfa: true,  status: "active",  avatar: 48 },
    { name: "Dinithi Jayawardene", role: "Administrator", email: "dinithi@edupath.org", last: "2 h ago",      mfa: true,  status: "active",  avatar: 14 },
    { name: "Janaka Liyanage", role: "Content Admin",  email: "janaka@edupath.org",  last: "Yesterday",       mfa: false, status: "active",  avatar: 7  },
    { name: "Sahan Wijeratne", role: "Content Admin",  email: "sahan@edupath.org",   last: "Awaiting accept", mfa: false, status: "invited", avatar: 22 },
    { name: "Imani Rajapaksa", role: "Administrator",  email: "imani@edupath.org",   last: "Awaiting accept", mfa: false, status: "invited", avatar: 38 },
    { name: "Roshan De Silva", role: "Read-only",      email: "roshan@edupath.org",  last: "8 d ago",         mfa: true,  status: "suspended", avatar: 5  }
  ];

  const audit = [
    { ico: "user-check", title: "Tania Fernando approved 4 registrations",  meta: "Bulk action · queue cleared",          when: "1 h ago" },
    { ico: "user-plus",  title: "Sahan Wijeratne invited as Content Admin", meta: "by Tania F. · awaiting acceptance",     when: "3 h ago" },
    { ico: "settings",   title: "Brand colors updated",                     meta: "by Janaka L.",                          when: "Yesterday" },
    { ico: "lock",       title: "MFA required policy enabled",              meta: "by Super Admin",                        when: "2 d ago" }
  ];

  return (
    <Shell navItems={SUPERADMIN_NAV} active="dashboard" onNav={onNav} user={user} title="Super Admin" accent="Super Admin" onLogout={() => onNav("logout")} notifications={SUPER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Platform overview</h1>
            <div className="greeting">You manage administrators, roles and global policy. Day-to-day approvals live with admins.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="download">Export audit log</Button>
            <Button icon="user-plus" onClick={() => onNav("admins")}>Invite admin</Button>
          </div>
        </div>

        <div className="kpi-grid">
          {kpis.map(k => (
            <div className="kpi" key={k.label} style={{ cursor: k.to ? "pointer" : "default" }} onClick={() => k.to && onNav(k.to)}>
              <div className="kpi-top">
                <div className="kpi-ico"><Icon name={k.ico} size={18} /></div>
                <span className="kpi-label">{k.label}</span>
              </div>
              <div className="kpi-num">{k.num}</div>
              <div className={"kpi-trend" + (k.warn ? " warn" : "")}>{k.trend}</div>
            </div>
          ))}
        </div>

        <div className="section-h">
          <h3>Administrators</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("admins"); }}>Manage all</ArrowLink>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Person</th><th>Role</th><th>MFA</th><th>Last seen</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.email}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(a.avatar)} size="sm" name={a.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.role}</td>
                  <td>{a.mfa
                       ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3DB55F", fontWeight: 600 }}><Icon name="shield-check" size={14} /> Enabled</span>
                       : <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#D97706", fontWeight: 600 }}><Icon name="shield-off" size={14} /> Off</span>}</td>
                  <td className="muted">{a.last}</td>
                  <td>
                    {a.status === "active"    && <Badge tone="success">Active</Badge>}
                    {a.status === "invited"   && <Badge tone="warning">Invited</Badge>}
                    {a.status === "suspended" && <Badge tone="error">Suspended</Badge>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button size="sm" variant="ghost" icon="key">Role</Button>
                      <Button size="sm" variant="ghost" icon="more-horizontal" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-h">
          <h3>Recent platform activity</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("audit"); }}>Full audit log</ArrowLink>
        </div>
        <div className="activity">
          {audit.map((a, i) => (
            <div className="row" key={i}>
              <div className="ico"><Icon name={a.ico} size={16} /></div>
              <div className="body">
                <div className="title">{a.title}</div>
                <div className="meta">{a.meta}</div>
              </div>
              <span className="when">{a.when}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

const SuperAdminStubPage = ({ user, onNav, active, title, eyebrow, blurb, ico, body, nav = SUPERADMIN_NAV, notifications = SUPER_NOTIFS, accent = "Super Admin" }) => (
  <Shell navItems={nav} active={active} onNav={onNav} user={user} title={title} accent={accent} onLogout={() => onNav("logout")} notifications={notifications}>
    <div className="page">
      <div className="page-header"><div><h1>{title}</h1><div className="greeting">{eyebrow}</div></div></div>
      <div className="stub-card">
        <div className="stub-ico"><Icon name={ico} size={28} /></div>
        <h2>{blurb}</h2>
        {body && <p>{body}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <Button onClick={() => onNav("dashboard")} icon="arrow-left" variant="secondary">Back to dashboard</Button>
          <Button onClick={() => onNav("admins")} iconAfter="arrow-right">Manage administrators</Button>
        </div>
      </div>
    </div>
  </Shell>
);

Object.assign(window, { AdminDashboard, AdminRegistrations, AdminEnrolments, AdminStubPage, SuperAdminDashboard, SuperAdminStubPage });
