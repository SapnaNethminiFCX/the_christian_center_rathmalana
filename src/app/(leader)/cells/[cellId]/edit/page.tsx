"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCell } from "@/application/hooks/useCell";
import { useCellMutations, type CellType } from "@/application/hooks/useCells";

const TYPES: CellType[] = ["care", "outreach", "children", "g12"];

export default function EditCellPage() {
  const router = useRouter();
  const params = useParams();
  const cellId = (params?.cellId as string) ?? "";
  const { cell, loading } = useCell(cellId || undefined);
  const { updateCell, archiveCell } = useCellMutations();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState<CellType>("care");
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (cell) { setName(cell.name); setArea(cell.area); setType(cell.type); }
  }, [cell]);

  if (loading) return <div className="page" style={{ textAlign: "center", padding: 48 }}><EmptyState icon="loader" title="Loading…" /></div>;
  if (!cell) return <div className="page"><EmptyState icon="alert-circle" title="Cell not found" /></div>;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = await updateCell(cell.id, { name, area, type });
    setSaving(false);
    if (updated) router.push(`/cells/${cell.id}`);
  };

  return (
    <div className="page">
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push(`/cells/${cell.id}`)}>
        Back to {cell.name}
      </Button>

      <header className="page-header" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 28, color: "var(--color-primary)" }}>
          Edit cell
        </h1>
      </header>

      <form
        onSubmit={onSave}
        style={{ background: "#fff", border: "1px solid var(--color-stroke)", borderRadius: 18, padding: 24, maxWidth: 720 }}
      >
        <Input label="Cell name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Area / location" value={area} onChange={(e) => setArea(e.target.value)} />

        <div style={{ marginTop: 14 }}>
          <label className="label" style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-body-green)", marginBottom: 8 }}>
            Cell type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CellType)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--color-stroke)",
              borderRadius: 10,
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--color-primary)",
              background: "#fff",
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <Button type="button" variant="ghost" onClick={() => router.push(`/cells/${cell.id}`)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" icon="save" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>

      <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="ghost" icon="users" onClick={() => router.push(`/cells/${cell.id}/members`)}>
          Manage members
        </Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" icon="archive" disabled={archiving} onClick={() => setArchiveOpen(true)}
          style={{ color: "var(--color-error)" }}>
          Archive cell
        </Button>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        title={`Archive ${cell.name}?`}
        message="Archived cells are hidden from listings and stop receiving reports. You can restore later from the admin console."
        confirmLabel="Yes, archive"
        destructive
        onConfirm={async () => {
          setArchiving(true);
          const ok = await archiveCell(cell.id);
          setArchiving(false);
          setArchiveOpen(false);
          if (ok) router.push("/cells");
        }}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}
