"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useBatches, type Batch } from "@/application/hooks/useBatches";
import { useSavedBadge, SavedBadge } from "@/components/ui/SavedBadge";

interface Props {
  courseId: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function batchBadge(state: Batch["state"]) {
  if (state === "open")   return <Badge tone="success">Open</Badge>;
  if (state === "closed") return <Badge tone="archive">Closed</Badge>;
  return <Badge tone="warning">Draft</Badge>;
}

export function BatchesSection({ courseId }: Props) {
  const { batches, loading, fetchError, busy, createBatch, openBatch, closeBatch } = useBatches(courseId);
  const { saved: batchSaved, triggerSaved: triggerBatchSaved } = useSavedBadge();

  const [showForm, setShowForm] = useState(false);
  const [name,        setName]        = useState("");
  const [intakeStart, setIntakeStart] = useState("");
  const [intakeEnd,   setIntakeEnd]   = useState("");
  const [capacity,    setCapacity]    = useState<number | "">("");
  const [formError,   setFormError]   = useState("");

  const resetForm = () => {
    setName(""); setIntakeStart(""); setIntakeEnd("");
    setCapacity(""); setFormError(""); setShowForm(false);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim())    { setFormError("Batch name is required."); return; }
    if (!intakeStart)    { setFormError("Intake start date is required."); return; }
    if (!intakeEnd)      { setFormError("Intake end date is required."); return; }
    if (intakeEnd <= intakeStart) { setFormError("Intake end must be after start."); return; }

    const ok = await createBatch({
      name: name.trim(),
      intakeStart,
      intakeEnd,
      capacity: typeof capacity === "number" ? capacity : null,
    });
    if (ok) { resetForm(); triggerBatchSaved(); }
  };

  return (
    <section className="settings-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Batches &amp; intakes</h2>
          <p className="settings-sub">
            Each batch is a separate intake window. Past batches auto-close so students only see future or open intakes when applying.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SavedBadge visible={batchSaved} />
          <Button
            variant={showForm ? "ghost" : "primary"}
            icon={showForm ? "x" : "plus"}
            onClick={() => showForm ? resetForm() : setShowForm(true)}
          >
            {showForm ? "Close" : "New batch"}
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onCreate} style={{ background: "var(--color-stroke-2)", border: "1px solid var(--color-stroke)", borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Input label="Batch name" placeholder="e.g. 2026 Intake 01" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Intake opens" type="date" value={intakeStart} onChange={(e) => setIntakeStart(e.target.value)} />
            <Input label="Intake closes" type="date" value={intakeEnd} onChange={(e) => setIntakeEnd(e.target.value)} />
            <Input label="Capacity (optional)" type="number" placeholder="50" value={capacity}
              onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          {formError && (
            <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-error)", display: "flex", gap: 6 }}>
              <Icon name="alert-circle" size={14} /> {formError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button type="submit" icon="check" disabled={busy === "creating"}>
              {busy === "creating" ? "Creating…" : "Create batch"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--color-muted)" }}>
          <Icon name="loader" size={20} />
        </div>
      ) : fetchError ? (
        <div style={{ padding: 16, border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, background: "var(--color-error-bg)", fontFamily: "var(--font-body)", fontSize: 13, color: "#DC2626" }}>
          ⚠ Could not load batches — backend error: <b>{fetchError}</b>. Batches you created this session are still saved on the server.
        </div>
      ) : batches.length === 0 ? (
        <div style={{ padding: 24, border: "1px dashed var(--color-stroke)", borderRadius: 12, textAlign: "center", color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
          No batches yet. Create the first intake so members can apply.
        </div>
      ) : (
        <div className="batches">
          {batches
            .slice()
            .sort((a, b) => new Date(a.intakeStart).getTime() - new Date(b.intakeStart).getTime())
            .map((b) => (
              <div key={b.id} className={`batch-row${b.state === "closed" ? " closed" : ""}`}>
                <div className="ico">
                  <Icon name={b.state === "closed" ? "x-circle" : "calendar-clock"} size={18} />
                </div>
                <div className="b-body">
                  <div className="name">{b.name}</div>
                  <div className="window">
                    <span><Icon name="calendar" size={12} /> {formatDate(b.intakeStart)} → {formatDate(b.intakeEnd)}</span>
                    <span className="sep">·</span>
                    <span><Icon name="users" size={12} /> Cap: {b.capacity ?? "—"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {batchBadge(b.state)}
                  {b.state === "draft" && (
                    <Button size="sm" variant="secondary" disabled={busy === b.id} onClick={() => openBatch(b.id)}>
                      Open
                    </Button>
                  )}
                  {b.state === "open" && (
                    <Button size="sm" variant="ghost" disabled={busy === b.id} onClick={() => closeBatch(b.id)}>
                      Close
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
