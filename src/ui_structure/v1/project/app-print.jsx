/* Print-mode renderer: every screen, stacked, one per landscape page. */

const STUDENT     = { name: "Priya Mendis",     avatar: KIT.avatar(32) };
const ADMIN       = { name: "Tania Fernando",   avatar: KIT.avatar(48) };
const SUPERADMIN  = { name: "Roshan De Silva",  avatar: KIT.avatar(15) };

const noop = () => {};

function PrintPage({ label, children }) {
  return (
    <div className="print-page">
      <div className="print-page__inner edu-kit">{children}</div>
      <div className="print-label">{label}</div>
    </div>
  );
}

function PrintApp() {
  const screens = [
    { label: "01 · Public landing",
      el: <PublicHomePage onCTA={noop} onLogin={noop} onCourse={noop} onNavigate={noop} /> },
    { label: "02 · Sign in",
      el: <LoginScreen onSignIn={noop} onRegister={noop} onNavigate={noop} defaultMode="signin" /> },
    { label: "03 · Create account",
      el: <LoginScreen onSignIn={noop} onRegister={noop} onNavigate={noop} defaultMode="register" /> },
    { label: "04 · Student dashboard",
      el: <StudentDashboard user={STUDENT} onContinue={noop} onCourse={noop} onNav={noop} /> },
    { label: "05 · Student course viewer",
      el: <StudentCourseViewer user={STUDENT} onNav={noop} onComplete={noop} /> },
    { label: "06 · Student settings",
      el: <StudentSettings user={STUDENT} onNav={noop} /> },
    { label: "07 · Admin dashboard",
      el: <AdminDashboard user={ADMIN} onNav={noop} /> },
    { label: "08 · Admin · Registrations",
      el: <AdminRegistrations user={ADMIN} onNav={noop} /> },
    { label: "09 · Admin · Enrolments",
      el: <AdminEnrolments user={ADMIN} onNav={noop} /> },
    { label: "10 · Admin · Courses (list)",
      el: <AdminCourses user={ADMIN} onNav={noop} /> },
    { label: "11 · Admin · Course editor",
      el: <AdminCourses user={ADMIN} onNav={noop} defaultView="editor" defaultEditing={ADMIN_COURSES_SEED[0]} /> },
    { label: "12 · Admin · Audit log",
      el: <AdminAuditLog user={ADMIN} onNav={noop} /> },
    { label: "13 · Admin · Settings",
      el: <AdminSettings user={ADMIN} onNav={noop} /> },
    { label: "14 · Super admin dashboard",
      el: <SuperAdminDashboard user={SUPERADMIN} onNav={noop} /> },
    { label: "15 · Super admin · Admins",
      el: <SuperAdminAdmins user={SUPERADMIN} onNav={noop} /> },
    { label: "16 · Super admin · Audit log",
      el: <AdminAuditLog user={SUPERADMIN} onNav={noop} role="Super Admin" nav={SUPERADMIN_NAV} notifications={SUPER_NOTIFS} /> },
    { label: "17 · Super admin · Settings",
      el: <AdminSettings user={SUPERADMIN} onNav={noop} role="Super Admin" nav={SUPERADMIN_NAV} notifications={SUPER_NOTIFS} /> }
  ];
  return (
    <div className="print-deck">
      {screens.map((s, i) => <PrintPage key={i} label={s.label}>{s.el}</PrintPage>)}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PrintApp />);
