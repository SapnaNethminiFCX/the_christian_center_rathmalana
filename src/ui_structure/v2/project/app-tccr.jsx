/* TCCR v2 — App shell. Hash-routed. Includes a role-switcher pill so
   anyone reviewing the prototype can jump between Member / Student /
   Leader / G12 / Admin / Super Admin surfaces. */

const { useState: useTAS, useEffect: useTAE } = React;

/* User profiles — each has the roles[] this surface assumes */
const USERS = {
  member:      { name: "Sapna Methmini",   email: "sapna@example.com",   avatar: KIT.avatar(32), roles: ["member"] },
  /* member who also happens to be a Leader/G12 — used by the "Continue as Leader" banner */
  member_plus: { name: "Tania Fernando",   email: "tania@example.com",   avatar: KIT.avatar(48), roles: ["member","leader","g12"] },
  student:     { name: "Priya Mendis",     email: "priya@example.com",   avatar: KIT.avatar(32), roles: ["member","student"] },
  leader:      { name: "Tania Fernando",   email: "tania@example.com",   avatar: KIT.avatar(48), roles: ["member","student","leader"] },
  g12:         { name: "Tania Fernando",   email: "tania@example.com",   avatar: KIT.avatar(48), roles: ["member","student","leader","g12"] },
  admin:       { name: "Janaka Liyanage",  email: "janaka@edupath.org",  avatar: KIT.avatar(7),  roles: ["member","admin"] },
  super_admin: { name: "Roshan De Silva",  email: "roshan@edupath.org",  avatar: KIT.avatar(15), roles: ["member","admin","super_admin"] }
};

function ThemeSwitcher() {
  const [mode, setMode] = useTAS(() => (typeof localStorage !== "undefined" && localStorage.getItem("tccr-mode")) || "light");
  useTAE(() => {
    document.body.classList.remove("theme-mono");
    document.body.classList.toggle("theme-dark", mode === "dark");
    try { localStorage.setItem("tccr-mode", mode); } catch (e) {}
  }, [mode]);
  return (
    <div className="theme-switcher">
      <button className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}>☀ Light</button>
      <button className={mode === "dark"  ? "active" : ""} onClick={() => setMode("dark")}>☾ Dark</button>
    </div>
  );
}

function TViewSwitcher({ where, go }) {
  const tabs = [
    { id: "public",  label: "Public",         to: "" },
    { id: "login",   label: "Login",          to: "login" },
    { id: "member",  label: "Member",         to: "member" },
    { id: "student", label: "Member+Student", to: "student" },
    { id: "leader",  label: "Leader",         to: "leader" },
    { id: "g12",     label: "G12",            to: "g12" },
    { id: "admin",   label: "Admin",          to: "admin" },
    { id: "sa",      label: "Super Admin",    to: "super" }
  ];
  return (
    <div className="view-switcher">
      {tabs.map(t => (
        <button key={t.id} className={where === t.id ? "active" : ""} onClick={() => go(t.to)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TApp() {
  const [hash, setHash] = useTAS(window.location.hash.replace(/^#\/?/, "") || "");
  const [toast, setToast] = useTAS(null);

  useTAE(() => {
    const onHash = () => setHash(window.location.hash.replace(/^#\/?/, "") || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (to) => { window.location.hash = "#/" + to; window.scrollTo(0, 0); };
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  // Where are we?
  let where = "public";
  if (hash === "login")            where = "login";
  else if (hash.startsWith("member"))  where = "member";
  else if (hash.startsWith("student")) where = "student";
  else if (hash.startsWith("leader"))  where = "leader";
  else if (hash.startsWith("g12"))     where = "g12";
  else if (hash.startsWith("super"))   where = "sa";
  else if (hash.startsWith("admin"))   where = "admin";

  // Sub-route helpers
  const tail = (prefix) => hash.replace(new RegExp("^" + prefix + "\\/?"), "");

  /* sidebar nav handlers — each surface */
  const memberNav = (id) => {
    if (id === "logout")   { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "home")     return go("member");
    if (id === "school")   return go("member/school");
    if (id === "cells")    return go("member/cells");
    if (id === "profile")  return go("member/profile");
    if (id === "notifs")   return go("member/notifications");
    return go("member/" + id);
  };
  const studentNav = (id) => {
    if (id === "logout")    { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "home")      return go("member");
    if (id === "dashboard") return go("student");
    if (id === "mycourses") return go("student/mycourses");
    if (id === "school")    return go("student/school");
    if (id === "requests")  return go("student/requests");
    if (id === "notifs")    return go("student/notifications");
    if (id === "profile")   return go("student/profile");
    return go("student/" + id);
  };
  const leaderNav = (id) => {
    if (id === "logout")     { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "home")       return go("member");
    if (id === "leaderdash") return go("leader");
    if (id === "mycells")    return go("leader/cells");
    if (id === "school")     return go("leader/school");
    if (id === "notifs")     return go("leader/notifications");
    if (id === "profile")    return go("leader/profile");
    return go("leader/" + id);
  };
  const g12Nav = (id) => {
    if (id === "logout")     { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "home")       return go("member");
    if (id === "leaderdash") return go("g12");
    if (id === "mycells")    return go("g12/cells");
    if (id === "network")    return go("g12/network");
    if (id === "promote")    return go("g12/promote");
    if (id === "school")     return go("g12/school");
    if (id === "notifs")     return go("g12/notifications");
    if (id === "profile")    return go("g12/profile");
    return go("g12/" + id);
  };
  const adminNav = (id) => {
    if (id === "logout")     { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "dashboard")  return go("admin");
    return go("admin/" + id);
  };
  const superNav = (id) => {
    if (id === "logout")     { flash({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "dashboard")  return go("super");
    return go("super/" + id);
  };

  // Render switch
  let view;

  if (where === "public") {
    view = <TPublicHomePage
            onCTA={() => go("login")}
            onLogin={() => go("login")}
            onNavigate={(id) => { if (id === "home") go(""); else if (id === "school" || id === "cells") go("login"); }} />;
  }
  else if (where === "login") {
    view = <TLoginScreen
            onSignIn={() => { flash({ tone: "success", title: "Welcome back, Priya", message: "Loading your home…" }); setTimeout(() => go("member"), 800); }}
            onRegister={() => go("member")}
            onNavigate={(id) => go(id === "home" ? "" : id)} />;
  }

  /* MEMBER */
  else if (where === "member") {
    const sub = tail("member");
    const U = USERS.member;
    /* Bible School from a member sidebar → request flow + waiting-for-approval. */
    if (sub === "school")             view = <TRequestStudentAccess user={U} onNav={memberNav}
                                              onSubmit={(p) => { flash({ tone: "success", title: "Request submitted", message: "Now waiting for admin approval." }); setTimeout(() => go("member/school/pending?c=" + encodeURIComponent(p.course) + "&b=" + encodeURIComponent(p.batch)), 700); }} />;
    else if (sub.startsWith("school/pending")) {
      const params = new URLSearchParams(sub.split("?")[1] || "");
      view = <TWaitingForApproval user={U} onNav={memberNav} course={params.get("c")} batch={params.get("b")} />;
    }
    else if (sub === "cells")         view = <TCellsList user={USERS.member_plus} role="member"
                                              onNav={(id) => id === "switch:leader" ? go("leader") : id === "switch:g12" ? go("g12") : memberNav(id)}
                                              onCell={(c) => go("member/cells/" + c.id)} />;
    else if (sub.startsWith("cells/")) {
      const id = sub.replace("cells/", "");
      const cell = SAMPLE_CELLS.find(c => c.id === id) || SAMPLE_CELLS[0];
      view = <TCellDetail user={U} role="member" cell={cell} onNav={memberNav}
                          onReport={(r) => go("member/cells/" + cell.id + "/r/" + r.id)} />;
    }
    else if (sub === "profile")       view = <TProfile user={U} role="member" onNav={memberNav} />;
    else if (sub === "notifications") view = <TStudentNotifications user={U} onNav={memberNav} nav={MEMBER_NAV} accent="Member" />;
    else                              view = <TMemberHome user={U} role="member" onNav={memberNav} />;
  }

  /* STUDENT (member + student). Sidebar matches v1 EduPath layout. */
  else if (where === "student") {
    const sub = tail("student");
    const U = USERS.student;
    if (sub === "school")             view = <TStudentBrowseCourses user={U} onNav={studentNav} onCourse={(c) => go("student/school/" + c.id)} />;
    else if (sub.startsWith("school/")) {
      const cid = sub.replace("school/", "");
      const course = TCCR_COURSES.find(c => c.id === cid) || TCCR_COURSES[1];
      view = <TStudentCourseDetail user={U} course={course} onNav={studentNav}
                                    onRequest={() => { flash({ tone: "success", title: "Enrollment requested", message: "Waiting for admin approval." }); setTimeout(() => go("student/requests"), 700); }} />;
    }
    else if (sub === "mycourses")     view = <TStudentMyCourses user={U} onNav={studentNav} onCourse={(c) => go("student/course")} />;
    else if (sub === "course")        view = <TStudentCourseView user={U} onNav={studentNav} />;
    else if (sub === "requests")      view = <TMyRequests user={U} role="student" onNav={studentNav} />;
    else if (sub === "notifications") view = <TStudentNotifications user={U} onNav={studentNav} />;
    else if (sub === "profile")       view = <TProfile user={U} role="student" accent="Student" nav={STUDENT_NAV_V2} onNav={studentNav} />;
    else                              view = <TStudentDashboard user={U} onNav={studentNav}
                                                onContinue={() => go("student/course")}
                                                onCourse={(c) => go("student/course")} />;
  }

  /* LEADER */
  else if (where === "leader") {
    const sub = tail("leader");
    const U = USERS.leader;
    if (sub === "cells")              view = <TCellsList user={U} role="leader" onNav={(id) => id.startsWith("switch:") ? go(id.replace("switch:", "")) : leaderNav(id)} onCell={(c) => c.id === "new" ? go("leader/cells/new") : go("leader/cells/" + c.id)} />;
    else if (sub === "cells/new")     view = <TCreateCell user={U} onNav={leaderNav} onCreate={() => { flash({ tone: "success", title: "Cell created" }); setTimeout(() => go("leader/cells"), 700); }} />;
    else if (sub.startsWith("cells/")) {
      const part = sub.replace("cells/", "");
      if (part === "new") {
        view = <StudentStubPage user={U} onNav={leaderNav} active="mycells" title="New Cell"
                eyebrow="Create cell group" ico="users"
                blurb="Cell creation form" body="Pick a name, type (G12/Care/Children/Outreach), area and your G12 leader." />;
      } else if (part.includes("/r/")) {
        const [cellId, , reportId] = part.split("/");
        const cell = SAMPLE_CELLS.find(c => c.id === cellId) || SAMPLE_CELLS[0];
        const report = SAMPLE_REPORTS.find(r => r.id === reportId) || SAMPLE_REPORTS[0];
        view = <TCellReportViewer user={U} role="leader" cell={cell} report={report} onNav={leaderNav} />;
      } else if (part.includes("/report")) {
        const cellId = part.replace("/report", "");
        const cell = SAMPLE_CELLS.find(c => c.id === cellId) || SAMPLE_CELLS[0];
        view = <TCellReportForm user={U} cell={cell} onNav={leaderNav}
                onSubmit={() => { flash({ tone: "success", title: "Report filed", message: "Your G12 leader has been notified." }); setTimeout(() => go("leader/cells/" + cell.id), 700); }} />;
      } else {
        const cell = SAMPLE_CELLS.find(c => c.id === part) || SAMPLE_CELLS[0];
        view = <TCellDetail user={U} role="leader" cell={cell} onNav={leaderNav}
                onReportNew={(c) => go("leader/cells/" + c.id + "/report")}
                onReport={(r) => go("leader/cells/" + cell.id + "/r/" + r.id)} />;
      }
    }
    else if (sub === "analytics")     view = <TLeaderDashboard user={U} role="leader" onNav={leaderNav} />;
    else if (sub === "school") {
      if (Array.isArray(U.roles) && U.roles.includes("student")) { go("student/school"); return null; }
      view = <TRequestStudentAccess user={U} onNav={leaderNav}
              onSubmit={() => { flash({ tone: "success", title: "Request submitted" }); setTimeout(() => go("leader"), 700); }} />;
    }
    else if (sub === "notifications") view = <TStudentNotifications user={U} onNav={leaderNav} nav={LEADER_NAV} accent="Leader" />;
    else if (sub === "profile")       view = <TProfile user={U} role="leader" accent="Leader" nav={LEADER_NAV} onNav={leaderNav} />;
    else                              view = <TLeaderDashboard user={U} role="leader" onNav={leaderNav} />;
  }

  /* G12 */
  else if (where === "g12") {
    const sub = tail("g12");
    const U = USERS.g12;
    if (sub === "cells")              view = <TCellsList user={U} role="g12" onNav={(id) => id.startsWith("switch:") ? go(id.replace("switch:", "")) : g12Nav(id)} onCell={(c) => c.id === "new" ? go("g12/cells/new") : go("g12/cells/" + c.id)} />;
    else if (sub === "cells/new")     view = <TCreateCell user={U} onNav={g12Nav} onCreate={() => { flash({ tone: "success", title: "Cell created" }); setTimeout(() => go("g12/cells"), 700); }} />;
    else if (sub.startsWith("cells/")) {
      const part = sub.replace("cells/", "");
      if (part.includes("/r/")) {
        const [cellId, , reportId] = part.split("/");
        const cell = SAMPLE_CELLS.find(c => c.id === cellId) || SAMPLE_CELLS[0];
        const report = SAMPLE_REPORTS.find(r => r.id === reportId) || SAMPLE_REPORTS[0];
        view = <TCellReportViewer user={U} role="g12" cell={cell} report={report} onNav={g12Nav} />;
      } else if (part.includes("/report")) {
        const cellId = part.replace("/report", "");
        const cell = SAMPLE_CELLS.find(c => c.id === cellId) || SAMPLE_CELLS[0];
        view = <TCellReportForm user={U} cell={cell} onNav={g12Nav}
                onSubmit={() => { flash({ tone: "success", title: "Report filed" }); setTimeout(() => go("g12/cells/" + cell.id), 700); }} />;
      } else {
        const cell = SAMPLE_CELLS.find(c => c.id === part) || SAMPLE_CELLS[0];
        view = <TCellDetail user={U} role="g12" cell={cell} onNav={g12Nav}
                onReportNew={(c) => go("g12/cells/" + c.id + "/report")}
                onReport={(r) => go("g12/cells/" + cell.id + "/r/" + r.id)} />;
      }
    }
    else if (sub === "network")       view = <TG12Network user={U} onNav={g12Nav} />;
    else if (sub === "analytics")     view = <TLeaderDashboard user={U} role="g12" onNav={g12Nav} />;
    else if (sub === "promote")       view = <TG12Promote user={U} onNav={g12Nav} />;
    else if (sub === "school") {
      if (Array.isArray(U.roles) && U.roles.includes("student")) { go("student/school"); return null; }
      view = <TRequestStudentAccess user={U} onNav={g12Nav}
              onSubmit={() => { flash({ tone: "success", title: "Request submitted" }); setTimeout(() => go("g12"), 700); }} />;
    }
    else if (sub === "notifications") view = <TStudentNotifications user={U} onNav={g12Nav} nav={G12_NAV} accent="G12 Leader" />;
    else if (sub === "profile")       view = <TProfile user={U} role="g12" accent="G12 Leader" nav={G12_NAV} onNav={g12Nav} />;
    else                              view = <TLeaderDashboard user={U} role="g12" onNav={g12Nav} />;
  }

  /* ADMIN */
  else if (where === "admin") {
    const sub = tail("admin");
    const U = USERS.admin;
    if (sub === "rolereqs")           view = <TRoleRequestsQueue user={U} role="admin" onNav={adminNav} />;
    else if (sub === "enrolments")    view = <AdminEnrolments user={U} onNav={adminNav} nav={TCCR_ADMIN_NAV} notifications={MEMBER_NOTIFS} />;
    else if (sub === "courses/new")   view = <TNewCourse user={U} onNav={adminNav} role="admin" />;
    else if (sub === "courses")       view = <AdminCourses user={U} onNav={(id) => id === "new" ? go("admin/courses/new") : adminNav(id)} nav={TCCR_ADMIN_NAV} notifications={MEMBER_NOTIFS} />;
    else if (sub === "batches")       view = <TBatchesAdmin user={U} role="admin" onNav={adminNav} />;
    else if (sub === "semesters")     view = <TSemesterDatesEditor user={U} role="admin" onNav={adminNav} />;
    else if (sub === "cellsadmin")    view = <TCellsList user={U} role="admin" onNav={adminNav} onCell={(c) => go("admin/cellsadmin/" + c.id)} />;
    else if (sub.startsWith("cellsadmin/")) {
      const id = sub.replace("cellsadmin/", "");
      const cell = SAMPLE_CELLS.find(c => c.id === id) || SAMPLE_CELLS[0];
      view = <TCellDetail user={U} role="admin" cell={cell} onNav={adminNav} onReport={(r) => go("admin/cellsadmin/" + cell.id + "/r/" + r.id)} />;
    }
    else if (sub === "analytics")     view = <TLeaderDashboard user={U} role="g12" onNav={adminNav} />;
    else if (sub === "users")         view = <TUsersAdmin user={U} role="admin" onNav={adminNav} />;
    else if (sub === "settings")      view = <AdminSettings user={U} role="Administrator" nav={TCCR_ADMIN_NAV} notifications={MEMBER_NOTIFS} onNav={adminNav} />;
    else if (sub === "audit")         view = <AdminAuditLog user={U} role="Administrator" nav={TCCR_ADMIN_NAV} notifications={MEMBER_NOTIFS} onNav={adminNav} />;
    else                              view = <TAdminDashboard user={U} role="admin" onNav={adminNav} />;
  }

  /* SUPER ADMIN */
  else if (where === "sa") {
    const sub = tail("super");
    const U = USERS.super_admin;
    if (sub === "admins")             view = <SuperAdminAdmins user={U} onNav={superNav} nav={TCCR_SADMIN_NAV} notifications={MEMBER_NOTIFS} accent="Super Admin" />;
    else if (sub === "rolereqs")      view = <TRoleRequestsQueue user={U} role="super_admin" onNav={superNav} />;
    else if (sub === "enrolments")    view = <AdminEnrolments user={U} onNav={superNav} nav={TCCR_SADMIN_NAV} notifications={MEMBER_NOTIFS} accent="Super Admin" />;
    else if (sub === "courses/new")   view = <TNewCourse user={U} onNav={superNav} role="super_admin" />;
    else if (sub === "courses")       view = <AdminCourses user={U} onNav={(id) => id === "new" ? go("super/courses/new") : superNav(id)} nav={TCCR_SADMIN_NAV} notifications={MEMBER_NOTIFS} accent="Super Admin" />;
    else if (sub === "batches")       view = <TBatchesAdmin user={U} role="super_admin" onNav={superNav} />;
    else if (sub === "semesters")     view = <TSemesterDatesEditor user={U} role="super_admin" onNav={superNav} />;
    else if (sub === "cellsadmin")    view = <TCellsList user={U} role="admin" onNav={superNav} onCell={(c) => go("super/cellsadmin/" + c.id)} />;
    else if (sub === "analytics")     view = <TLeaderDashboard user={U} role="g12" onNav={superNav} />;
    else if (sub === "users")         view = <TUsersAdmin user={U} role="super_admin" onNav={superNav} />;
    else if (sub === "settings")      view = <AdminSettings user={U} role="Super Admin" nav={TCCR_SADMIN_NAV} notifications={MEMBER_NOTIFS} onNav={superNav} />;
    else if (sub === "audit")         view = <AdminAuditLog user={U} role="Super Admin" nav={TCCR_SADMIN_NAV} notifications={MEMBER_NOTIFS} onNav={superNav} />;
    else                              view = <TAdminDashboard user={U} role="super_admin" onNav={superNav} />;
  }

  return (
    <div className="edu-kit">
      {view}
      <TViewSwitcher where={where} go={go} />
      <ThemeSwitcher />
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TApp />);
