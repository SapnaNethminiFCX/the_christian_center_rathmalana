/* TCCR v2 — Leader + G12 dashboards, Admin role-requests queue,
   Admin batch manager, Admin semester dates editor, G12 promote dialog. */

const { useState: useTLS } = React;

/* ─────────────────── Leader / G12 dashboard */
const TLeaderDashboard = ({ user, onNav, role = "leader" }) => {
  const nav = role === "g12" ? G12_NAV : LEADER_NAV;
  const accent = role === "g12" ? "G12 Leader" : "Leader";
  const isG12 = role === "g12";

  const kpis = isG12 ? [
    { lbl: "Leaders in network",   num: "6",   delta: "+1",     up: true,   sub: "1 onboarded this week" },
    { lbl: "Cells in network",     num: "18",  delta: "+2",     up: true,   sub: "across 4 areas" },
    { lbl: "Cells active · 7d",    num: "16",  delta: "-1",     up: false,  sub: "vs 17 last week" },
    { lbl: "Avg. attendance",      num: "89%", delta: "+3 pts", up: true,   sub: "last 4 weeks" }
  ] : [
    { lbl: "Cells I lead",         num: "3",   delta: "—",      up: true,   sub: "all active" },
    { lbl: "Members across cells", num: "39",  delta: "+4",     up: true,   sub: "2 new this month" },
    { lbl: "Reports filed · 4w",   num: "12",  delta: "100%",   up: true,   sub: "on-time rate" },
    { lbl: "Avg. attendance",      num: "92%", delta: "+5 pts", up: true,   sub: "last 4 weeks" }
  ];

  const weeklyAttendance = [
    { label: "W19", value: 28 }, { label: "W20", value: 31 }, { label: "W21", value: 34 },
    { label: "W22", value: 29 }, { label: "W23", value: 35 }, { label: "W24", value: 37 },
    { label: "W25", value: 33 }, { label: "W26", value: 38, highlight: true }
  ];
  const growth = [
    { label: "Jan", value: 28 }, { label: "Feb", value: 31 }, { label: "Mar", value: 34 },
    { label: "Apr", value: 36 }, { label: "May", value: 39 }
  ];
  const donut = [
    { label: "Care",     value: 18, color: "#1D4ED8" },
    { label: "Outreach", value: 11, color: "#15803D" },
    { label: "Children", value:  7, color: "#D97706" },
    { label: "G12",      value:  4, color: "#7C3AED" }
  ];

  const upcoming = [
    { ico: "calendar-clock", title: "Care Cell · Mt Lavinia", meta: "Wed, 20 May · 19:00", action: "Report due" },
    { ico: "calendar-clock", title: "Outreach Cell · Ratmalana", meta: "Sun, 24 May · 17:00", action: "Scheduled" },
    { ico: "calendar-clock", title: "Children's Cell · Galkissa", meta: "Thu, 21 May · 16:30", action: "Scheduled" }
  ];

  return (
    <Shell navItems={nav} active="leaderdash" onNav={onNav} user={user} title={isG12 ? "G12 Dashboard" : "Leader Dashboard"}
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{isG12 ? "Network overview" : "Cell overview"}</h1>
            <div className="greeting">Last 30 days · {isG12 ? "across leaders in your G12 network" : "across cells you lead"}.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="calendar">This month</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {kpis.map(k => (
            <div className="kpi-mini" key={k.lbl}>
              <div className="row">
                <div className="lbl">{k.lbl}</div>
                <span className={"delta " + (k.up ? "up" : "dn")}>{k.delta}</span>
              </div>
              <div className="num">{k.num}</div>
              <div className="sub">{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 18 }}>
          <div className="chart-card">
            <div className="chart-card-head">
              <div>
                <h3>Weekly attendance</h3>
                <p className="sub">Past 8 weeks · all your cells combined</p>
              </div>
              <Button variant="ghost" size="sm" icon="download">CSV</Button>
            </div>
            <BarChart data={weeklyAttendance} height={180} />
          </div>
          <div className="chart-card">
            <div className="chart-card-head">
              <div>
                <h3>By cell type</h3>
                <p className="sub">Last 30 days</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, alignItems: "center", justifyContent: "center" }}>
              <DonutChart data={donut} size={180} />
              <div className="legend" style={{ flexDirection: "column", gap: 10 }}>
                {donut.map(d => <span key={d.label}><i style={{ background: d.color }}></i> {d.label} <b style={{ color: "#152A24", marginLeft: 4 }}>{d.value}</b></span>)}
              </div>
            </div>
          </div>
        </div>

        {isG12 && (
          <div className="chart-card" style={{ marginBottom: 18 }}>
            <div className="chart-card-head">
              <div>
                <h3>Member growth across network</h3>
                <p className="sub">Year to date</p>
              </div>
              <Button variant="ghost" size="sm" icon="download">CSV</Button>
            </div>
            <LineChart data={growth} height={180} />
          </div>
        )}

        <div className="section-h">
          <h3>Upcoming this week</h3>
          <ArrowLink onClick={(e) => { e.preventDefault(); onNav("mycells"); }}>View all cells</ArrowLink>
        </div>
        <div className="activity">
          {upcoming.map((a, i) => (
            <div className="row" key={i}>
              <div className="ico"><Icon name={a.ico} size={16} /></div>
              <div className="body">
                <div className="title">{a.title}</div>
                <div className="meta">{a.meta}</div>
              </div>
              <span className="when">{a.action === "Report due" ? <Badge tone="warning">Report due</Badge> : <Badge tone="archive">Scheduled</Badge>}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── G12 Network */
const TG12Network = ({ user, onNav }) => {
  const [q, setQ] = useTLS("");
  const leaders = [
    { id: 1, name: "Tania Fernando",   avatar: 48, phone: "+94 77 555 0101", cells: 3, members: 39, lastReport: "2 days ago", attendance: "92%" },
    { id: 2, name: "Roshan De Silva",  avatar: 15, phone: "+94 77 555 0118", cells: 2, members: 24, lastReport: "5 days ago", attendance: "84%" },
    { id: 3, name: "Dinithi Jayawardene", avatar: 14, phone: "+94 77 555 0622", cells: 2, members: 21, lastReport: "1 day ago",  attendance: "88%" },
    { id: 4, name: "Janaka Liyanage",  avatar: 7,  phone: "+94 77 555 0703", cells: 1, members: 14, lastReport: "today",      attendance: "95%" },
    { id: 5, name: "Imani Rajapaksa",  avatar: 38, phone: "+94 77 555 0808", cells: 2, members: 22, lastReport: "1 week ago", attendance: "78%" },
    { id: 6, name: "Sahan Wijeratne",  avatar: 22, phone: "+94 77 555 0915", cells: 1, members: 12, lastReport: "3 days ago", attendance: "86%" }
  ];
  const filtered = leaders.filter(l => !q || l.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell navItems={G12_NAV} active="network" onNav={onNav} user={user} title="G12 Network"
           accent="G12 Leader" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>My G12 network</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{leaders.length} leaders</b> reporting to you · {leaders.reduce((n, l) => n + l.cells, 0)} cells · {leaders.reduce((n, l) => n + l.members, 0)} members</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E5E5", borderRadius: 9999, padding: "8px 14px", minWidth: 260 }}>
              <Icon name="search" size={16} style={{ color: "#41574A" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leaders…" style={{ border: "none", outline: "none", flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", background: "transparent" }} />
            </div>
            <Button icon="user-plus" onClick={() => onNav("promote")}>Promote member</Button>
          </div>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Leader</th><th>Phone</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(l.avatar)} size="sm" name={l.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>Reports to: <b>{user.name}</b></div>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{l.phone}</td>
                  <td style={{ textAlign: "right" }}>
                    <Button size="sm" icon="chevron-up" onClick={() => onNav("promote")}>Promote to G12</Button>
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

/* ─────────────────── G12 Promote (member → leader/g12, leader → g12) */
const TG12Promote = ({ user, onNav }) => {
  const [toast, setToast] = useTLS(null);
  const [showInvite, setShowInvite] = useTLS(false);
  const [inv, setInv] = useTLS({ first: "", last: "", email: "", password: "", role: "leader" });
  const [q, setQ] = useTLS("");
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const promotable = [
    { id: 1, name: "Anjali Silva",    avatar: 47, currentRoles: ["member","student"], meta: "Student · in Mt Lavinia care cell · 12 mo" },
    { id: 2, name: "Saman Perera",    avatar: 22, currentRoles: ["member"],          meta: "Member · in Ratmalana outreach · 8 mo" },
    { id: 3, name: "Kasun Bandara",   avatar: 5,  currentRoles: ["member","student"], meta: "Student · finished Foundations course" },
    { id: 4, name: "Ravi Tilakaratne",avatar: 12, currentRoles: ["member","leader"], meta: "Leader · 2 cells · ready for G12" }
  ];
  const filtered = promotable.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell navItems={G12_NAV} active="promote" onNav={onNav} user={user} title="Promote"
           accent="G12 Leader" onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Promote a member</h1>
            <div className="greeting">Add Leader or G12 roles to people in your network. They'll keep their existing roles — promotion is additive.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 360 }}>
            <div style={{ flex: 1 }}>
              <Typeahead
                placeholder="Search people in TCCR…"
                directory={TCCR_DIRECTORY}
                value={q}
                onChange={setQ}
                onPick={(m) => { setQ(m.name); }}
                onAddUnregistered={(name) => { const parts = name.split(" "); setInv({ first: parts[0] || "", last: parts.slice(1).join(" ") || "", email: "", password: "", role: "leader" }); setShowInvite(true); setQ(""); }}
              />
            </div>
          </div>
        </div>

        <div className="role-banner">
          <div className="ico"><Icon name="info" size={20} /></div>
          <div className="b-body">
            <h3>Promotion sends an invite email</h3>
            <p>The person will be notified, and the new role appears next time they sign in. They can also be added as a new user if they're not on TCCR yet.</p>
          </div>
          <Button variant="secondary" icon="user-plus" onClick={() => setShowInvite(v => !v)}>{showInvite ? "Close" : "Invite new user"}</Button>
        </div>

        {showInvite && (
          <div className="settings-card" style={{ borderColor: "#152A24" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>Invite a new user</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6" }}><Icon name="x" size={18} /></button>
            </div>
            <p className="settings-sub">They'll receive an email with sign-in details and the chosen role pre-assigned.</p>
            <div className="form-grid two">
              <Input label="First name" placeholder="e.g. Asha" value={inv.first} onChange={(e) => setInv({ ...inv, first: e.target.value })} />
              <Input label="Last name"  placeholder="e.g. Wickrama" value={inv.last}  onChange={(e) => setInv({ ...inv, last: e.target.value })} />
              <Input label="Email" type="email" placeholder="name@example.com" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
              <Input label="Initial password" type="password" placeholder="At least 8 characters" value={inv.password} onChange={(e) => setInv({ ...inv, password: e.target.value })} hint="User will be asked to change on first sign-in." />
            </div>
            <div className="form-grid one">
              <div className="field">
                <label className="label">Initial role</label>
                <div className="rf-yesno" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <label className={inv.role === "leader" ? "on" : ""}>
                    <input type="radio" checked={inv.role === "leader"} onChange={() => setInv({ ...inv, role: "leader" })} /> Leader
                  </label>
                  <label className={inv.role === "g12" ? "on" : ""}>
                    <input type="radio" checked={inv.role === "g12"} onChange={() => setInv({ ...inv, role: "g12" })} /> G12 Leader
                  </label>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button icon="send" disabled={!inv.first.trim() || !inv.last.trim() || !inv.email.trim() || inv.password.length < 8}
                onClick={() => { const name = (inv.first + " " + inv.last).trim(); setShowInvite(false); flash({ tone: "success", title: "User created", message: name + " will receive an email at " + inv.email + "." }); setInv({ first: "", last: "", email: "", password: "", role: "leader" }); }}>
                Create user
              </Button>
            </div>
          </div>
        )}

        <div className="settings-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0 }}>Latest system users</h2>
              <p className="settings-sub" style={{ margin: "4px 0 0" }}>Pick anyone to promote. Search above to find someone specific.</p>
            </div>
          </div>

          <table className="tbl" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Username</th><th>Roles</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(p.avatar)} size="sm" name={p.name} />
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </div>
                  </td>
                  <td><RoleBadgeStack roles={p.currentRoles} /></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      {!p.currentRoles.includes("leader") && (
                        <Button size="sm" variant="ghost" icon="chevron-up" onClick={() => flash({ tone: "success", title: "Promoted to Leader", message: p.name + " is now a Leader." })}>Promote to Leader</Button>
                      )}
                      <Button size="sm" icon="chevron-up" onClick={() => flash({ tone: "success", title: "Promoted to G12", message: p.name + " is now a G12 Leader." })}>Promote to G12</Button>
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
const TCCR_ADMIN_NAV = [
  { group: "Platform" },
  { id: "dashboard",     label: "Dashboard",      ico: "layout-dashboard" },
  { group: "Approvals" },
  { id: "rolereqs",      label: "Role Requests",  ico: "user-plus",      count: 8 },
  { id: "enrolments",    label: "Enrolments",     ico: "clipboard-list", count: 6 },
  { group: "Bible School" },
  { id: "courses",       label: "Courses",        ico: "book-open" },
  { group: "Users" },
  { id: "users",         label: "Users",          ico: "users" },
  { group: "System" },
  { id: "settings",      label: "Profile",       ico: "user" },
  { id: "audit",         label: "Audit Log",      ico: "history" }
];

const TCCR_SADMIN_NAV = [
  { group: "Platform" },
  { id: "dashboard",     label: "Dashboard",       ico: "layout-dashboard" },
  { id: "admins",        label: "Administrators",  ico: "shield-check", count: 2 },
  { group: "Approvals" },
  { id: "rolereqs",      label: "Role Requests",   ico: "user-plus",      count: 8 },
  { id: "enrolments",    label: "Enrolments",      ico: "clipboard-list", count: 6 },
  { group: "Bible School" },
  { id: "courses",       label: "Courses",         ico: "book-open" },
  { group: "Users" },
  { id: "users",         label: "Users",           ico: "users" },
  { group: "System" },
  { id: "settings",      label: "Profile",        ico: "user" },
  { id: "audit",         label: "Audit Log",       ico: "history" }
];

const TRoleRequestsQueue = ({ user, onNav, role = "admin" }) => {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";

  const initial = [
    { id: 1, name: "Anjali Silva",      email: "anjali@example.com",   note: "—",                          submitted: "Today, 09:18", status: "pending", avatar: 47 },
    { id: 2, name: "Ravi Tilakaratne",  email: "ravi.t@example.com",   note: "Recommended by my cell leader", submitted: "Today, 08:42", status: "pending", avatar: 12 },
    { id: 3, name: "Priya Mendis",      email: "priya@example.com",    note: "—",                          submitted: "Today, 07:11", status: "pending", avatar: 32 },
    { id: 4, name: "Nadeesha Fernando", email: "nadeesha@example.com", note: "Recommended by Tania F.",    submitted: "Yesterday",    status: "pending", avatar: 38 },
    { id: 5, name: "Saman Perera",      email: "saman@example.com",    note: "—",                          submitted: "Yesterday",    status: "pending", avatar: 22 },
    { id: 6, name: "Kasun Bandara",     email: "kasun@example.com",    note: "—",                          submitted: "3 days ago",   status: "approved", avatar: 5  }
  ];
  const Q = useApprovalQueue(initial, "Role request");
  const pending = Q.rows.filter(r => r.status === "pending").length;

  return (
    <Shell navItems={nav} active="rolereqs" onNav={onNav} user={user} title="Role Requests"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Role Requests <span className="page-sub">· Member → Student access</span></h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{pending}</b> awaiting approval. Approving adds the Student role only — the applicant chooses a course + batch from Browse Courses afterwards.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button variant="secondary" icon="download">Export CSV</Button>
          </div>
        </div>

        <div className="flow-strip">
          <div className="flow-step active"><i>1</i> Role request <small>Awaits admin</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>2</i> Grant Student role <small>Adds to roles[]</small></div>
          <div className="flow-arrow"><Icon name="arrow-right" size={14} /></div>
          <div className="flow-step"><i>3</i> Student picks a course <small>Separate enrolment approval</small></div>
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
                <th>Applicant</th><th>Submitted</th><th>Status</th>
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
                  <td className="muted">{r.submitted}</td>
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

/* ─────────────────── Admin · Batches Manager */
const TBatchesAdmin = ({ user, onNav, role = "admin" }) => {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";
  const [showForm, setShowForm] = useTLS(false);
  const [toast, setToast] = useTLS(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const batches = [
    { id: 1, course: "New Believers Foundations", name: "Intake B · Q2 2026", start: "01 May 2026", end: "20 May 2026", state: "open",   cap: 60, enrolled: 47 },
    { id: 2, course: "Old Testament Survey",      name: "Intake B · Q2 2026", start: "01 Apr 2026", end: "15 Apr 2026", state: "open",   cap: 60, enrolled: 38 },
    { id: 3, course: "Old Testament Survey",      name: "Intake A · Q1 2026", start: "20 Jan 2026", end: "31 Jan 2026", state: "closed", cap: 45, enrolled: 45 },
    { id: 4, course: "Discipleship",              name: "Intake A · Q3 2026", start: "01 Jul 2026", end: "15 Jul 2026", state: "draft",  cap: 40, enrolled:  0 },
    { id: 5, course: "Leadership in Church",      name: "Intake A · Q3 2026", start: "01 Jul 2026", end: "15 Jul 2026", state: "draft",  cap: 30, enrolled:  0 }
  ];

  return (
    <Shell navItems={nav} active="batches" onNav={onNav} user={user} title="Batches"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Batches <span className="page-sub">· course intakes</span></h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{batches.length}</b> total · {batches.filter(b => b.state === "open").length} open · {batches.filter(b => b.state === "closed").length} closed</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="filter">Filter</Button>
            <Button icon="plus" onClick={() => setShowForm(true)}>New batch</Button>
          </div>
        </div>

        {showForm && (
          <div className="settings-card">
            <h2>Create new batch</h2>
            <p className="settings-sub">Open a new intake for an existing course. The applicant picks one of these when they apply.</p>
            <div className="form-grid two">
              <div className="field">
                <label className="label">Course</label>
                <select className="input">
                  <option>New Believers Foundations</option>
                  <option>Old Testament Survey</option>
                  <option>Discipleship</option>
                  <option>Leadership in Church</option>
                </select>
              </div>
              <Input label="Batch name" placeholder="e.g. Intake C · Q3 2026" />
              <Input label="Intake opens" type="date" />
              <Input label="Intake closes" type="date" />
              <Input label="Capacity (seats)" type="number" defaultValue="60" />
              <div className="field">
                <label className="label">Initial state</label>
                <select className="input" defaultValue="draft">
                  <option value="draft">Draft (not visible to members)</option>
                  <option value="open">Open (accepting applications)</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button icon="check" onClick={() => { setShowForm(false); flash({ tone: "success", title: "Batch created", message: "Visible in catalog when state is set to Open." }); }}>Create batch</Button>
            </div>
          </div>
        )}

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Course</th><th>Batch</th><th>Intake window</th><th>Capacity</th><th>State</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td><div style={{ fontWeight: 600 }}>{b.course}</div></td>
                  <td>{b.name}</td>
                  <td className="muted">{b.start} → {b.end}</td>
                  <td><b>{b.enrolled}</b> <span className="muted">/ {b.cap}</span></td>
                  <td>
                    {b.state === "open"   && <Badge tone="success">Open</Badge>}
                    {b.state === "closed" && <Badge tone="archive">Closed</Badge>}
                    {b.state === "draft"  && <Badge tone="warning">Draft</Badge>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button size="sm" variant="ghost" icon="edit-3">Edit</Button>
                      {b.state === "open" && <Button size="sm" variant="ghost" icon="x-circle">Close</Button>}
                      {b.state === "draft" && <Button size="sm" variant="ghost" icon="play">Open</Button>}
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

/* ─────────────────── Admin · Semester Dates editor (inside a course) */
const TSemesterDatesEditor = ({ user, onNav, role = "admin" }) => {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";
  const [toast, setToast] = useTLS(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const semesters = [
    { id: "S1", title: "Semester 1 · Beginnings",        open: "2026-05-01", end: "2026-06-30", state: "open"   },
    { id: "S2", title: "Semester 2 · Kings & Prophets",  open: "2026-07-01", end: "2026-08-31", state: "future" }
  ];

  return (
    <Shell navItems={nav} active="courses" onNav={onNav} user={user} title="Old Testament Survey · Semesters"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Semester dates</h1>
            <div className="greeting">Set start and end dates for each semester. Content auto-locks after the end date.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="arrow-left" onClick={() => onNav("courses")}>Back to course</Button>
            <Button icon="plus">Add semester</Button>
          </div>
        </div>

        <div className="role-banner">
          <div className="ico"><Icon name="info" size={20} /></div>
          <div className="b-body">
            <h3>Date changes affect every enrolled student</h3>
            <p>If a semester is already in progress, the end date can be extended but not pulled back. The system shows learners a "Closed" badge as soon as the end date passes.</p>
          </div>
        </div>

        {semesters.map(s => (
          <div className="settings-card" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{s.title}</h2>
              {s.state === "open"  && <Badge tone="success">Active now</Badge>}
              {s.state === "future"&& <Badge tone="warning">Upcoming</Badge>}
              {s.state === "closed"&& <Badge tone="error">Closed</Badge>}
            </div>
            <div className="form-grid two">
              <Input label="Open date" type="date" defaultValue={s.open} hint="Lessons unlock for enrolled students from this date" />
              <Input label="End date"  type="date" defaultValue={s.end}  hint="After this date, content shows as closed (read-only)" />
            </div>
            <div className="form-actions">
              <Button variant="ghost">Reset</Button>
              <Button icon="check" onClick={() => flash({ tone: "success", title: "Dates updated", message: s.title })}>Save dates</Button>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

/* ─────────────────── TCCR Admin Dashboard (lite, links into v2 surfaces) */
const TAdminDashboard = ({ user, onNav, role = "admin" }) => {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";

  const kpis = [
    { ico: "user-plus",      lbl: "Pending Role Requests", num: "8",     trend: "3 today",          warn: true,  to: "rolereqs" },
    { ico: "clipboard-list", lbl: "Pending Enrolments",    num: "6",     trend: "2 today",          warn: true,  to: "enrolments" },
    { ico: "users",          lbl: "Total Members",         num: "3,248", trend: "+12% / mo" },
    { ico: "graduation-cap", lbl: "Active Students",       num: "812",   trend: "+5% / mo" }
  ];

  const activity = [
    { ico: "user-plus", tone: "s", title: "Anjali Silva applied for New Believers Foundations", meta: "Awaiting role + enrol approval", when: "2 min ago" },
    { ico: "clipboard-list", tone: "s", title: "Cell report · Mt Lavinia care cell · Wed 13 May", meta: "by Tania F. · 10 present, 2 absent", when: "12 min ago" },
    { ico: "calendar-clock", tone: null, title: "Batch closed automatically · Intake A · OT Survey", meta: "Intake window passed", when: "1 h ago" },
    { ico: "check-circle", tone: "s", title: "Course \"Discipleship\" published", meta: "by Tania F.", when: "1 d ago" }
  ];

  return (
    <Shell navItems={nav} active="dashboard" onNav={onNav} user={user} title={role === "super_admin" ? "Super Admin" : "Admin Dashboard"}
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{role === "super_admin" ? "Platform overview" : "Operations overview"}</h1>
            <div className="greeting">Last 30 days · across Bible School and Cell Groups.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button icon="plus" onClick={() => onNav("courses/new")}>New course</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {kpis.map(k => (
            <div className="kpi-mini" key={k.lbl} style={{ cursor: k.to ? "pointer" : "default" }} onClick={() => k.to && onNav(k.to)}>
              <div className="row">
                <div className="lbl" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name={k.ico} size={14} /> {k.lbl}</div>
                {k.warn && <span className="delta dn">action</span>}
              </div>
              <div className="num">{k.num}</div>
              <div className="sub">{k.trend}</div>
            </div>
          ))}
        </div>

        <div className="section-h"><h3>Quick actions</h3></div>
        <div className="qa-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { ico: "user-plus",      lbl: "Review role requests", to: "rolereqs" },
            { ico: "book-open",      lbl: "Manage courses",       to: "courses" },
            { ico: "users",          lbl: "Users",                to: "users" }
          ].map(qa => (
            <div className="qa" key={qa.lbl} onClick={() => onNav(qa.to)}>
              <div className="qa-ico"><Icon name={qa.ico} size={18} /></div>
              <div className="qa-label">{qa.lbl}</div>
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

/* ─────────────────── Admin · Users (search-driven directory) */
const TUsersAdmin = ({ user, onNav, role = "admin" }) => {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";
  const [toast, setToast] = useTLS(null);
  const [q, setQ] = useTLS("");
  const [openMenu, setOpenMenu] = useTLS(null);
  const [profile, setProfile] = useTLS(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const allUsers = [
    { id: 1, name: "Anjali Silva",       email: "anjali@example.com",   roles: ["member","student"],                  status: "active",    joined: "Jan 2026", avatar: 47, phone: "+94 77 555 0142" },
    { id: 2, name: "Ravi Tilakaratne",   email: "ravi.t@example.com",   roles: ["member","student","leader"],         status: "active",    joined: "Feb 2026", avatar: 12, phone: "+94 77 555 0188" },
    { id: 3, name: "Priya Mendis",       email: "priya@example.com",    roles: ["member","student"],                  status: "active",    joined: "Mar 2026", avatar: 32, phone: "+94 77 555 0223" },
    { id: 4, name: "Tania Fernando",     email: "tania@example.com",    roles: ["member","student","leader","g12"],   status: "active",    joined: "Nov 2025", avatar: 48, phone: "+94 77 555 0101" },
    { id: 5, name: "Nadeesha Fernando",  email: "nadeesha@example.com", roles: ["member"],                            status: "active",    joined: "Mar 2026", avatar: 38, phone: "+94 77 555 0309" },
    { id: 6, name: "Saman Perera",       email: "saman@example.com",    roles: ["member","leader"],                   status: "active",    joined: "Apr 2026", avatar: 22, phone: "+94 77 555 0415" },
    { id: 7, name: "Kasun Bandara",      email: "kasun@example.com",    roles: ["member"],                            status: "suspended", joined: "Apr 2026", avatar: 5,  phone: "+94 77 555 0511" },
    { id: 8, name: "Dinithi Jayawardene",email: "dinithi@example.com",  roles: ["member","student","leader"],         status: "active",    joined: "May 2026", avatar: 14, phone: "+94 77 555 0622" },
    { id: 9, name: "Janaka Liyanage",    email: "janaka@edupath.org",   roles: ["member","admin"],                    status: "active",    joined: "Oct 2025", avatar: 7,  phone: "+94 77 555 0703" },
    { id:10, name: "Imani Rajapaksa",    email: "imani@example.com",    roles: ["member","student"],                  status: "active",    joined: "Apr 2026", avatar: 38, phone: "+94 77 555 0808" },
    { id:11, name: "Sahan Wijeratne",    email: "sahan@example.com",    roles: ["member","leader"],                   status: "active",    joined: "May 2026", avatar: 22, phone: "+94 77 555 0915" },
    { id:12, name: "Dilshan Perera",     email: "dilshan@example.com",  roles: ["member"],                            status: "active",    joined: "May 2026", avatar: 28, phone: "+94 77 555 1023" },
    { id:13, name: "Asha Wickrama",      email: "asha@example.com",     roles: ["member","student"],                  status: "active",    joined: "Apr 2026", avatar: 19, phone: "+94 77 555 1130" }
  ];
  const filtered = q.trim()
    ? allUsers.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
    : allUsers.slice(0, 8);

  const renderActions = (u) => {
    const actions = [];
    if (!u.roles.includes("leader")) actions.push({ label: "Make Leader", icon: "chevron-up", onClick: () => flash({ tone: "success", title: "Promoted to Leader", message: u.name }) });
    if (u.roles.includes("leader") && !u.roles.includes("g12")) actions.push({ label: "Make G12", icon: "chevron-up", onClick: () => flash({ tone: "success", title: "Promoted to G12", message: u.name }) });
    return (
      <div style={{ display: "inline-flex", gap: 6 }}>
        {actions.map((a, i) => (
          <Button key={i} size="sm" variant="ghost" icon={a.icon} onClick={a.onClick}>{a.label}</Button>
        ))}
        <div style={{ position: "relative" }}>
          <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)} className="btn btn--ghost btn--sm" style={{ padding: "0 10px" }}>
            <Icon name="more-horizontal" size={16} />
          </button>
          {openMenu === u.id && (
            <div onMouseLeave={() => setOpenMenu(null)} style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: 160, background: "#fff", border: "1px solid rgba(21,42,36,0.08)", borderRadius: 10, boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18)", padding: 4, zIndex: 50 }}>
              <button onClick={() => { setOpenMenu(null); setProfile(u); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", fontSize: 13, color: "#152A24", fontWeight: 500 }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#F5F5F5"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                <Icon name="user" size={14} /> View profile
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Shell navItems={nav} active="users" onNav={onNav} user={user} title="Users"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Users</h1>
            <div className="greeting"><b style={{ color: "#152A24" }}>{allUsers.length}</b> total · {q.trim() ? <>showing <b style={{ color: "#152A24" }}>{filtered.length}</b> matching "{q}"</> : <>showing latest <b style={{ color: "#152A24" }}>8</b> by default. Search to find anyone.</>}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E5E5", borderRadius: 9999, padding: "8px 14px", minWidth: 340 }}>
            <Icon name="search" size={16} style={{ color: "#41574A" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…"
              style={{ border: "none", outline: "none", flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", background: "transparent" }} />
            {q && <button onClick={() => setQ("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6", padding: 0 }}><Icon name="x" size={14} /></button>}
          </div>
        </div>

        <div className="role-banner">
          <div className="ico"><Icon name="info" size={20} /></div>
          <div className="b-body">
            <h3>How promotions work</h3>
            <p>Members ask a pastor or G12 leader in person to become a Leader or G12. The admin then adds the role here — roles are additive (the user keeps Member &amp; Student access).</p>
          </div>
        </div>

        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr><th>Person</th><th>Phone</th><th>Roles</th><th>Joined</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#41574A", fontFamily: "var(--font-body)" }}>No users match "{q}".</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={KIT.avatar(u.avatar)} size="sm" name={u.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{u.phone}</td>
                  <td><RoleBadgeStack roles={u.roles} /></td>
                  <td className="muted">{u.joined}</td>
                  <td>{u.status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="error">Suspended</Badge>}</td>
                  <td style={{ textAlign: "right" }}>{renderActions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {profile && (
        <div className="modal-backdrop" onClick={() => setProfile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Avatar src={KIT.avatar(profile.avatar)} size="lg" name={profile.name} />
                <div>
                  <h2 style={{ margin: 0 }}>{profile.name}</h2>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A", marginTop: 2 }}>{profile.email} · {profile.phone}</div>
                  <div style={{ marginTop: 6 }}><RoleBadgeStack roles={profile.roles} /></div>
                </div>
              </div>
              <button onClick={() => setProfile(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6" }}><Icon name="x" size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#41574A", textTransform: "uppercase", letterSpacing: 0.06 }}>Status</div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#152A24" }}>{profile.status === "active" ? "Active" : "Suspended"}</div>
              </div>
              <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#41574A", textTransform: "uppercase", letterSpacing: 0.06 }}>Joined</div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#152A24" }}>{profile.joined}</div>
              </div>
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 8 }}>
              {profile.status === "active"
                ? <Button variant="secondary" icon="user-x" onClick={() => { flash({ tone: "warning", title: "User suspended", message: profile.name }); setProfile(null); }}>Suspend user</Button>
                : <Button variant="secondary" icon="user-check" onClick={() => { flash({ tone: "success", title: "User reactivated", message: profile.name }); setProfile(null); }}>Reactivate user</Button>}
              <Button variant="ghost" icon="key" onClick={() => flash({ tone: "success", title: "Password reset email sent", message: profile.email })}>Reset password</Button>
              <Button variant="destructive" icon="trash-2" onClick={() => { flash({ tone: "warning", title: "User deleted", message: profile.name }); setProfile(null); }}>Delete user</Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
};

/* New-course wizard with Batches/Intakes + Semester dates clamped to batch window. */
function TNewCourse({ user, onNav, role = "admin" }) {
  const nav = role === "super_admin" ? TCCR_SADMIN_NAV : TCCR_ADMIN_NAV;
  const accent = role === "super_admin" ? "Super Admin" : "Administrator";
  const [toast, setToast] = useTLS(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };
  const [title, setTitle] = useTLS("");
  const [desc, setDesc] = useTLS("");
  const [batches, setBatches] = useTLS([{ id: "b1", name: "Intake A · Q2 2026", start: "2026-05-01", end: "2026-05-20", cap: 60 }]);
  const [semesters, setSemesters] = useTLS([{ id: "S1", title: "Semester 1", start: "2026-05-01", end: "2026-06-30", subjects: [
    { id: "su1", title: "Fundamentals", description: "", lessons: [
      { id: "l1", title: "", description: "", youtube: "", attachments: [] }
    ]}
  ]}]);

  const addBatch = () => setBatches([...batches, { id: "b" + (batches.length + 1), name: "Intake " + String.fromCharCode(65 + batches.length) + " · 2026", start: "", end: "", cap: 60 }]);
  const updBatch = (i, patch) => setBatches(batches.map((b, j) => j === i ? { ...b, ...patch } : b));
  const rmBatch  = (i) => setBatches(batches.filter((_, j) => j !== i));
  const addSem = () => setSemesters([...semesters, { id: "S" + (semesters.length + 1), title: "Semester " + (semesters.length + 1), start: "", end: "", subjects: [] }]);
  const updSem = (i, patch) => setSemesters(semesters.map((s, j) => j === i ? { ...s, ...patch } : s));
  const rmSem  = (i) => setSemesters(semesters.filter((_, j) => j !== i));
  const addSubject = (i) => updSem(i, { subjects: [...(semesters[i].subjects || []), { id: "su" + Date.now(), title: "New subject", description: "", lessons: [] }] });
  const updSubject = (i, j, patch) => updSem(i, { subjects: semesters[i].subjects.map((s, k) => k === j ? { ...s, ...patch } : s) });
  const rmSubject  = (i, j) => updSem(i, { subjects: semesters[i].subjects.filter((_, k) => k !== j) });
  const addLesson  = (i, j) => updSubject(i, j, { lessons: [...(semesters[i].subjects[j].lessons || []), { id: "l" + Date.now(), title: "", description: "", youtube: "", attachments: [] }] });
  const updLesson  = (i, j, k, patch) => updSubject(i, j, { lessons: semesters[i].subjects[j].lessons.map((l, m) => m === k ? { ...l, ...patch } : l) });
  const rmLesson   = (i, j, k) => updSubject(i, j, { lessons: semesters[i].subjects[j].lessons.filter((_, m) => m !== k) });
  const addAttachment = (i, j, k, files) => {
    if (!files || !files.length) return;
    const l = semesters[i].subjects[j].lessons[k];
    const next = Array.from(files).map(f => ({ name: f.name, size: Math.round(f.size / 1024) + " KB" }));
    updLesson(i, j, k, { attachments: [...(l.attachments || []), ...next] });
  };
  const rmAttachment  = (i, j, k, m) => updLesson(i, j, k, { attachments: semesters[i].subjects[j].lessons[k].attachments.filter((_, n) => n !== m) });

  const minStart = batches.length ? batches.reduce((m, b) => !m || (b.start && b.start < m) ? b.start : m, "") : "";
  const maxEnd   = batches.length ? batches.reduce((m, b) => !m || (b.end   && b.end   > m) ? b.end   : m, "") : "";

  return (
    <Shell navItems={nav} active="courses" onNav={onNav} user={user} title="New course"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Create a course</h1>
            <div className="greeting">Title → batches → semesters → subjects. Semester dates auto-clamp to the batch window so students never see content outside an intake.</div>
          </div>
          <Button variant="secondary" icon="arrow-left" onClick={() => onNav("courses")}>Back to courses</Button>
        </div>

        <div className="settings-card">
          <h2>Course title</h2>
          <p className="settings-sub">Must be unique. Changes take effect immediately.</p>
          <div className="form-grid one">
            <Input label="Title" placeholder="e.g. Foundations of Faith" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="field">
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One paragraph that appears in the catalog." />
            </div>
          </div>
          <div className="form-actions">
            <Button icon="save" disabled={!title.trim()}
              onClick={() => { flash({ tone: "success", title: "Course created as draft", message: title || "Untitled course" }); setTimeout(() => onNav("courses"), 700); }}>
              Create course
            </Button>
          </div>
          <p className="hint" style={{ marginTop: 8, color: "#41574A" }}>Saves as a draft. Add batches, semesters and lessons below — or come back later from Courses → Edit.</p>
        </div>

        <div className="settings-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>Batches &amp; intakes</h2>
              <p className="settings-sub" style={{ margin: "4px 0 0" }}>Each batch is a cohort with its own intake window. Past intakes auto-close.</p>
            </div>
            <Button size="sm" icon="plus" onClick={addBatch}>Add batch</Button>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {batches.map((b, i) => (
              <div key={b.id} style={{ border: "1px solid #E5E5E5", borderRadius: 14, padding: 16 }}>
                <div className="form-grid two" style={{ marginBottom: 0 }}>
                  <Input label="Batch name" value={b.name} onChange={(e) => updBatch(i, { name: e.target.value })} />
                  <Input label="Capacity" type="number" value={b.cap} onChange={(e) => updBatch(i, { cap: e.target.value })} />
                  <Input label="Intake opens" type="date" value={b.start} onChange={(e) => updBatch(i, { start: e.target.value })} />
                  <Input label="Intake closes" type="date" value={b.end} onChange={(e) => updBatch(i, { end: e.target.value })} />
                </div>
                {batches.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <Button size="sm" variant="ghost" icon="trash-2" onClick={() => rmBatch(i)}>Remove batch</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>Semesters</h2>
              <p className="settings-sub" style={{ margin: "4px 0 0" }}>Start/end dates must fall inside the batch window {minStart && maxEnd ? <>(<b>{minStart}</b> → <b>{maxEnd}</b>)</> : ""}. Closed semesters lock content automatically.</p>
            </div>
            <Button size="sm" icon="plus" onClick={addSem}>Add semester</Button>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {semesters.map((s, i) => {
              const outOfWindow = s.start && s.end && minStart && maxEnd && (s.start < minStart || s.end > maxEnd);
              return (
                <div key={s.id} style={{ border: "1px solid " + (outOfWindow ? "#DC2626" : "#E5E5E5"), borderRadius: 14, padding: 16 }}>
                  <div className="form-grid two" style={{ marginBottom: 0 }}>
                    <Input label="Semester title" value={s.title} onChange={(e) => updSem(i, { title: e.target.value })} />
                    <div></div>
                    <Input label="Start date" type="date" value={s.start} min={minStart} max={maxEnd} onChange={(e) => updSem(i, { start: e.target.value })} />
                    <Input label="End date" type="date" value={s.end} min={minStart} max={maxEnd} onChange={(e) => updSem(i, { end: e.target.value })} />
                  </div>
                  {outOfWindow && (
                    <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: "#B91C1C" }}>
                      <Icon name="alert-triangle" size={12} /> Semester dates must be inside the batch intake window.
                    </div>
                  )}
                  {semesters.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <Button size="sm" variant="ghost" icon="trash-2" onClick={() => rmSem(i)}>Remove semester</Button>
                    </div>
                  )}

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F6F6F6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "#152A24" }}>Subjects &amp; lessons</span>
                      <Button size="sm" variant="secondary" icon="plus" onClick={() => addSubject(i)}>Add subject</Button>
                    </div>
                    {(s.subjects || []).length === 0 && (
                      <div style={{ padding: 14, background: "#FAFAFA", borderRadius: 10, fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A" }}>No subjects yet. Add one to start building lessons.</div>
                    )}
                    {(s.subjects || []).map((sub, j) => (
                      <div key={sub.id} style={{ border: "1px solid #E5E5E5", borderRadius: 12, padding: 14, marginBottom: 10, background: "#FAFAFA" }}>
                        <Input label="Subject name" value={sub.title} onChange={(e) => updSubject(i, j, { title: e.target.value })} />

                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E5E5E5" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "#152A24" }}>Lessons</span>
                            <Button size="sm" variant="ghost" icon="plus" onClick={() => addLesson(i, j)}>Add lesson</Button>
                          </div>
                          {(sub.lessons || []).map((l, k) => (
                            <div key={l.id} style={{ background: "#fff", border: "1px solid #E5E5E5", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "#41574A", textTransform: "uppercase", letterSpacing: 0.06, marginBottom: 10 }}>Lesson {k + 1}</div>
                              <div className="form-grid one" style={{ marginBottom: 0 }}>
                                <Input label="Lesson title" placeholder="e.g. Growth" value={l.title} onChange={(e) => updLesson(i, j, k, { title: e.target.value })} />
                                <div className="field">
                                  <label className="label">Description</label>
                                  <textarea className="input" rows={2} value={l.description} onChange={(e) => updLesson(i, j, k, { description: e.target.value })} placeholder="What this lesson covers." />
                                </div>
                                <Input label="YouTube URL" placeholder="https://youtube.com/watch?v=…" value={l.youtube} onChange={(e) => updLesson(i, j, k, { youtube: e.target.value })} hint="Lesson videos are embedded from YouTube only." />
                                <div className="field">
                                  <label className="label">Attachments</label>
                                  <label className="dropzone" style={{ cursor: "pointer" }}>
                                    <Icon name="upload-cloud" size={20} />
                                    <div><b>Upload from device</b> <span className="muted">PDF, DOC, slides, images</span></div>
                                    <input type="file" multiple style={{ display: "none" }} onChange={(e) => { addAttachment(i, j, k, e.target.files); e.target.value = ""; }} />
                                  </label>
                                  {(l.attachments || []).length > 0 && (
                                    <div className="attach-list">
                                      {l.attachments.map((a, m) => (
                                        <div key={m} className="attach-item">
                                          <div className="ico"><Icon name="file-text" size={14} /></div>
                                          <div className="name">{a.name}</div>
                                          <div className="size">{a.size}</div>
                                          <button className="btn btn--ghost btn--sm" onClick={() => rmAttachment(i, j, k, m)}><Icon name="x" size={12} /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                                <Button size="sm" variant="ghost" icon="trash-2" onClick={() => rmLesson(i, j, k)}>Remove lesson</Button>
                              </div>
                            </div>
                          ))}
                          {(sub.lessons || []).length === 0 && (
                            <div style={{ padding: 10, fontFamily: "var(--font-body)", fontSize: 12, color: "#A0ACA6" }}>No lessons yet — add one above.</div>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                          <Button size="sm" variant="ghost" icon="trash-2" onClick={() => rmSubject(i, j)}>Remove subject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions" style={{ background: "#fff", padding: "16px 22px", borderRadius: 14, border: "1px solid #E5E5E5", justifyContent: "space-between" }}>
          <Button variant="ghost" onClick={() => onNav("courses")}>Cancel</Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" icon="save" onClick={() => { flash({ tone: "success", title: "Draft saved" }); setTimeout(() => onNav("courses"), 700); }}>Save draft</Button>
            <Button icon="upload-cloud" onClick={() => { flash({ tone: "success", title: "Course published" }); setTimeout(() => onNav("courses"), 700); }}>Publish</Button>
          </div>
        </div>
      </div>
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </Shell>
  );
}
window.TNewCourse = TNewCourse;

Object.assign(window, {
  TCCR_ADMIN_NAV, TCCR_SADMIN_NAV,
  TLeaderDashboard, TG12Network, TG12Promote,
  TRoleRequestsQueue, TBatchesAdmin, TSemesterDatesEditor, TAdminDashboard, TUsersAdmin, TNewCourse
});
