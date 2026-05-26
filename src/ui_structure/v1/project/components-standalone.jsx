/* EduPath UI kit — atomic primitives. Exported on window so other Babel
   scripts can use them. */

const { useState, useEffect, useRef } = React;

/* ─────────────────── Lucide icon wrapper. The lucide UMD bundle exposes
   icon SVG strings as createElement-able React components when the
   ReactComponents bundle is loaded. To stay light, we render `<i>` with
   a data-lucide attribute and call lucide.createIcons() after mount. */
function Icon({ name, size = 18, strokeWidth = 1.75, style, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      window.lucide.createIcons({ icons: window.lucide.icons, attrs: {}, nameAttr: "data-lucide" });
    }
  });
  return (
    <i ref={ref}
       data-lucide={name}
       className={className}
       style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", strokeWidth, ...(style || {}) }} />
  );
}

/* ─────────────────── Logo — wordmark for light bg, reversed for dark.
   Uses the SVG files in /assets/. */
function Logo({ variant = "default", height = 28 }) {
  const src = variant === "reversed" ? (window.__resources && window.__resources.logoReversed)
            : variant === "mark"     ? (window.__resources && window.__resources.logoMark)
                                     : (window.__resources && window.__resources.logoDefault);
  return <img src={src} alt="EduPath" style={{ height }} />;
}

/* ─────────────────── Button — single component handles variant/size. */
function Button({ children, variant = "primary", size, full, icon, iconAfter, onClick, type = "button", disabled, href, ...rest }) {
  const cls = ["btn", `btn--${variant}`, size && `btn--${size}`, full && "btn--full"].filter(Boolean).join(" ");
  const inner = (
    <React.Fragment>
      {icon && <Icon name={icon} size={size === "lg" ? 18 : 16} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={size === "lg" ? 18 : 16} />}
    </React.Fragment>
  );
  if (href) return <a className={cls} href={href} onClick={onClick} {...rest}>{inner}</a>;
  return <button className={cls} type={type} onClick={onClick} disabled={disabled} {...rest}>{inner}</button>;
}

/* ─────────────────── Eyebrow tag (Why Choose Us / Our Process / etc.) */
function Eyebrow({ children, dark }) {
  return <span className={"eyebrow" + (dark ? " eyebrow--dark" : "")}>{children}</span>;
}

/* ─────────────────── Status badge. */
function Badge({ children, tone = "success" }) {
  return <span className={"badge badge--" + tone}>{children}</span>;
}

/* ─────────────────── Inline link with arrow (Learn More →) */
function ArrowLink({ children, href = "#", onClick, lime }) {
  return (
    <a className={"link" + (lime ? " link--lime" : "")} href={href} onClick={onClick}>
      {children} <Icon name="arrow-right" size={14} />
    </a>
  );
}

/* ─────────────────── Avatar. Falls back to initials if no img. */
function Avatar({ src, name = "?", size = "md", style }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={"avatar avatar--" + size} style={style}>
      {src ? <img src={src} alt={name} /> : initials}
    </span>
  );
}

/* ─────────────────── Form input. */
function Input({ label, hint, error, ...rest }) {
  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      <input className={"input" + (error ? " input--error" : "")} {...rest} />
      {error ? <span className="hint" style={{ color: "#DC2626" }}>{error}</span>
             : hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/* ─────────────────── Star rating. */
function Stars({ count = 5 }) {
  return <span className="stars">{"★ ".repeat(count).trim()}</span>;
}

/* ─────────────────── Public floating-pill nav.
   Tabs scroll to in-page sections per design feedback:
     Home    → top
     About   → "Why Choose Us" section (#why)
     Courses → "Featured Courses" section (#courses)
     Contact → "FAQ" section (#faq) */
function FloatingNav({ active, onNavigate, onSignUp }) {
  const links = [
    { id: "home",    label: "Home",    target: "top" },
    { id: "about",   label: "About",   target: "why" },
    { id: "courses", label: "Courses", target: "courses" },
    { id: "contact", label: "Contact", target: "faq" }
  ];
  const scrollTo = (target) => {
    if (target === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.getElementById(target);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
  return (
    <nav className="floating-nav">
      <a href="#" onClick={(e) => { e.preventDefault(); scrollTo("top"); onNavigate("home"); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Logo height={26} />
      </a>
      <div className="nav-links">
        {links.map(l => (
          <a key={l.id} href="#"
             className={active === l.id ? "active" : ""}
             onClick={(e) => { e.preventDefault(); scrollTo(l.target); onNavigate(l.id); }}>
            {l.label}
          </a>
        ))}
      </div>
      <Button size="sm" onClick={onSignUp}>Sign Up</Button>
    </nav>
  );
}

/* ─────────────────── User menu (header avatar). Click avatar → see name +
   logout. Used in authenticated topbars. */
function UserMenu({ user, role, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
        <Avatar src={user.avatar} size="sm" name={user.name} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220, background: "#fff", borderRadius: 12, boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18), 0 4px 8px -4px rgba(21,42,36,0.08)", border: "1px solid rgba(21,42,36,0.08)", padding: 6, zIndex: 100 }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(21,42,36,0.08)", marginBottom: 4 }}>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#152A24" }}>{user.name}</div>
            {role && <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A", marginTop: 2 }}>{role}</div>}
          </div>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#F5F5F5"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
            <Icon name="log-out" size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Notifications dropdown. The list is supplied by the
   caller — student sees enrolment-approval results, admins see incoming
   approval requests. */
function NotificationsMenu({ items, onItemClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const unread = items.filter(i => !i.read).length;
  const toneColor = { success: "#3DB55F", warning: "#D97706", info: "#152A24" };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="icon-btn" onClick={() => setOpen(!open)}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="dot"></span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, background: "#fff", borderRadius: 12, boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18), 0 4px 8px -4px rgba(21,42,36,0.08)", border: "1px solid rgba(21,42,36,0.08)", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(21,42,36,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "#152A24" }}>Notifications</div>
            {unread > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "#BCE955", color: "#152A24", padding: "2px 8px", borderRadius: 9999, fontWeight: 600 }}>{unread} new</span>}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#41574A", fontFamily: "var(--font-body)", fontSize: 13 }}>You're all caught up.</div>
            ) : items.map((n, i) => (
              <div key={i} onClick={() => { onItemClick && onItemClick(n); setOpen(false); }}
                   style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: i < items.length - 1 ? "1px solid rgba(21,42,36,0.06)" : "none", cursor: onItemClick ? "pointer" : "default", background: n.read ? "transparent" : "rgba(188,233,85,0.06)" }}
                   onMouseOver={(e) => e.currentTarget.style.background = "#F5F5F5"}
                   onMouseOut={(e) => e.currentTarget.style.background = n.read ? "transparent" : "rgba(188,233,85,0.06)"}>
                <div style={{ width: 32, height: 32, borderRadius: 9999, background: "#EEF1EF", color: toneColor[n.tone] || "#152A24", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={n.ico} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "#152A24", lineHeight: 1.4 }}>{n.title}</div>
                  {n.body && <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#41574A", marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#A0ACA6", marginTop: 4 }}>{n.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Toast (used as transient banner). */
function Toast({ tone = "success", title, message, onDismiss }) {
  const accent = { success: "#3DB55F", error: "#DC2626", warning: "#D97706" }[tone];
  const ico    = { success: "check-circle", error: "x-circle", warning: "alert-triangle" }[tone];
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 200,
      display: "flex", gap: 12, padding: "14px 16px", minWidth: 320, maxWidth: 380,
      background: "#fff", borderRadius: 14,
      boxShadow: "0 10px 15px -3px rgba(21,42,36,0.12), 0 4px 6px -4px rgba(21,42,36,0.08)",
      borderLeft: `4px solid ${accent}`, alignItems: "flex-start"
    }}>
      <Icon name={ico} size={20} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#152A24" }}>{title}</div>
        {message && <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A", marginTop: 2 }}>{message}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ACA6", padding: 0 }}>
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────── Reusable kit data (avatars/people/courses) */
const KIT = {
  // Pravatar gives stable random avatars by id.
  avatar: (n) => (window.__resources && window.__resources["avatar" + n]) || `https://i.pravatar.cc/120?img=${n}`,
  // Solid-color cover backgrounds for course cards keep us off the photo CDN.
  cover: (kind) => {
    const map = {
      math: "linear-gradient(135deg, #2a4d3e 0%, #41574A 100%)",
      sci:  "linear-gradient(135deg, #1F3626 0%, #2a5d3a 100%)",
      lit:  "linear-gradient(135deg, #345244 0%, #5a7066 100%)",
      soc:  "linear-gradient(135deg, #213c30 0%, #4a6356 100%)",
      gen:  "linear-gradient(135deg, #2a4d3e 0%, #1F3626 100%)"
    };
    return map[kind] || map.gen;
  }
};

/* ─────────────────── Course cover. Renders a gradient + emblematic SVG
   so we don't have to depend on external photos. */
function CourseCover({ kind = "gen", tag, emblem }) {
  return (
    <div className="cover" style={{ background: KIT.cover(kind) }}>
      {/* Subtle emblem watermark — not iconography in the brand sense, just a
          decorative "this is what subject this is" cue. */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(188,233,85,0.18)" }}>
        <Icon name={emblem} size={120} strokeWidth={1.25} />
      </div>
      {tag && <span className="tag">{tag}</span>}
    </div>
  );
}

/* Export to window for the screen scripts. */
Object.assign(window, {
  Icon, Logo, Button, Eyebrow, Badge, ArrowLink, Avatar, Input, Stars,
  FloatingNav, Toast, CourseCover, KIT, UserMenu, NotificationsMenu
});
