/* TCCR v2 — Public landing + Sign-in/Sign-up (federated Google+Apple). */

const { useState: useTPS } = React;

const TPublicHomePage = ({ onCTA, onLogin, onNavigate }) => {
  const modules = [
    { ico: "book-open",  title: "Bible School",  body: "Structured programmes with semester-by-semester learning. Multi-batch intakes, browser-based labs and lecture recordings on every lesson." },
    { ico: "users",      title: "Cell Groups",   body: "Stay connected to your G12 leader, attend weekly cells, and let your leader file reports in seconds — on web or mobile." }
  ];
  const steps = [
    { n: "01", title: "Create your account", body: "Sign up in under a minute — you'll join as a Member straight away." },
    { n: "02", title: "Pick a course or join a cell", body: "Apply to enrol in a course batch, or wait to be added to your cell.", active: true },
    { n: "03", title: "Learn & connect", body: "Watch lessons, complete labs, attend cells, and grow with your community." }
  ];
  const features = [
    { ico: "layers",       title: "Course → Batch → Semester", body: "Pick the intake that fits your schedule. Past intakes auto-close so you always join the right cohort." },
    { ico: "calendar-clock", title: "Time-bound semesters",     body: "Each semester has a clear start and end date. Once a semester closes, content locks for that cohort." },
    { ico: "shield-check", title: "Approved access",            body: "Admins verify each request — for Student role, course enrolment, or leader promotion — within 24 hours." },
    { ico: "clipboard-list", title: "Weekly cell reports",      body: "Leaders and G12 leaders file a single, structured weekly report — attendance, subject, follow-ups in one form." },
    { ico: "bar-chart-3",  title: "Live analytics",             body: "Leader, G12 and admin dashboards refresh weekly with attendance, growth and participation insights." },
    { ico: "languages",    title: "සිංහල · தமிழ் · English",   body: "Switch language any time. Notifications and emails arrive in your preferred language." }
  ];
  const faqs = [
    { q: "Do I need to be a student to join a cell?", a: "No — every registered user is a Member by default and can be added to a cell group. Student role is only required to enrol in Bible School courses." },
    { q: "How does a course intake work?",            a: "Each course runs as multiple Batches. You apply to a specific Batch that fits your schedule. Past Batches auto-close, so you'll only see future or open intakes when applying." },
    { q: "Who can file a cell report?",               a: "Only the cell's Leader or G12 Leader. Members can view past reports of their own cell, but they cannot edit or file new ones." },
    { q: "How do I become a Leader or G12?",          a: "Existing G12 Leaders can promote a Member or Leader from their network. Admins and Super Admins can also assign these roles directly." }
  ];

  return (
    <div className="public">
      <TopNav active="home" onNav={onNavigate} ctaLabel="Sign Up" onCta={onCTA} />

      {/* HERO */}
      <section className="section section--dark hero">
        <div className="container hero-grid">
          <div>
            <Eyebrow dark>★ The Christian Center Rathmalana</Eyebrow>
            <h1>One community.<br/><span className="accent">Two ways</span> to grow.</h1>
            <p>TCCR brings Bible School learning and Cell Group fellowship into a single platform. Enrol in structured course batches, gather weekly with your cell, and let leaders track every meeting in seconds.</p>
            <div className="hero-cta">
              <Button size="lg" iconAfter="arrow-right" onClick={onCTA}>Create Account</Button>
              <Button size="lg" variant="secondary-light" icon="log-in" onClick={onLogin}>Sign In</Button>
            </div>
            <div className="hero-proof">
              <div className="stack">
                {[5, 14, 32, 47].map(n => <Avatar key={n} src={KIT.avatar(n)} size="sm" name="" />)}
              </div>
              <span><b style={{ color: "#fff" }}>3,200+ members</b> across cells &amp; courses</span>
            </div>
          </div>
          <div className="hero-img">
            <img src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80" alt="" />
            <div className="hero-badge">
              <div>
                <div className="num">4.9</div>
                <div className="stars">★ ★ ★ ★ ★</div>
              </div>
              <div className="lab">Avg. cell-meeting<br/>satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS strip */}
      <section className="section section--white" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="container">
          <div className="stats">
            <div className="stat"><div className="num">3,200<span className="accent">+</span></div><div className="lab">Members</div><div className="sub">Across cells & courses</div></div>
            <div className="stat"><div className="num">142<span className="accent"></span></div><div className="lab">Cell Groups</div><div className="sub">Meeting weekly</div></div>
            <div className="stat"><div className="num">21<span className="accent"></span></div><div className="lab">Bible School Courses</div><div className="sub">Live in catalog</div></div>
            <div className="stat"><div className="num">94<span className="accent">%</span></div><div className="lab">Avg. attendance</div><div className="sub">Last 8 weeks</div></div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="section section--light" id="modules">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>The Platform</Eyebrow>
            <h2 className="section-title section-title--center">Two modules,<br/><span className="accent">one</span> account.</h2>
            <p className="section-sub" style={{ margin: "16px auto 0", textAlign: "center" }}>Bible School and Cell Groups share a single sign-in. Switch between them in one click — and language any time.</p>
          </div>
          <div className="module-tiles" style={{ marginTop: 48 }}>
            {modules.map(m => (
              <div key={m.title} className={"mod-tile " + (m.title === "Bible School" ? "bs" : "cg")} onClick={onCTA}>
                <div>
                  <div className="label">Module</div>
                  <h2>{m.title}</h2>
                  <p>{m.body}</p>
                </div>
                <div className="row pill-row">
                  <a href="#" onClick={(e) => { e.preventDefault(); onCTA(); }}>Get started <Icon name="arrow-right" size={14} /></a>
                </div>
                <div className="glyph"><Icon name={m.ico} size={200} strokeWidth={1} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section section--deep">
        <div className="container">
          <Eyebrow dark>Our Process</Eyebrow>
          <h2 className="section-title">How <span className="accent">TCCR</span> works.</h2>
          <p className="section-sub">Three quick steps from sign-up to your first lesson — or your first cell meeting.</p>
          <div className="process-grid">
            <div className="steps">
              {steps.map(s => (
                <div key={s.n} className={"step" + (s.active ? " active" : "")}>
                  <div className="num">{s.n}</div>
                  <div>
                    <h4>{s.title}</h4>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="process-img">
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="section section--white" id="why">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>What's in v2</Eyebrow>
            <h2 className="section-title section-title--center">Everything you need to <span className="accent">learn</span><br/>and <span className="accent">connect</span> — in one place.</h2>
          </div>
          <div className="feature-grid">
            {features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="ico"><Icon name={f.ico} size={26} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section--light" id="faq">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>Common Questions</Eyebrow>
            <h2 className="section-title section-title--center">Frequently asked <span className="accent">questions</span>.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <details key={i} className="faq" open={i === 0}>
                <summary>
                  <span className="ico"><Icon name={i === 0 ? "minus" : "plus"} size={18} /></span>
                  {f.q}
                </summary>
                <div className="body">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section section--dark final-cta">
        <div className="ring"></div>
        <Avatar src={KIT.avatar(7)}  size="md" style={{ position: "absolute", top: "20%", left: "12%", border: "3px solid #BCE955", transform: "rotate(-6deg)" }} />
        <Avatar src={KIT.avatar(15)} size="lg" style={{ position: "absolute", top: "30%", right: "14%", border: "3px solid #BCE955", transform: "rotate(8deg)" }} />
        <Avatar src={KIT.avatar(22)} size="sm" style={{ position: "absolute", bottom: "22%", left: "20%", border: "3px solid #BCE955", transform: "rotate(4deg)" }} />
        <Avatar src={KIT.avatar(38)} size="md" style={{ position: "absolute", bottom: "24%", right: "20%", border: "3px solid #BCE955", transform: "rotate(-3deg)" }} />
        <div className="container" style={{ position: "relative" }}>
          <Eyebrow dark>Join TCCR</Eyebrow>
          <h2 className="section-title section-title--center" style={{ marginTop: 18 }}>Ready to <span className="accent">be part</span> of the family?</h2>
          <p className="section-sub" style={{ margin: "20px auto 28px", textAlign: "center" }}>One account, both modules. Sign up takes under a minute.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" iconAfter="arrow-right" onClick={onCTA}>Create Account</Button>
            <Button size="lg" variant="secondary-light" onClick={onLogin}>Sign In</Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer footer--minimal">
        <div className="footer-bottom footer-bottom--solo">
          <TLogo variant="reversed" />
          <span>© 2026 The Christian Center Rathmalana. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

/* ─────────────────── Login + Register split panel (TCCR) */
const TLoginScreen = ({ onSignIn, onRegister, onNavigate, defaultMode = "signin" }) => {
  const [mode, setMode] = useTPS(defaultMode);
  const [email, setEmail] = useTPS("priya@example.com");
  const [pw, setPw] = useTPS("••••••••");

  return (
    <div className="auth auth--form-left">
      <div className="auth-right">
        <div className="auth-card">
          <h3>{mode === "signin" ? "Sign in to TCCR" : "Create your TCCR account"}</h3>
          <p className="sub">{mode === "signin" ? "Continue with Google, Apple, or your email." : "It only takes a minute. You'll join as a Member straight away."}</p>

          <div className="fed-row">
            <button className="fed-btn" onClick={onSignIn}><GoogleIcon /> Google</button>
            <button className="fed-btn" onClick={onSignIn}><AppleIcon /> Apple</button>
          </div>
          <div className="fed-divider">OR CONTINUE WITH EMAIL</div>

          <form onSubmit={(e) => { e.preventDefault(); onSignIn(); }}>
            {mode === "register" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="First name" placeholder="Priya" />
                <Input label="Last name" placeholder="Mendis" />
              </div>
            )}
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} hint={mode === "register" ? "Min 8 characters · 1 letter · 1 number" : undefined} />
            {mode === "register" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="Phone" type="tel" placeholder="+94 77 555 0142" />
                <Input label="Date of birth" type="date" />
              </div>
            )}
            {mode === "signin" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 13, fontFamily: "var(--font-body)" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#152A24" }}>
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <a href="#" style={{ color: "#41574A", textDecoration: "none", fontWeight: 600 }}>Forgot password?</a>
              </div>
            )}
            <div style={{ marginTop: 22 }}>
              <Button full size="lg" type="submit">{mode === "signin" ? "Sign In" : "Create Account"}</Button>
            </div>
          </form>
          <div className="alt">
            {mode === "signin" ? (<>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); }}>Register</a></>)
                                : (<>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); }}>Sign in</a></>)}
            <div style={{ marginTop: 14 }}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("home"); }} style={{ color: "#41574A" }}>← Back to home</a></div>
          </div>
        </div>
      </div>
      <div className="auth-left">
        <div style={{ position: "relative" }}>
          <TLogo variant="reversed" />
        </div>
        <div style={{ position: "relative" }}>
          <Eyebrow dark>Join TCCR</Eyebrow>
          <h2 style={{ marginTop: 18 }}>One community,<br/><span className="accent">two</span> ways to grow.</h2>
          <p>Sign in to access Bible School courses and your Cell Groups. Switch language any time from the header.</p>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14, color: "rgba(255,255,255,0.9)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(188,233,85,0.18)", color: "#BCE955", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="book-open" size={16} /></span><span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Structured Bible School courses</span></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(188,233,85,0.18)", color: "#BCE955", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={16} /></span><span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Cell groups & weekly reporting</span></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(188,233,85,0.18)", color: "#BCE955", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="languages" size={16} /></span><span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>සිංහල · தமிழ் · English</span></div>
          </div>
        </div>
        <div className="quote" style={{ position: "relative" }}>
          <p className="text">"Cell-report time dropped from 20 minutes to 3 — and our G12 dashboard finally tells us what's working."</p>
          <div className="who"><Avatar src={KIT.avatar(48)} size="sm" name="Tania F." /> Tania F., G12 Leader</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TPublicHomePage, TLoginScreen });
