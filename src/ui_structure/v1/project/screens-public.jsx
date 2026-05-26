/* EduPath UI kit — Public surface: landing, course catalog, login. */

const PublicHomePage = ({ onCTA, onCourse, onLogin, onNavigate }) => {
  const features = [
    { ico: "layers", title: "Structured Course Plans", body: "Multi-module roadmaps with clear topic ordering — no guesswork on what to learn next." },
    { ico: "trending-up", title: "Track Your Progress", body: "Module-level completion shown across every course so you always know where you stand." },
    { ico: "shield-check", title: "Verified Materials", body: "Lessons, code labs and project briefs curated by working software and data engineers." },
    { ico: "terminal", title: "Hands-on Labs", body: "Browser-based notebooks and sandboxes — write real code and run real queries from lesson one." },
    { ico: "video", title: "Lecture Recordings", body: "Watch on demand — every lesson stays available throughout your subscription." },
    { ico: "smartphone", title: "Learn on Any Device", body: "The platform works across desktop, tablet and phone with no install required." }
  ];

  const steps = [
    { n: "01", title: "Create Your Account", body: "Sign up in under a minute — no credit card needed for the free tier.", active: true },
    { n: "02", title: "Pick Your Course Plan", body: "Browse module-by-module tracks built around your engineering goals." },
    { n: "03", title: "Start Learning", body: "Watch lessons, complete labs and track progress across every module." }
  ];

  const courses = [
    { kind: "math", emblem: "code-2", tag: "Engineering", time: "8h 40m", lessons: "16 lessons", title: "Modern Backend Engineering", desc: "Design APIs, model relational data and ship production services with TypeScript and Postgres." },
    { kind: "sci",  emblem: "brain-circuit", tag: "Machine Learning", time: "10h 20m", lessons: "20 lessons", title: "Applied Machine Learning", desc: "From regression to fine-tuning — hands-on with Python, scikit-learn and PyTorch." },
    { kind: "lit",  emblem: "database", tag: "Data Analytics", time: "6h 50m", lessons: "14 lessons", title: "SQL for Analytics", desc: "Window functions, joins, query plans — patterns you'll use every day on the job." },
    { kind: "soc",  emblem: "bar-chart-3", tag: "Data Viz", time: "5h 10m", lessons: "12 lessons", title: "Dashboards & Storytelling", desc: "Turn raw data into clear, opinionated dashboards stakeholders actually use." }
  ];

  const tests = [
    { name: "Anjali S.", role: "Backend engineer · Colombo", quote: "The structured module format kept me on track — I shipped my first production API in four months.", avatar: 47 },
    { name: "Ravi T.",  role: "Career switcher → analyst",   quote: "I came in from finance. The SQL track gave me real query patterns I use at work every day.", avatar: 12 },
    { name: "Priya M.", role: "ML engineer · fintech",       quote: "Labs fit between standups. Progress tracking is the reason I finished the ML programme.", avatar: 32 }
  ];

  const faqs = [
    { q: "Do I need a CS degree to start?", a: "No. Foundation courses assume only basic familiarity with a programming language. Our SQL and analytics tracks have no prerequisites at all." },
    { q: "How long does each course take?", a: "Most modules are designed for 5–12 hours of focused study, plus labs. A full programme typically takes 3–6 months at part-time pace." },
    { q: "Can I switch courses later?", a: "Yes. You can request any published course at any time. Your progress is saved per-module — switching tracks never resets your work." },
    { q: "What about the labs — do I need to install anything?", a: "No. Every lab runs in your browser. Notebooks, terminals and databases are spun up on demand and persist between sessions." }
  ];

  return (
    <div className="public">
      <FloatingNav active="home" onNavigate={onNavigate} onSignUp={onLogin} />

      {/* HERO */}
      <section className="section section--dark hero">
        <div className="container hero-grid">
          <div>
            <Eyebrow dark>★ Trusted by 3,200+ engineers</Eyebrow>
            <h1>Engineering &amp; data skills,<br/>on <span className="accent">your schedule</span>.</h1>
            <p>Multi-module course programmes in software, ML and analytics — real instructor lectures, browser-based labs, and progress tracking that keep you focused from your first commit to your final project.</p>
            <div className="hero-cta">
              <Button size="lg" iconAfter="arrow-right" onClick={onCTA}>Start Learning</Button>
              <Button size="lg" variant="secondary-light" icon="log-in" onClick={onLogin}>Sign In</Button>
            </div>
            <div className="hero-proof">
              <div className="stack">
                {[5, 14, 32, 47].map(n => <Avatar key={n} src={KIT.avatar(n)} size="sm" name="" />)}
              </div>
              <span><b style={{ color: "#fff" }}>3,200+ learners</b> already on the platform</span>
            </div>
          </div>
          <div className="hero-img">
            <img src={(window.__resources && window.__resources.heroImg) || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"} alt="" />
            <div className="hero-badge">
              <div>
                <div className="num">4.9</div>
                <div className="stars">★ ★ ★ ★ ★</div>
              </div>
              <div className="lab">From <b>1,820</b><br/>verified reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS strip */}
      <section className="section section--white" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="container">
          <div className="stats">
            <div className="stat"><div className="num">3,200<span className="accent">+</span></div><div className="lab">Active Learners</div><div className="sub">Studying every week</div></div>
            <div className="stat"><div className="num">94<span className="accent">%</span></div><div className="lab">Completion Rate</div><div className="sub">Across published programmes</div></div>
            <div className="stat"><div className="num">120<span className="accent">+</span></div><div className="lab">Lessons</div><div className="sub">Across every track</div></div>
            <div className="stat"><div className="num">320<span className="accent">+</span></div><div className="lab">Hands-on Labs</div><div className="sub">Browser-based, auto-graded</div></div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section section--light" id="why">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>Why Choose Us</Eyebrow>
            <h2 className="section-title section-title--center">Everything you need to <span className="accent">level up</span><br/>and ship — in one place.</h2>
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

      {/* HOW IT WORKS */}
      <section className="section section--deep">
        <div className="container">
          <Eyebrow dark>Our Process</Eyebrow>
          <h2 className="section-title">How <span className="accent">EduPath</span> works.</h2>
          <p className="section-sub">Three simple steps — sign up, choose your plan, start learning at your own pace.</p>
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
              <img src={(window.__resources && window.__resources.processImg) || "https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=800&q=80"} alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="section section--white" id="courses">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <Eyebrow>Featured Courses</Eyebrow>
              <h2 className="section-title">Pick a subject and <span className="accent">start studying</span>.</h2>
            </div>
            <Button variant="secondary" iconAfter="arrow-right" onClick={() => onNavigate("courses")}>View All Courses</Button>
          </div>
          <div className="course-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {courses.map(c => (
              <article key={c.title} className="course-card" onClick={() => onCourse(c)}>
                <CourseCover kind={c.kind} emblem={c.emblem} tag={c.tag} />
                <div className="body">
                  <div className="meta"><span><Icon name="clock" size={12} />{c.time}</span><span><Icon name="layers" size={12} />{c.lessons}</span></div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <ArrowLink>Learn More</ArrowLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section section--light">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>Student Stories</Eyebrow>
            <h2 className="section-title section-title--center">Real <span className="accent">learners</span>, real progress.</h2>
          </div>
          <div className="test-grid">
            {tests.map(t => (
              <div key={t.name} className="test-card">
                <div className="who">
                  <Avatar src={KIT.avatar(t.avatar)} size="md" name={t.name} />
                  <div>
                    <div className="name">{t.name}</div>
                    <div className="role">{t.role}</div>
                  </div>
                </div>
                <p className="quote">"{t.quote}"</p>
                <Stars />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section--white" id="faq">
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
          <Eyebrow dark>Get Started Today</Eyebrow>
          <h2 className="section-title section-title--center" style={{ marginTop: 18 }}>Ready to start your <span className="accent">learning journey</span>?</h2>
          <p className="section-sub" style={{ margin: "20px auto 28px", textAlign: "center" }}>Join thousands of learners who took control of their education with structured plans and real progress tracking.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" iconAfter="arrow-right" onClick={onCTA}>Start Learning</Button>
            <Button size="lg" variant="secondary-light" onClick={onLogin}>Sign In</Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer footer--minimal">
        <div className="footer-bottom footer-bottom--solo">
          <Logo variant="reversed" height={26} />
          <span>© 2026 EduPath. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

/* ─────────────────── Login + Register split panel. */
const LoginScreen = ({ onSignIn, onRegister, onNavigate, defaultMode = "signin" }) => {
  const [mode, setMode] = useState(defaultMode); // signin | register
  const [email, setEmail] = useState("priya@example.com");
  const [pw, setPw] = useState("••••••••");

  return (
    <div className="auth auth--form-left">
      <div className="auth-right">
        <div className="auth-card">
          <h3>{mode === "signin" ? "Sign in to your account" : "Create your account"}</h3>
          <p className="sub">{mode === "signin" ? "Enter your email and password to continue." : "It only takes a minute. No credit card required."}</p>
          <form onSubmit={(e) => { e.preventDefault(); onSignIn(); }}>
            {mode === "register" && <Input label="Full name" placeholder="Priya Mendis" defaultValue="" />}
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
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
          <Logo variant="reversed" height={32} />
        </div>
        <div style={{ position: "relative" }}>
          <Eyebrow dark>Welcome to EduPath</Eyebrow>
          <h2 style={{ marginTop: 18 }}>Pick up where you <span className="accent">left off</span>.</h2>
          <p>Sign in to continue your course plan, see your progress and pick the next subject.</p>
        </div>
        <div className="quote" style={{ position: "relative" }}>
          <p className="text">"Coming back to studying after years felt impossible — until EduPath structured it for me."</p>
          <div className="who"><Avatar src={KIT.avatar(32)} size="sm" name="Priya M." /> Priya M., learner</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { PublicHomePage, LoginScreen });
