"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useCellMutations, type CellType } from "@/application/hooks/useCells";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface G12Candidate {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePhotoUrl?: string | null;
}

const TYPES: { id: CellType; label: string }[] = [
  { id: "care",     label: "Care" },
  { id: "outreach", label: "Outreach" },
  { id: "children", label: "Children" },
  { id: "g12",      label: "G12" },
];

export default function NewCellPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);
  const { createCell } = useCellMutations();

  const [name,       setName]       = useState("");
  const [type,       setType]       = useState<CellType>("care");
  const [area,       setArea]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError,  setNameError]  = useState("");
  const [g12Error,   setG12Error]   = useState("");

  // ── G12 leader picker (only shown when the creator isn't a G12) ──────
  const isG12 = user?.roles?.includes("g12") ?? false;
  const [g12Query, setG12Query] = useState("");
  const [g12Results, setG12Results] = useState<G12Candidate[]>([]);
  const [g12Searching, setG12Searching] = useState(false);
  const [selectedG12, setSelectedG12] = useState<G12Candidate | null>(null);

  // Real-time typeahead: GET /users?role=g12&name=<prefix> per spec §4.1.
  // `name` is a case-sensitive prefix match on firstName, so we fan out the
  // term to original-case AND Title-Case to catch both "member1" and "Member1".
  useEffect(() => {
    if (isG12) return; // G12 creators use their own UID; no picker needed.
    const term = g12Query.trim();
    if (term.length < 2 || selectedG12) { setG12Results([]); return; }
    let cancelled = false;
    setG12Searching(true);
    const timer = setTimeout(async () => {
      try {
        const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
        const variants = Array.from(new Set([term, titleCase]));
        const responses = await Promise.all(
          variants.map((v) =>
            apiRequest<unknown>(`/users?${new URLSearchParams({ role: "g12", name: v, limit: "20" })}`)
              .catch(() => null),
          ),
        );
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: G12Candidate[] = [];
        for (const res of responses) {
          let bucket: unknown[] = [];
          if (Array.isArray(res)) bucket = res;
          else if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (Array.isArray(obj.items)) bucket = obj.items;
            else if (Array.isArray(obj.data)) bucket = obj.data;
            else if (Array.isArray(obj.results)) bucket = obj.results;
          }
          for (const it of bucket) {
            const u = it as Record<string, unknown>;
            const uid = String(u.uid ?? u.id ?? "");
            if (!uid || seen.has(uid)) continue;
            const roles = Array.isArray(u.roles) ? (u.roles as string[]) : [];
            // Double-check the backend filter — only keep users that actually hold g12.
            if (!roles.includes("g12")) continue;
            seen.add(uid);
            merged.push({
              uid,
              firstName: typeof u.firstName === "string" ? u.firstName : undefined,
              lastName:  typeof u.lastName  === "string" ? u.lastName  : undefined,
              email:     typeof u.email     === "string" ? u.email     : undefined,
              profilePhotoUrl: typeof u.profilePhotoUrl === "string" ? u.profilePhotoUrl : null,
            });
          }
        }
        setG12Results(merged);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return;
        setG12Results([]);
      } finally {
        if (!cancelled) setG12Searching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [g12Query, isG12, selectedG12]);

  const g12FullName = (u: G12Candidate) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.uid;

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setG12Error("");
    let valid = true;
    if (!name.trim()) { setNameError("Cell name is required."); valid = false; }

    // G12 creators self-attribute; Leaders must explicitly pick a G12 supervisor.
    const g12Uid = isG12 ? user?.uid : selectedG12?.uid;
    if (!g12Uid) {
      setG12Error(isG12
        ? "Could not read your G12 UID — please sign in again."
        : "Pick a G12 leader to supervise this cell.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    const cell = await createCell({
      name: name.trim(),
      type,
      area: area.trim(),
      g12LeaderUid: g12Uid ?? "",
    });
    if (cell) {
      router.push(`/cells/${cell.id}/members`);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>Create a new cell</h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            Fill in the details — you can add members in the next step.
          </p>
        </div>
        <Button variant="ghost" icon="arrow-left" onClick={() => router.push("/cells")}>Back</Button>
      </header>

      <form onSubmit={onCreate}>
        <div className="settings-card">
          <h2>Cell details</h2>

          <Input label="Cell name" placeholder="e.g. Rathmalana Care Cell · West"
            value={name} error={nameError} autoFocus
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }} />

          <div className="field" style={{ marginTop: 12 }}>
            <label className="label">Cell type</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setType(t.id)}
                  style={{ padding: "8px 18px", borderRadius: 9999, border: `2px solid ${type === t.id ? "var(--color-accent)" : "var(--color-stroke)"}`, background: type === t.id ? "rgba(188,233,85,0.15)" : "#fff", color: "var(--color-primary)", fontFamily: "var(--font-body)", fontWeight: type === t.id ? 700 : 500, fontSize: 14, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Location / area" placeholder="e.g. Rathmalana East"
            value={area} onChange={(e) => setArea(e.target.value)} style={{ marginTop: 4 }} />

          {/* G12 leader picker — only when the creator isn't already a G12. */}
          {!isG12 && (
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">G12 leader (supervisor)</label>
              {selectedG12 ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  border: "1px solid var(--color-stroke)",
                  borderRadius: 10,
                  background: "rgba(188,233,85,0.10)",
                  marginTop: 6,
                }}>
                  <Avatar src={selectedG12.profilePhotoUrl ?? undefined} name={g12FullName(selectedG12)} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
                      {g12FullName(selectedG12)}
                    </div>
                    {selectedG12.email && (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                        {selectedG12.email}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" icon="x" onClick={() => { setSelectedG12(null); setG12Query(""); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative", marginTop: 6 }}>
                    <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
                    <input
                      className="input"
                      placeholder="Search G12 leaders by first name…"
                      value={g12Query}
                      onChange={(e) => { setG12Query(e.target.value); if (g12Error) setG12Error(""); }}
                      style={{ paddingLeft: 36, width: "100%" }}
                    />
                  </div>
                  {g12Query.trim().length >= 2 && (
                    <div style={{ marginTop: 8, border: "1px solid var(--color-stroke)", borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
                      {g12Searching && (
                        <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                          Searching…
                        </div>
                      )}
                      {!g12Searching && g12Results.length === 0 && (
                        <div style={{ padding: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                          No G12 leaders match.
                        </div>
                      )}
                      {g12Results.map((u) => (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => { setSelectedG12(u); setG12Query(g12FullName(u)); }}
                          style={{
                            width: "100%",
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: 12,
                            alignItems: "center",
                            padding: "10px 12px",
                            background: "transparent",
                            border: 0,
                            borderBottom: "1px solid var(--color-stroke-2)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <Avatar src={u.profilePhotoUrl ?? undefined} name={g12FullName(u)} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
                              {g12FullName(u)}
                            </div>
                            {u.email && (
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-body-green)" }}>
                                {u.email}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {g12Error && (
                <span className="hint" style={{ color: "#DC2626", fontSize: 12, marginTop: 6, display: "inline-block" }}>
                  {g12Error}
                </span>
              )}
              <p className="hint" style={{ marginTop: 8, fontSize: 12, color: "var(--color-body-green)" }}>
                Every cell reports to a G12 leader. Type at least 2 characters to search.
              </p>
            </div>
          )}

          <div className="field" style={{ marginTop: 4 }}>
            <label className="label">Created date</label>
            <input type="text" value={today} disabled className="input"
              style={{ background: "var(--color-stroke-2)", color: "var(--color-muted)", cursor: "not-allowed" }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
            <Icon name="info" size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            After creating, you&apos;ll be taken to add members.
          </span>
          <Button type="submit" size="lg" iconAfter="arrow-right"
            disabled={submitting || !name.trim() || (!isG12 && !selectedG12)}>
            {submitting ? "Creating…" : "Create cell"}
          </Button>
        </div>
      </form>
    </div>
  );
}
