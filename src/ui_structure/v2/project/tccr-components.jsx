/* TCCR v2 — additional shared components.
   Adds on top of components.jsx — assumes Icon, Button, Avatar, Eyebrow,
   Badge, Input, KIT exist on window. */

const { useState: useTS, useEffect: useTE, useRef: useTR } = React;

/* TCCR brand wordmark — text replaces EduPath SVG */
function TLogo({ variant = "default" }) {
  return (
    <span className={"tccr-wordmark" + (variant === "reversed" ? " tccr-wordmark--reversed" : "")}>
      <span className="mark">T</span>
      <span className="name">TCCR</span>
    </span>
  );
}

/* Language switcher pill (cosmetic — does not actually translate) */
/* Language dropdown — header version, replaces the pill in topbars. */
function LanguageSwitcher({ dark, current = "EN", onChange }) {
  const [cur, setCur] = useTS(current);
  const [open, setOpen] = useTS(false);
  const ref = useTR(null);
  useTE(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const langs = [
    { id: "EN", label: "English",  native: "EN" },
    { id: "SI", label: "සිංහල",   native: "සි" },
    { id: "TA", label: "தமிழ்",  native: "த" }
  ];
  const active = langs.find(l => l.id === cur) || langs[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 12px", background: dark ? "rgba(255,255,255,0.08)" : "#FAFAFA", border: "1px solid " + (dark ? "rgba(255,255,255,0.12)" : "#E5E5E5"), borderRadius: 9999, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: dark ? "#fff" : "#152A24" }}>
        <Icon name="globe" size={14} /> {active.label}
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 160, background: "#fff", border: "1px solid rgba(21,42,36,0.08)", borderRadius: 12, boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18)", padding: 4, zIndex: 200 }}>
          {langs.map(l => (
            <button key={l.id} onClick={() => { setCur(l.id); setOpen(false); onChange && onChange(l.id); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: cur === l.id ? "rgba(188,233,85,0.18)" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#152A24" }}>
              {l.label}
              {cur === l.id && <Icon name="check" size={14} style={{ color: "#15803D" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* TCCR top nav for public/member pages */
function TopNav({ active = "home", onNav, lang, onLang, ctaLabel = "Sign Up", onCta }) {
  const links = [
    { id: "home",   label: "Home" },
    { id: "school", label: "Bible School" },
    { id: "cells",  label: "Cell Groups" },
    { id: "contact",label: "Contact" }
  ];
  return (
    <nav className="tnav">
      <a href="#" onClick={(e) => { e.preventDefault(); onNav && onNav("home"); }}>
        <TLogo />
      </a>
      <div className="links">
        {links.map(l => (
          <a key={l.id} href="#" className={active === l.id ? "active" : ""}
             onClick={(e) => { e.preventDefault(); onNav && onNav(l.id); }}>
            {l.label}
          </a>
        ))}
      </div>
      <div className="actions">
        <LanguageSwitcher current={lang} onChange={onLang} />
        <Button size="sm" onClick={onCta}>{ctaLabel}</Button>
      </div>
    </nav>
  );
}

/* Federated buttons: Google + Apple */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.85 0-5.26-1.92-6.13-4.51H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.87 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.96l3.69-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.69 2.84C6.74 7.3 9.15 5.38 12 5.38z"/>
  </svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#000" d="M17.6 12.55c-.03-2.81 2.3-4.16 2.4-4.22-1.31-1.91-3.34-2.18-4.06-2.2-1.73-.18-3.37 1.02-4.24 1.02-.87 0-2.22-1-3.65-.97-1.88.03-3.61 1.09-4.58 2.77-1.95 3.38-.5 8.4 1.4 11.15.93 1.36 2.05 2.88 3.52 2.83 1.42-.06 1.95-.91 3.66-.91 1.7 0 2.18.91 3.66.88 1.51-.03 2.47-1.38 3.4-2.74 1.07-1.57 1.51-3.1 1.54-3.18-.03-.02-2.95-1.13-2.98-4.48zM14.85 4.66c.77-.94 1.29-2.24 1.15-3.54-1.11.05-2.46.74-3.26 1.67-.72.83-1.35 2.16-1.18 3.43 1.24.09 2.51-.62 3.29-1.56z"/>
  </svg>
);

/* TCCR role badges (multi-role stack) */
function RoleBadgeStack({ roles = ["member"] }) {
  const ORDER = ["super_admin","admin","g12","leader","student","member"];
  const display = [...new Set(roles)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return (
    <span className="role-stack">
      {display.map(r => <span key={r} className={"role-chip " + r}>{r === "g12" ? "G12" : r.replace("_", " ")}</span>)}
    </span>
  );
}

/* Inline mini-bar chart (SVG, no deps) */
function BarChart({ data, color = "#152A24", accent = "#BCE955", height = 160 }) {
  const max = Math.max(...data.map(d => d.value)) * 1.15 || 1;
  const W = 100; const H = height;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {data.map((d, i) => {
        const bw = (W / data.length) * 0.62;
        const bx = (W / data.length) * i + (W / data.length - bw) / 2;
        const bh = (d.value / max) * (H - 24);
        const by = H - bh - 18;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw} height={bh} rx="1" fill={d.highlight ? accent : color} opacity={d.highlight ? 1 : 0.85} />
            <text x={bx + bw / 2} y={H - 4} textAnchor="middle" fontSize="3.6" fontFamily="var(--font-body)" fill="#41574A">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* Line + area chart */
function LineChart({ data, color = "#BCE955", height = 180 }) {
  const max = Math.max(...data.map(d => d.value)) * 1.20 || 1;
  const W = 100; const H = height;
  const pts = data.map((d, i) => {
    const x = (W / (data.length - 1)) * i;
    const y = H - 22 - (d.value / max) * (H - 32);
    return { x, y, ...d };
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
  const areaPath = `${linePath} L${W},${H - 22} L0,${H - 22} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id="lcGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.36" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lcGrad)" />
      <path d={linePath} stroke={color} strokeWidth="0.8" fill="none" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.9" fill="#152A24" stroke={color} strokeWidth="0.4" />)}
      {pts.map((p, i) => i % Math.ceil(pts.length / 6) === 0 && (
        <text key={"l" + i} x={p.x} y={H - 4} textAnchor="middle" fontSize="3.4" fill="#41574A" fontFamily="var(--font-body)">{p.label}</text>
      ))}
    </svg>
  );
}

/* Donut chart */
function DonutChart({ data, size = 160 }) {
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const C = 32;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${C} ${C}`} style={{ width: size, height: size }}>
      {data.map((d, i) => {
        const len = (d.value / total) * circumference;
        const seg = <circle key={i} cx={C / 2} cy={C / 2} r={r} fill="transparent" stroke={d.color}
                            strokeWidth="6" strokeDasharray={`${len} ${circumference}`}
                            strokeDashoffset={-offset} transform={`rotate(-90 ${C / 2} ${C / 2})`} />;
        offset += len;
        return seg;
      })}
      <text x={C / 2} y={C / 2 - 0.5} textAnchor="middle" dominantBaseline="central"
            fontFamily="var(--font-heading)" fontWeight="700" fontSize="4.5" fill="#152A24">
        {total}
      </text>
      <text x={C / 2} y={C / 2 + 4} textAnchor="middle" dominantBaseline="central"
            fontFamily="var(--font-body)" fontSize="2.4" fill="#41574A">
        reports
      </text>
    </svg>
  );
}

/* Typeahead input — suggests from `directory` while typing; emits selected name.
   When user types a name not in the directory, exposes an "Add as unregistered" CTA. */
function Typeahead({ label, placeholder, directory = [], value = "", onChange, onPick, onAddUnregistered, hint }) {
  const [q, setQ] = useTS(value);
  const [open, setOpen] = useTS(false);
  const ref = useTR(null);
  useTE(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const matches = q.trim() ? directory.filter(d => d.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const exact = directory.some(d => d.name.toLowerCase() === q.toLowerCase());
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="field">
        {label && <label className="label">{label}</label>}
        <input className="input" placeholder={placeholder}
               value={q}
               onChange={(e) => { setQ(e.target.value); onChange && onChange(e.target.value); setOpen(true); }}
               onFocus={() => setOpen(true)} />
        {hint && <span className="hint">{hint}</span>}
      </div>
      {open && q.trim() && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid rgba(21,42,36,0.10)", borderRadius: 12, boxShadow: "0 10px 28px -8px rgba(21,42,36,0.18)", maxHeight: 240, overflowY: "auto", zIndex: 100 }}>
          {matches.length === 0 ? (
            <div style={{ padding: "10px 14px", fontFamily: "var(--font-body)", fontSize: 13, color: "#41574A" }}>No match in TCCR — they're not registered yet.</div>
          ) : matches.map((m, i) => (
            <button key={i} onClick={() => { setQ(m.name); setOpen(false); onPick && onPick(m); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid rgba(21,42,36,0.04)", cursor: "pointer", textAlign: "left" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#F5F5F5"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              <Avatar src={KIT.avatar(m.avatar || 10)} size="sm" name={m.name} />
              <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, color: "#152A24", fontWeight: 600 }}>{m.name}</div>
              <RoleBadgeStack roles={m.roles || ["member"]} />
            </button>
          ))}
          {q.trim() && !exact && onAddUnregistered && (
            <button onClick={() => { setOpen(false); onAddUnregistered(q.trim()); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(188,233,85,0.16)", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", fontSize: 13, color: "#152A24", fontWeight: 600 }}>
              <Icon name="user-plus" size={14} /> Add "{q.trim()}" as unregistered member
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* Shared TCCR directory used by typeaheads across the app. */
const TCCR_DIRECTORY = [
  { name: "Anjali Silva",        avatar: 47, roles: ["member","student"] },
  { name: "Ravi Tilakaratne",    avatar: 12, roles: ["member","student","leader"] },
  { name: "Priya Mendis",        avatar: 32, roles: ["member","student"] },
  { name: "Tania Fernando",      avatar: 48, roles: ["member","student","leader","g12"] },
  { name: "Nadeesha Fernando",   avatar: 38, roles: ["member"] },
  { name: "Saman Perera",        avatar: 22, roles: ["member","leader"] },
  { name: "Kasun Bandara",       avatar: 5,  roles: ["member"] },
  { name: "Dinithi Jayawardene", avatar: 14, roles: ["member","student","leader"] },
  { name: "Janaka Liyanage",     avatar: 7,  roles: ["member","admin"] },
  { name: "Imani Rajapaksa",     avatar: 38, roles: ["member","student"] },
  { name: "Sahan Wijeratne",     avatar: 22, roles: ["member","leader"] },
  { name: "Dilshan Perera",      avatar: 28, roles: ["member"] },
  { name: "Asha Wickrama",       avatar: 19, roles: ["member","student"] },
  { name: "Tharindu Silva",      avatar: 42, roles: ["member"] }
];

Object.assign(window, {
  TLogo, LanguageSwitcher, TopNav, GoogleIcon, AppleIcon,
  RoleBadgeStack, BarChart, LineChart, DonutChart, Typeahead, TCCR_DIRECTORY
});
