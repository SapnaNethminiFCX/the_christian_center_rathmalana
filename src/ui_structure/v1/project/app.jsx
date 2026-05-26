/* EduPath UI kit — App shell. Hash-routed click-through across the
   public, student and admin surfaces. Every sidebar item lands on a
   real page (dashboards, course viewer + registrations, plus stub
   pages for the rest). */

const { useState: useS, useEffect: useE } = React;

const STUDENT     = { name: "Priya Mendis",     avatar: KIT.avatar(32) };
const ADMIN       = { name: "Tania Fernando",   avatar: KIT.avatar(48) };
const SUPERADMIN  = { name: "Roshan De Silva",  avatar: KIT.avatar(15) };

/* Stub copy for sidebar items that aren't fully built out — keeps
   navigation believable without faking deep functionality. */
const STUDENT_STUBS = {
  profile:  { active: "profile",  title: "Profile",       eyebrow: "Your public learner profile",        ico: "user",      blurb: "Profile editor not built in this kit.",      body: "Avatar, display name, bio and learning goals will live on this page in the production build." },
  help:     { active: "help",     title: "Help & Support",eyebrow: "Get answers from the team",          ico: "life-buoy", blurb: "Help centre coming soon.",                   body: "Searchable docs, contact form and live chat hand-off will live on this page." }
};
const ADMIN_STUBS = {};
const SUPER_STUBS = {
  registrations:{ active: "registrations",title: "Registrations",       eyebrow: "Sign-up approvals (super-admin view)",        ico: "user-plus",      blurb: "Same queue as the admin surface.",              body: "Super admins see and act on the same registration queue as admins, plus can re-assign reviewers." },
  enrolments:   { active: "enrolments",   title: "Enrolments",          eyebrow: "Course-access approvals (super-admin view)", ico: "clipboard-list", blurb: "Same queue as the admin surface.",              body: "Super admins see and act on the same enrolment queue as admins." }
};

function ViewSwitcher({ where, go }) {
  const tabs = [
    { id: "public",  label: "Public",  to: "" },
    { id: "login",   label: "Login",   to: "login" },
    { id: "student", label: "Student", to: "student" },
    { id: "admin",   label: "Admin",   to: "admin" },
    { id: "super",   label: "Super Admin", to: "super" }
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

function App() {
  const [hash, setHash] = useS(window.location.hash.replace(/^#\/?/, "") || "");
  const [toast, setToast] = useS(null);

  useE(() => {
    const onHash = () => setHash(window.location.hash.replace(/^#\/?/, "") || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (to) => {
    window.location.hash = "#/" + to;
    window.scrollTo(0, 0);
  };
  const flashToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  // Cluster the route into a "where" for the switcher pill.
  let where = "public";
  if (hash === "login") where = "login";
  else if (hash.startsWith("student")) where = "student";
  else if (hash.startsWith("super"))   where = "super";
  else if (hash.startsWith("admin"))   where = "admin";

  /* shared sidebar handler factories */
  const studentNav = (id) => {
    if (id === "logout")    { flashToast({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "dashboard") return go("student");
    if (id === "courses")   return go("student/course");
    return go("student/" + id);
  };
  const adminNav = (id) => {
    if (id === "logout")        { flashToast({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "dashboard")     return go("admin");
    if (id === "registrations") return go("admin/registrations");
    if (id === "enrolments")    return go("admin/enrolments");
    return go("admin/" + id);
  };
  const superNav = (id) => {
    if (id === "logout")    { flashToast({ tone: "success", title: "Signed out" }); setTimeout(() => go(""), 600); return; }
    if (id === "dashboard") return go("super");
    return go("super/" + id);
  };

  // Render
  let view;
  if (where === "public") {
    view = <PublicHomePage
            onCTA={() => go("login")}
            onLogin={() => go("login")}
            onCourse={() => { flashToast({ tone: "success", title: "Sign in to enrol", message: "You'll be taken to the sign-in screen." }); setTimeout(() => go("login"), 600); }}
            onNavigate={(id) => { if (id === "courses") go("courses"); else go(id); }} />;
  } else if (where === "login") {
    view = <LoginScreen
            onSignIn={() => { flashToast({ tone: "success", title: "Welcome back, Priya", message: "Loading your dashboard…" }); setTimeout(() => go("student"), 800); }}
            onRegister={() => go("student")}
            onNavigate={(id) => go(id === "home" ? "" : id)} />;
  } else if (where === "student") {
    const sub = hash.replace(/^student\/?/, "");
    if (sub === "course") {
      view = <StudentCourseViewer
              user={STUDENT}
              onNav={studentNav}
              onComplete={() => flashToast({ tone: "success", title: "Lesson marked complete", message: "Your progress was saved." })} />;
    } else if (sub === "settings") {
      view = <StudentSettings user={STUDENT} onNav={studentNav} />;
    } else if (STUDENT_STUBS[sub]) {
      view = <StudentStubPage user={STUDENT} onNav={studentNav} {...STUDENT_STUBS[sub]} />;
    } else {
      view = <StudentDashboard
              user={STUDENT}
              onContinue={() => go("student/course")}
              onCourse={() => go("student/course")}
              onNav={studentNav} />;
    }
  } else if (where === "admin") {
    const sub = hash.replace(/^admin\/?/, "");
    if (sub === "registrations") {
      view = <AdminRegistrations user={ADMIN} onNav={adminNav} />;
    } else if (sub === "enrolments") {
      view = <AdminEnrolments user={ADMIN} onNav={adminNav} />;
    } else if (sub === "courses") {
      view = <AdminCourses user={ADMIN} onNav={adminNav} />;
    } else if (sub === "settings") {
      view = <AdminSettings user={ADMIN} onNav={adminNav} />;
    } else if (sub === "audit") {
      view = <AdminAuditLog user={ADMIN} onNav={adminNav} />;
    } else if (ADMIN_STUBS[sub]) {
      view = <AdminStubPage user={ADMIN} onNav={adminNav} {...ADMIN_STUBS[sub]} />;
    } else {
      view = <AdminDashboard user={ADMIN} onNav={adminNav} />;
    }
  } else if (where === "super") {
    const sub = hash.replace(/^super\/?/, "");
    if (sub === "admins") {
      view = <SuperAdminAdmins user={SUPERADMIN} onNav={superNav} />;
    } else if (sub === "registrations") {
      view = <AdminRegistrations user={SUPERADMIN} onNav={superNav} />;
    } else if (sub === "enrolments") {
      view = <AdminEnrolments user={SUPERADMIN} onNav={superNav} />;
    } else if (sub === "courses") {
      view = <AdminCourses user={SUPERADMIN} onNav={superNav} />;
    } else if (sub === "settings") {
      view = <AdminSettings user={SUPERADMIN} onNav={superNav} role="Super Admin" nav={SUPERADMIN_NAV} notifications={SUPER_NOTIFS} />;
    } else if (sub === "audit") {
      view = <AdminAuditLog user={SUPERADMIN} onNav={superNav} role="Super Admin" nav={SUPERADMIN_NAV} notifications={SUPER_NOTIFS} />;
    } else if (SUPER_STUBS[sub]) {
      view = <SuperAdminStubPage user={SUPERADMIN} onNav={superNav} {...SUPER_STUBS[sub]} />;
    } else {
      view = <SuperAdminDashboard user={SUPERADMIN} onNav={superNav} />;
    }
  }

  return (
    <div className="edu-kit">
      {view}
      <ViewSwitcher where={where} go={go} />
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
