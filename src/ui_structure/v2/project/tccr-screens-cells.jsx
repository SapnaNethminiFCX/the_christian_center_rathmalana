/* TCCR v2 — Cell Groups: list, detail, report form, report viewer.
   Roles: Member (read-only view), Leader/G12 (create/edit + file reports),
   Admin/Super Admin (everything). */

const { useState: useTCS } = React;

const OTHER_CELLS = [
  { id: "oc1", name: "Dehiwala · Friday Care",      type: "care",     area: "Dehiwala",       leader: "Imani Rajapaksa", leaderAvatar: 38, g12: "Janaka L.", members: 14, reports: 31, state: "active" },
  { id: "oc2", name: "Moratuwa · Tuesday Outreach", type: "outreach", area: "Moratuwa North", leader: "Sahan Wijeratne",leaderAvatar: 22, g12: "Tania F.",  members: 10, reports: 18, state: "active" },
  { id: "oc3", name: "Wellawatte · Children",       type: "children", area: "Wellawatte",     leader: "Dinithi J.",     leaderAvatar: 14, g12: "Tania F.",  members: 11, reports: 25, state: "active" }
];

const SAMPLE_CELLS = [
  { id: "cell1", name: "Mt Lavinia · Wednesday Care",  type: "care",      area: "Mt Lavinia",        leader: "Tania Fernando",  leaderAvatar: 48, g12: "Janaka L.",    members: 12, reports: 38, state: "active" },
  { id: "cell2", name: "Ratmalana · Sunday Outreach",  type: "outreach",  area: "Ratmalana South",   leader: "Roshan De Silva", leaderAvatar: 15, g12: "Tania F.",     members: 18, reports: 41, state: "active" },
  { id: "cell3", name: "Children's Cell · Thursday",   type: "children",  area: "Galkissa",          leader: "Dinithi J.",      leaderAvatar: 14, g12: "Tania F.",     members:  9, reports: 22, state: "active" },
  { id: "cell4", name: "G12 Leaders · Tuesday",        type: "g12",       area: "Ratmalana",         leader: "Tania Fernando",  leaderAvatar: 48, g12: "Pastor (SA)",  members:  7, reports: 19, state: "active" }
];

const SAMPLE_REPORTS = [
  { id: "r1", date: "Wed, 13 May 2026", filler: "Tania Fernando", didMeet: true, present: 10, absent: 2, visitors: 1, satisfaction: 5, subject: "Sunday Sermon · Living Hope" },
  { id: "r2", date: "Wed, 06 May 2026", filler: "Tania Fernando", didMeet: true, present: 11, absent: 1, visitors: 0, satisfaction: 4, subject: "Other · Prayer night recap" },
  { id: "r3", date: "Wed, 29 Apr 2026", filler: "Tania Fernando", didMeet: false, present: 0, absent: 0, visitors: 0, satisfaction: 0, subject: "—" },
  { id: "r4", date: "Wed, 22 Apr 2026", filler: "Tania Fernando", didMeet: true, present: 12, absent: 0, visitors: 2, satisfaction: 5, subject: "Sunday Sermon · The Good Shepherd" }
];

/* ─────────────────── Cells list (Member: read-only; Leader+: actions) */
const TCellsList = ({ user, onNav, role = "member", onCell }) => {
  const isLeader = ["leader", "g12", "admin", "super_admin"].some(r => (Array.isArray(user.roles) ? user.roles : [role]).includes(r));
  const nav = role === "g12" ? G12_NAV
           : role === "leader" ? LEADER_NAV
           : role === "student" ? STUDENT_NAV_V2
           : MEMBER_NAV;
  const accent = role === "g12" ? "G12 Leader" : role === "leader" ? "Leader" : role === "student" ? "Student" : "Member";

  return (
    <Shell navItems={nav} active={role === "leader" || role === "g12" ? "mycells" : "cells"} onNav={onNav}
           user={user} title="Cell Groups" accent={accent}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{isLeader ? "Cells" : "My Cell"}</h1>
            <div className="greeting">
              {isLeader
                ? <><b style={{ color: "#152A24" }}>{SAMPLE_CELLS.length}</b> cells you lead.</>
                : <>You are a member of <b style={{ color: "#152A24" }}>1 cell</b>. You can view other cells in your area below but cannot join them.</>}
            </div>
          </div>
          {(role === "leader" || role === "g12") && (
            <Button icon="plus" onClick={() => onCell({ id: "new" })}>Create Cell</Button>
          )}
        </div>

        {role === "member" && (Array.isArray(user.roles) && (user.roles.includes("leader") || user.roles.includes("g12"))) && (
          <div className="switch-banner">
            <div className="ico"><Icon name="shield-check" size={20} /></div>
            <div className="b-body">
              <h3>You're also a {user.roles.includes("g12") ? "G12 Leader" : "Leader"}.</h3>
              <p>Switch to your {user.roles.includes("g12") ? "G12" : "Leader"} dashboard for full access — add cells, edit members, file and review reports.</p>
            </div>
            <Button icon="arrow-up-right" onClick={() => onNav(user.roles.includes("g12") ? "switch:g12" : "switch:leader")}>
              Continue as {user.roles.includes("g12") ? "G12 Leader" : "Leader"}
            </Button>
          </div>
        )}

        {isLeader && <div className="section-h" style={{ marginTop: 0 }}><h3>My cells</h3></div>}

        <div className="cell-grid">
          {(role === "member" ? SAMPLE_CELLS.slice(0, 1) : SAMPLE_CELLS).map(c => (
            <article key={c.id} className="cell-card" onClick={() => onCell(c)}>
              <div className="top">
                <div>
                  <h3>{c.name}</h3>
                  <div className="leader">
                    <Avatar src={KIT.avatar(c.leaderAvatar)} size="sm" name={c.leader} /> {c.leader}
                  </div>
                </div>
                <span className={"cell-type " + c.type}>{c.type === "g12" ? "G12" : c.type}</span>
              </div>

              <div className="members-row">
                <div className="stack">
                  {[c.leaderAvatar, (c.leaderAvatar + 7) % 70 + 1, (c.leaderAvatar + 14) % 70 + 1, (c.leaderAvatar + 21) % 70 + 1].map(n => (
                    <Avatar key={n} src={KIT.avatar(n)} size="sm" name="" />
                  ))}
                </div>
                <span className="members-count">{c.members} members</span>
              </div>

              <div className="footer">
                <span className="stat"><Icon name="map-pin" size={12} /> {c.area}</span>
                <span className="stat"><b>{c.reports}</b> reports</span>
              </div>
            </article>
          ))}
        </div>

        {role === "member" && (
          <React.Fragment>
            <div className="section-h"><h3>Other available cells <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A", fontWeight: 500, marginLeft: 8 }}>· view-only</span></h3></div>
            <div className="cell-grid">
              {OTHER_CELLS.map(c => (
                <article key={c.id} className="cell-card" style={{ cursor: "default", opacity: 0.85 }} onClick={(e) => e.preventDefault()}>
                  <div className="top">
                    <div>
                      <h3>{c.name}</h3>
                      <div className="leader">
                        <Avatar src={KIT.avatar(c.leaderAvatar)} size="sm" name={c.leader} /> {c.leader}
                      </div>
                    </div>
                    <span className={"cell-type " + c.type}>{c.type === "g12" ? "G12" : c.type}</span>
                  </div>
                  <div className="members-row">
                    <div className="stack">
                      {[c.leaderAvatar, (c.leaderAvatar + 9) % 70 + 1, (c.leaderAvatar + 18) % 70 + 1].map(n => (
                        <Avatar key={n} src={KIT.avatar(n)} size="sm" name="" />
                      ))}
                    </div>
                    <span className="members-count">{c.members} members</span>
                  </div>
                  <div className="footer">
                    <span className="stat"><Icon name="map-pin" size={12} /> {c.area}</span>
                    <span className="stat"><Icon name="lock" size={12} /> view-only</span>
                  </div>
                </article>
              ))}
            </div>
          </React.Fragment>
        )}

        {role !== "member" && false && isLeader && (
          <React.Fragment>
          <div className="section-h"><h3>Other available cells</h3></div>
          <div className="cell-grid">
            {OTHER_CELLS.map(c => (
              <article key={c.id} className="cell-card" onClick={() => onCell(c)}>
                <div className="top">
                  <div>
                    <h3>{c.name}</h3>
                    <div className="leader">
                      <Avatar src={KIT.avatar(c.leaderAvatar)} size="sm" name={c.leader} /> {c.leader}
                    </div>
                  </div>
                  <span className={"cell-type " + c.type}>{c.type === "g12" ? "G12" : c.type}</span>
                </div>
                <div className="members-row">
                  <div className="stack">
                    {[c.leaderAvatar, (c.leaderAvatar + 9) % 70 + 1, (c.leaderAvatar + 18) % 70 + 1].map(n => (
                      <Avatar key={n} src={KIT.avatar(n)} size="sm" name="" />
                    ))}
                  </div>
                  <span className="members-count">{c.members} members</span>
                </div>
                <div className="footer">
                  <span className="stat"><Icon name="map-pin" size={12} /> {c.area}</span>
                  <span className="stat"><b>{c.reports}</b> reports</span>
                </div>
              </article>
            ))}
          </div>
          </React.Fragment>
        )}
      </div>
    </Shell>
  );
};

/* ─────────────────── Cell detail (Members, Reports tabs) */
const TCellDetail = ({ user, onNav, role = "member", cell, onReportNew, onReport }) => {
  const c = cell || SAMPLE_CELLS[0];
  const [tab, setTab] = useTCS("members");
  const canFileReports = ["leader", "g12", "super_admin"].some(r => (Array.isArray(user.roles) ? user.roles : [role]).includes(r));
  const isLeader = ["leader", "g12", "admin", "super_admin"].some(r => (Array.isArray(user.roles) ? user.roles : [role]).includes(r));
  const nav = role === "g12" ? G12_NAV
           : role === "leader" ? LEADER_NAV
           : role === "student" ? STUDENT_NAV_V2
           : MEMBER_NAV;
  const accent = role === "g12" ? "G12 Leader" : role === "leader" ? "Leader" : role === "student" ? "Student" : "Member";

  const [showAddMembers, setShowAddMembers] = useTCS(false);
  const [showEditCell, setShowEditCell] = useTCS(false);
  const [editName, setEditName] = useTCS((cell && cell.name) || "");
  const [editToast, setEditToast] = useTCS(null);
  const [memberQ, setMemberQ] = useTCS("");
  const memberRows = [
    { name: "Anjali Silva",      avatar: 47, since: "Jan 2026", attendance: "12/12" },
    { name: "Ravi Tilakaratne",  avatar: 12, since: "Feb 2026", attendance: "10/12" },
    { name: "Priya Mendis",      avatar: 32, since: "Mar 2026", attendance: "11/12" },
    { name: "Nadeesha Fernando", avatar: 38, since: "Mar 2026", attendance: "9/12" },
    { name: "Saman Perera",      avatar: 22, since: "Apr 2026", attendance: "8/8" }
  ];

  return (
    <Shell navItems={nav} active={role === "leader" || role === "g12" ? "mycells" : "cells"} onNav={onNav}
           user={user} title={c.name} accent={accent}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div style={{ marginBottom: 14 }}>
          <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => {
            const target = role === "leader" || role === "g12" ? "mycells"
                         : role === "admin" || role === "super_admin" ? "cellsadmin"
                         : "cells";
            onNav(target);
          }}>Back to cells</Button>
        </div>
        <div className="cd-header">
          <span className={"cell-type " + c.type} style={{ position: "relative", zIndex: 1 }}>{c.type === "g12" ? "G12" : c.type}</span>
          <h1>{c.name}</h1>
          <div className="meta">
            <span><Icon name="map-pin" size={14} /> {c.area}</span>
            <span><Icon name="user" size={14} /> Leader: {c.leader}</span>
            <span><Icon name="shield" size={14} /> G12: {c.g12}</span>
            <span><Icon name="users" size={14} /> {c.members} members</span>
            <span><Icon name="clipboard-list" size={14} /> {c.reports} reports</span>
          </div>
          {(role === "leader" || role === "g12") && (
            <div className="cd-actions">
              <Button size="lg" icon="plus" onClick={() => onReportNew(c)}>Cell Report</Button>
              <Button size="lg" variant="secondary-light" icon="edit-3" onClick={() => setShowEditCell(true)}>Edit cell</Button>
            </div>
          )}
        </div>

        <div className="cd-tabs">
          <button className={"cd-tab" + (tab === "members" ? " active" : "")} onClick={() => setTab("members")}>
            <Icon name="users" size={16} /> Members <span className="count">{c.members}</span>
          </button>
          {role !== "member" && (
            <button className={"cd-tab" + (tab === "reports" ? " active" : "")} onClick={() => setTab("reports")}>
              <Icon name="clipboard-list" size={16} /> Reports <span className="count">{c.reports}</span>
            </button>
          )}
          {role === "member" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: "auto", padding: "10px 14px", fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A" }}>
              <Icon name="clipboard-list" size={14} /> <b style={{ color: "#152A24" }}>{c.reports}</b> reports filed by your leader
            </div>
          )}
        </div>

        {isLeader && showEditCell && (
          <div className="settings-card" style={{ marginBottom: 18, borderColor: "#152A24" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>Edit cell</h2>
              <button onClick={() => setShowEditCell(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6" }}><Icon name="x" size={18} /></button>
            </div>
            <p className="settings-sub">Rename the cell. Other settings are managed elsewhere.</p>
            <Input label="Cell name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowEditCell(false)}>Cancel</Button>
              <Button icon="check" onClick={() => { setShowEditCell(false); setEditToast({ tone: "success", title: "Cell updated", message: editName }); setTimeout(() => setEditToast(null), 2500); }}>Save</Button>
            </div>
          </div>
        )}

        {tab === "members" && (
          <div className="tbl-card">
            <div className="tbl-bar">
              <span className="live"><i></i>{memberRows.length} active</span>
              {isLeader && <Button size="sm" icon="user-plus" onClick={() => setShowAddMembers(v => !v)}>{showAddMembers ? "Cancel" : "Add members"}</Button>}
            </div>
            {isLeader && showAddMembers && (
              <div style={{ padding: "16px 20px", background: "#FAFAFA", borderBottom: "1px solid #F6F6F6" }}>
                <Typeahead
                  label="Member name"
                  placeholder="Type a member's name…"
                  directory={TCCR_DIRECTORY}
                  hint="Suggestions appear from the TCCR directory. If they're not registered, add as unregistered."
                  onPick={(m) => { setEditToast({ tone: "success", title: "Member added", message: m.name }); setTimeout(() => setEditToast(null), 2500); setShowAddMembers(false); }}
                  onAddUnregistered={(name) => { setEditToast({ tone: "warning", title: "Added as unregistered", message: name + " — they'll show up as unregistered until they sign up." }); setTimeout(() => setEditToast(null), 2800); setShowAddMembers(false); }}
                />
              </div>
            )}
            <table className="tbl">
              <thead>
                <tr><th>Member</th><th>Joined</th><th>Role</th></tr>
              </thead>
              <tbody>
                {memberRows.map((m, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <Avatar src={KIT.avatar(m.avatar)} size="sm" name={m.name} />
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                      </div>
                    </td>
                    <td className="muted">{m.since}</td>
                    <td><RoleBadgeStack roles={i === 0 ? ["member","student"] : ["member"]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "reports" && (
          <div>
            {role === "member" && Array.isArray(user.roles) && (user.roles.includes("leader") || user.roles.includes("g12")) && (
              <div className="switch-banner" style={{ marginBottom: 18 }}>
                <div className="ico"><Icon name="shield-check" size={20} /></div>
                <div className="b-body">
                  <h3>You're also a {user.roles.includes("g12") ? "G12 Leader" : "Leader"}.</h3>
                  <p>Continue to your {user.roles.includes("g12") ? "G12" : "Leader"} dashboard to file or review reports.</p>
                </div>
                <Button icon="arrow-up-right" onClick={() => onNav(user.roles.includes("g12") ? "switch:g12" : "switch:leader")}>
                  Continue as {user.roles.includes("g12") ? "G12 Leader" : "Leader"}
                </Button>
              </div>
            )}
            {!canFileReports && !isLeader && role !== "member" && (
              <div className="role-banner" style={{ marginBottom: 18 }}>
                <div className="ico"><Icon name="info" size={20} /></div>
                <div className="b-body">
                  <h3>Read-only access</h3>
                  <p>You can view past reports of your cell, but only your Leader or G12 Leader can file new ones.</p>
                </div>
              </div>
            )}
            {SAMPLE_REPORTS.map(r => (
              <div key={r.id} className="report-card" onClick={() => onReport && onReport(r)}>
                <div>
                  <div className="title">{r.didMeet ? r.subject : "Cell did not meet"}</div>
                  <div className="meta">
                    <span><Icon name="calendar" size={12} />{r.date}</span>
                    <span><Icon name="user" size={12} />{r.filler}</span>
                    {r.didMeet && <span><Icon name="users" size={12} />{r.present} present · {r.absent} absent</span>}
                    {r.didMeet && r.visitors > 0 && <span><Icon name="user-plus" size={12} />{r.visitors} visitor{r.visitors > 1 ? "s" : ""}</span>}
                  </div>
                </div>
                <div className="right">
                  {r.didMeet ? <Badge tone="success">Met</Badge> : <Badge tone="warning">No meeting</Badge>}
                  {r.satisfaction > 0 && <span style={{ color: "#BCE955", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(r.satisfaction)}</span>}
                  <Icon name="chevron-right" size={14} style={{ color: "#A0ACA6" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {false && tab === "activity" && (
          <div className="activity">
            {[
              { ico: "user-plus",     tone: "s", title: "Saman Perera added to cell",              meta: "by Tania F.",                      when: "2 days ago" },
              { ico: "clipboard-list",tone: "s", title: "Cell report filed · Wed, 13 May 2026",   meta: "by Tania F. · 10 present",         when: "5 days ago" },
              { ico: "edit-3",        tone: null, title: "Cell area updated",                      meta: "Galkissa → Mt Lavinia",            when: "1 w ago" },
              { ico: "user-plus",     tone: "s", title: "Anjali Silva added to cell",              meta: "by Tania F.",                      when: "3 w ago" }
            ].map((a, i) => (
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
        )}
      </div>

      {showAddMembers && false && (
        <div className="modal-backdrop" onClick={() => setShowAddMembers(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Add members</h2>
              <button onClick={() => setShowAddMembers(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6" }}><Icon name="x" size={20} /></button>
            </div>
            <p className="settings-sub" style={{ textAlign: "left" }}>Type a name and add. They'll get a notification on add.</p>
            <Input label="Member name" placeholder="Type a member's name" value={memberQ}
                   onChange={(e) => setMemberQ(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const name = memberQ.trim(); if (name) { setMemberQ(""); setShowAddMembers(false); setEditToast({ tone: "success", title: "Member added", message: name }); setTimeout(() => setEditToast(null), 2500); } } }} />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowAddMembers(false)}>Cancel</Button>
              <Button icon="plus" disabled={!memberQ.trim()}
                onClick={() => { const name = memberQ.trim(); setMemberQ(""); setShowAddMembers(false); setEditToast({ tone: "success", title: "Member added", message: name }); setTimeout(() => setEditToast(null), 2500); }}>
                Add member
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditCell && false && (
        <div className="modal-backdrop" onClick={() => setShowEditCell(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Edit cell</h2>
              <button onClick={() => setShowEditCell(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6" }}><Icon name="x" size={20} /></button>
            </div>
            <p className="settings-sub" style={{ textAlign: "left" }}>Rename the cell. Other settings are managed elsewhere.</p>
            <Input label="Cell name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowEditCell(false)}>Cancel</Button>
              <Button icon="check" onClick={() => { setShowEditCell(false); setEditToast({ tone: "success", title: "Cell updated", message: editName }); setTimeout(() => setEditToast(null), 2500); }}>Save</Button>
            </div>
          </div>
        </div>
      )}
      {editToast && <Toast {...editToast} onDismiss={() => setEditToast(null)} />}
    </Shell>
  );
};

/* ─────────────────── Cell Report — multi-step form */
const TCellReportForm = ({ user, onNav, cell, onSubmit }) => {
  const c = cell || SAMPLE_CELLS[0];
  const [step, setStep] = useTCS(2);
  const [didMeet, setDidMeet] = useTCS("yes");
  const [present, setPresent] = useTCS("yes");
  const [subject, setSubject] = useTCS("sunday_sermon");
  const [cellType, setCellType] = useTCS(c.type);
  const [satisfaction, setSatisfaction] = useTCS(4);
  const [attendance, setAttendance] = useTCS({
    "Anjali Silva":      "present",
    "Ravi Tilakaratne":  "present",
    "Priya Mendis":      "present",
    "Nadeesha Fernando": "absent",
    "Saman Perera":      "present"
  });
  const role = (Array.isArray(user.roles) && user.roles.includes("g12")) ? "g12" : "leader";
  const nav = role === "g12" ? G12_NAV : LEADER_NAV;
  const accent = role === "g12" ? "G12 Leader" : "Leader";

  const steps = [
    { n: 1, title: "Did the cell meet?", sub: "Yes / No" },
    { n: 2, title: "Meeting basics",     sub: "Date, location, time" },
    { n: 3, title: "Subject discussed",  sub: "Sunday sermon / Other" },
    { n: 4, title: "Attendance",         sub: "Present / Absent / New" },
    { n: 5, title: "Visitors & follow-up", sub: "Children, absentees" },
    { n: 6, title: "Satisfaction",       sub: "1–5 rating" },
    { n: 7, title: "Review & submit",    sub: "Final check" }
  ];

  const setAtt = (name, val) => setAttendance({ ...attendance, [name]: val });

  return (
    <Shell navItems={nav} active="mycells" onNav={onNav} user={user} title="Cell Report"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>New cell report</h1>
            <div className="greeting">{c.name} · filed by <b style={{ color: "#152A24" }}>{user.name}</b> · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <Button variant="secondary" icon="arrow-left" onClick={() => onNav("mycells/" + c.id)}>Back to cell</Button>
        </div>

        <div className="report-form">
          <aside className="report-steps">
            {steps.map(s => (
              <div key={s.n} className={"report-step" + (step === s.n ? " active" : step > s.n ? " done" : "")}
                   onClick={() => setStep(s.n)}>
                <span className="num">{step > s.n ? <Icon name="check" size={11} /> : s.n}</span>
                <div>{s.title}<small>{s.sub}</small></div>
              </div>
            ))}
          </aside>

          <div>
            {step === 1 && (
              <div className="rf-card">
                <h2>Did the cell meet this week?</h2>
                <p className="sub">If not, just tell us why and submit — no more questions.</p>
                <div className="rf-yesno">
                  <label className={didMeet === "yes" ? "on" : ""}>
                    <input type="radio" name="didMeet" checked={didMeet === "yes"} onChange={() => setDidMeet("yes")} /> Yes — we met
                  </label>
                  <label className={didMeet === "no" ? "on" : ""}>
                    <input type="radio" name="didMeet" checked={didMeet === "no"} onChange={() => setDidMeet("no")} /> No — we skipped
                  </label>
                </div>
                {didMeet === "no" && (
                  <div className="form-grid one" style={{ marginTop: 18 }}>
                    <div className="field">
                      <label className="label">Reason</label>
                      <textarea className="input" rows={3} placeholder="Briefly explain why the cell didn't meet." />
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => onNav("mycells/" + c.id)}>Cancel</Button>
                  {didMeet === "no"
                    ? <Button icon="send" onClick={onSubmit}>Submit report</Button>
                    : <Button iconAfter="arrow-right" onClick={() => setStep(2)}>Next: Basics</Button>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rf-card">
                <h2>Meeting basics</h2>
                <p className="sub">When, where, and how long.</p>
                <div className="form-grid two">
                  <Input label="Date" type="date" defaultValue="2026-05-13" />
                  <Input label="Location" defaultValue="Tania F.'s home · Mt Lavinia" />
                  <Input label="Time started" type="time" defaultValue="19:00" />
                  <Input label="Time ended"   type="time" defaultValue="20:30" />
                  <div className="field">
                    <label className="label">Language</label>
                    <select className="input" defaultValue="EN">
                      <option value="EN">English</option>
                      <option value="SI">සිංහල</option>
                      <option value="TA">தமிழ்</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Were you present?</label>
                    <div className="rf-yesno">
                      <label className={present === "yes" ? "on" : ""}>
                        <input type="radio" name="present" checked={present === "yes"} onChange={() => setPresent("yes")} /> Yes
                      </label>
                      <label className={present === "no" ? "on" : ""}>
                        <input type="radio" name="present" checked={present === "no"} onChange={() => setPresent("no")} /> No
                      </label>
                    </div>
                  </div>
                  {present === "no" && (
                    <Input label="Who conducted the cell?" placeholder="Name of stand-in leader" />
                  )}
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(1)} icon="arrow-left">Back</Button>
                  <Button iconAfter="arrow-right" onClick={() => setStep(3)}>Next: Subject</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="rf-card">
                <h2>Subject discussed</h2>
                <p className="sub">What did your cell focus on this week?</p>
                <div className="rf-yesno">
                  <label className={subject === "sunday_sermon" ? "on" : ""}>
                    <input type="radio" checked={subject === "sunday_sermon"} onChange={() => setSubject("sunday_sermon")} /> Sunday sermon recap
                  </label>
                  <label className={subject === "other" ? "on" : ""}>
                    <input type="radio" checked={subject === "other"} onChange={() => setSubject("other")} /> Other topic
                  </label>
                </div>
                {subject === "other" && (
                  <div className="form-grid one" style={{ marginTop: 16 }}>
                    <Input label="Specify the topic" placeholder="e.g. Book of James · ch. 1–2" />
                  </div>
                )}
                <div className="form-grid one" style={{ marginTop: 18 }}>
                  <div className="field">
                    <label className="label">Cell type</label>
                    <div className="rf-yesno" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                      {["g12", "care", "children", "outreach"].map(t => (
                        <label key={t} className={cellType === t ? "on" : ""} style={{ justifyContent: "center", textTransform: "capitalize" }}>
                          <input type="radio" checked={cellType === t} onChange={() => setCellType(t)} /> {t === "g12" ? "G12" : t}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Input label="Your immediate G12 leader" defaultValue="Janaka Liyanage" />
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(2)} icon="arrow-left">Back</Button>
                  <Button iconAfter="arrow-right" onClick={() => setStep(4)}>Next: Attendance</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="rf-card">
                <h2>Attendance</h2>
                <p className="sub">Mark who was present. Add new attendees at the bottom.</p>
                <div className="att-list">
                  {Object.entries(attendance).map(([name, status]) => (
                    <div key={name} className="att-row">
                      <div className="name">
                        <Avatar src={KIT.avatar(name.length * 3 + 10)} size="sm" name={name} /> {name}
                      </div>
                      <div className="att-toggle">
                        <button className={"present" + (status === "present" ? " active" : "")} onClick={() => setAtt(name, "present")}>Present</button>
                        <button className={"absent"  + (status === "absent"  ? " active" : "")} onClick={() => setAtt(name, "absent")}>Absent</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <Typeahead
                    label="Add new attendee"
                    placeholder="Type a name…"
                    directory={TCCR_DIRECTORY.filter(d => !attendance[d.name])}
                    hint="Suggestions from TCCR directory. If not registered, add as unregistered."
                    onPick={(m) => setAttendance({ ...attendance, [m.name]: "present" })}
                    onAddUnregistered={(name) => setAttendance({ ...attendance, [name + " (unregistered)"]: "present" })}
                  />
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(3)} icon="arrow-left">Back</Button>
                  <Button iconAfter="arrow-right" onClick={() => setStep(5)}>Next: Follow-up</Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="rf-card">
                <h2>Visitors &amp; follow-up</h2>
                <p className="sub">Help us track growth and care for absentees.</p>
                <div className="form-grid two">
                  <Input label="Additional visitors" type="number" defaultValue="1" />
                  <Input label="Children present" type="number" defaultValue="3" />
                </div>
                <div className="form-grid one" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label className="label">Did you contact absentees?</label>
                    <div className="rf-yesno">
                      <label className="on"><input type="radio" defaultChecked /> Yes</label>
                      <label><input type="radio" /> Not yet</label>
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Notes</label>
                    <textarea className="input" rows={3} placeholder="Anything you want your G12 to know — pastoral concerns, prayer points, etc." />
                  </div>
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(4)} icon="arrow-left">Back</Button>
                  <Button iconAfter="arrow-right" onClick={() => setStep(6)}>Next: Satisfaction</Button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="rf-card">
                <h2>Satisfaction</h2>
                <p className="sub">How would you rate this cell meeting overall?</p>
                <div className="rf-stars" style={{ marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={n <= satisfaction ? "on" : ""} onClick={() => setSatisfaction(n)}>
                      <Icon name="star" size={32} strokeWidth={2.5} />
                    </button>
                  ))}
                </div>
                <div className="form-grid one" style={{ marginTop: 18 }}>
                  <div className="field">
                    <label className="label">Additional info <span style={{ color: "#A0ACA6", fontWeight: 400 }}>· optional</span></label>
                    <textarea className="input" rows={3} placeholder="Anything else you want to record?" />
                  </div>
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(5)} icon="arrow-left">Back</Button>
                  <Button iconAfter="arrow-right" onClick={() => setStep(7)}>Review</Button>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="rf-card">
                <h2>Review &amp; submit</h2>
                <p className="sub">Double-check before you file.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
                  {[
                    ["Cell",          c.name],
                    ["Filled by",     user.name],
                    ["Date",          "Wed, 13 May 2026"],
                    ["Location",      "Tania F.'s home · Mt Lavinia"],
                    ["Time",          "19:00 → 20:30"],
                    ["Cell type",     cellType === "g12" ? "G12" : cellType.charAt(0).toUpperCase() + cellType.slice(1)],
                    ["Subject",       subject === "sunday_sermon" ? "Sunday sermon recap" : "Other"],
                    ["Present",       Object.values(attendance).filter(v => v === "present").length + " of " + Object.keys(attendance).length],
                    ["Visitors",      "1"],
                    ["Children",      "3"],
                    ["Satisfaction",  "★".repeat(satisfaction) + "☆".repeat(5 - satisfaction)]
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", padding: "10px 14px", background: "#FAFAFA", borderRadius: 10 }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#41574A", textTransform: "uppercase", letterSpacing: 0.06 }}>{k}</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(6)} icon="arrow-left">Back</Button>
                  <Button icon="send" onClick={onSubmit}>Submit report</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Cell report viewer */
const TCellReportViewer = ({ user, onNav, role = "leader", cell, report }) => {
  const c = cell || SAMPLE_CELLS[0];
  const r = report || SAMPLE_REPORTS[0];
  const nav = role === "g12" ? G12_NAV
           : role === "leader" ? LEADER_NAV
           : role === "student" ? STUDENT_NAV_V2 : MEMBER_NAV;
  const accent = role === "g12" ? "G12 Leader" : role === "leader" ? "Leader" : role === "student" ? "Student" : "Member";

  return (
    <Shell navItems={nav} active={role === "leader" || role === "g12" ? "mycells" : "cells"} onNav={onNav}
           user={user} title="Cell Report" accent={accent}
           onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{r.subject || "Cell Report"}</h1>
            <div className="greeting">{c.name} · {r.date} · filed by {r.filler}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" icon="arrow-left" onClick={() => onNav("mycells/" + c.id)}>Back to cell</Button>
            {["leader", "g12", "admin", "super_admin"].some(x => (Array.isArray(user.roles) ? user.roles : [role]).includes(x)) &&
              <Button variant="destructive" icon="x-circle">Void report</Button>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="kpi-mini"><div className="row"><div className="lbl">Present</div></div><div className="num">{r.present}</div><div className="sub">of {r.present + r.absent} members</div></div>
          <div className="kpi-mini"><div className="row"><div className="lbl">Absent</div></div><div className="num">{r.absent}</div><div className="sub">followed up: 2</div></div>
          <div className="kpi-mini"><div className="row"><div className="lbl">Visitors</div></div><div className="num">{r.visitors}</div><div className="sub">{r.visitors === 0 ? "none" : "1 returning"}</div></div>
          <div className="kpi-mini"><div className="row"><div className="lbl">Satisfaction</div></div><div className="num" style={{ color: "#BCE955" }}>{"★".repeat(r.satisfaction)}</div><div className="sub">out of 5</div></div>
        </div>

        <div className="settings-card">
          <h2>Meeting details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 8 }}>
            {[
              ["Date",     r.date],
              ["Time",     "19:00 → 20:30"],
              ["Location", "Tania F.'s home · Mt Lavinia"],
              ["Cell type",c.type === "g12" ? "G12" : c.type.charAt(0).toUpperCase() + c.type.slice(1)],
              ["Subject",  r.subject],
              ["Language", "English"]
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", padding: "10px 14px", background: "#FAFAFA", borderRadius: 10 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#41574A", textTransform: "uppercase", letterSpacing: 0.06 }}>{k}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <h2>Attendance</h2>
          <table className="tbl">
            <thead><tr><th>Member</th><th>Status</th><th>Follow-up</th></tr></thead>
            <tbody>
              {[
                { name: "Anjali Silva", avatar: 47, status: "present", fu: "—" },
                { name: "Ravi Tilakaratne", avatar: 12, status: "present", fu: "—" },
                { name: "Priya Mendis", avatar: 32, status: "present", fu: "—" },
                { name: "Nadeesha Fernando", avatar: 38, status: "absent", fu: "Called — sick" },
                { name: "Saman Perera", avatar: 22, status: "present", fu: "—" }
              ].map((m, i) => (
                <tr key={i}>
                  <td><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Avatar src={KIT.avatar(m.avatar)} size="sm" name={m.name} /><span style={{ fontWeight: 600 }}>{m.name}</span></div></td>
                  <td>{m.status === "present" ? <Badge tone="success">Present</Badge> : <Badge tone="error">Absent</Badge>}</td>
                  <td className="muted">{m.fu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="settings-card">
          <h2>Notes from {r.filler}</h2>
          <p style={{ fontFamily: "var(--font-body)", color: "#41574A", lineHeight: 1.6, margin: 0 }}>
            Strong week — Nadeesha is recovering and asked for prayer cover. Saman brought his neighbour Kasun who's looking to connect. We'll line up a follow-up coffee.
          </p>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────── Create Cell form */
const TCreateCell = ({ user, onNav, onCreate }) => {
  const role = (Array.isArray(user.roles) && user.roles.includes("g12")) ? "g12" : "leader";
  const nav = role === "g12" ? G12_NAV : LEADER_NAV;
  const accent = role === "g12" ? "G12 Leader" : "Leader";
  const [name, setName] = useTCS("");
  const [members, setMembers] = useTCS([]);
  const [draft, setDraft] = useTCS("");
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const addMember = () => {
    const v = draft.trim();
    if (v) { setMembers([...members, v]); setDraft(""); }
  };
  const rmMember = (i) => setMembers(members.filter((_, j) => j !== i));
  return (
    <Shell navItems={nav} active="mycells" onNav={onNav} user={user} title="Create Cell"
           accent={accent} onLogout={() => onNav("logout")} notifications={MEMBER_NOTIFS}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Create a new cell</h1>
            <div className="greeting">You'll be set as the leader. Add an initial roster — you can edit it any time.</div>
          </div>
          <Button variant="secondary" icon="arrow-left" onClick={() => onNav("mycells")}>Back to cells</Button>
        </div>

        <div className="settings-card">
          <h2>Cell details</h2>
          <p className="settings-sub">Pick a name. Created date is set automatically.</p>
          <div className="form-grid two">
            <Input label="Cell name" placeholder="e.g. Mt Lavinia · Wednesday Care" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Created date" defaultValue={today} disabled />
          </div>
        </div>

        <div className="settings-card">
          <h2>Add members</h2>
          <p className="settings-sub"><b style={{ color: "#152A24" }}>{members.length} added</b> · type a name — suggestions appear from the TCCR directory.</p>
          <Typeahead
            label=""
            placeholder="Type a member's name…"
            directory={TCCR_DIRECTORY.filter(d => !members.includes(d.name))}
            onPick={(m) => setMembers([...members, m.name])}
            onAddUnregistered={(name) => setMembers([...members, name + " (unregistered)"])}
          />
          {members.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map((m, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: m.includes("(unregistered)") ? "#FEF9EC" : "rgba(188,233,85,0.18)", borderRadius: 9999, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: m.includes("(unregistered)") ? "#D97706" : "#152A24" }}>
                  {m}
                  <button onClick={() => rmMember(i)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#41574A", padding: 0, display: "inline-flex" }}>
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions" style={{ background: "#fff", padding: "18px 22px", borderRadius: 14, border: "1px solid #E5E5E5", justifyContent: "space-between" }}>
          <Button variant="ghost" onClick={() => onNav("mycells")}>Cancel</Button>
          <Button icon="check" onClick={() => onCreate && onCreate({ name, members })}>Create cell</Button>
        </div>
      </div>
    </Shell>
  );
};

Object.assign(window, { SAMPLE_CELLS, SAMPLE_REPORTS, OTHER_CELLS, TCellsList, TCellDetail, TCellReportForm, TCellReportViewer });
